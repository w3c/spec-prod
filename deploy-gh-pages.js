// @ts-check
const path = require("path");
const os = require("os");
const fs = require("fs").promises;
const { env, exit, sh } = require("./utils.js");

// @ts-expect-error
if (module === require.main) {
	/** @type {import("./prepare.js").GithubPagesDeployOptions} */
	const inputs = JSON.parse(env("INPUTS_DEPLOY"));
	const outputFile = env("OUTPUT_FILE");

	if (inputs === false) {
		exit("Skipped.", 0);
	}
	main(inputs, outputFile).catch(err =>
		exit(err.message || "Failed", err.code),
	);
}

module.exports = main;
/**
 * @typedef {Exclude<import("./prepare.js").GithubPagesDeployOptions, false>} GithubPagesDeployOptions
 * @param {GithubPagesDeployOptions} inputs
 * @param {string} outputFile
 */
async function main(inputs, outputFile) {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "spec-prod-output-"));
	const tmpOutputFile = path.join(tmpDir, outputFile);
	let error = null;
	try {
		await prepare(outputFile, tmpOutputFile, inputs);
		const committed = await commit(inputs);
		if (!committed) {
			await cleanUp(outputFile, tmpOutputFile);
			exit(`Nothing to commit. Skipping deploy.`, 0);
		}
		await push(inputs);
	} catch (err) {
		console.log(err);
		error = err;
	} finally {
		await cleanUp(outputFile, tmpOutputFile);
		if (error) {
			console.log();
			console.log("=".repeat(60));
			exit(error.message);
		}
	}
}

/**
 * @param {string} outputFile
 * @param {string} tmpOutputFile
 * @param {Pick<GithubPagesDeployOptions, "targetBranch" | "repository">} opts
 */
async function prepare(outputFile, tmpOutputFile, opts) {
	const { targetBranch, repository } = opts;
	// Temporarily move built file as we'll be doing a checkout soon.
	await fs.rename(outputFile, tmpOutputFile);

	// Clean up working tree
	await sh(`git checkout -- .`);

	// Check if target branch remote exists on remote.
	// If it exists, we do a pull, otherwise we create a new orphan branch.
	const repoUri = `https://github.com/${repository}.git/`;
	if (await sh(`git ls-remote --heads "${repoUri}" "${targetBranch}"`)) {
		await sh(`git fetch origin "${targetBranch}"`, "stream");
		await sh(`git checkout "${targetBranch}"`, "stream");
	} else {
		await sh(`git checkout --orphan "${targetBranch}"`, "stream");
	}

	// Bring back the changed file. We'll be serving it as index.html
	await fs.copyFile(tmpOutputFile, "index.html");
}

/**
 * @param {Pick<GithubPagesDeployOptions, "sha" | "event" | "actor">} opts
 */
async function commit({ sha, event, actor }) {
	const GITHUB_ACTIONS_BOT = `github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>`;

	await sh(`git add .`);
	await sh(`git status`, "stream");

	const author = await sh(`git show -s --format='%an | %ae' ${sha}`);
	const [name, email] = author.split(" | ");
	await sh(`git config user.name "${name}"`);
	await sh(`git config user.email "${email}"`);

	const originalCommmitMessage = await sh(`git log --format=%B -n1 ${sha}`);
	const commitMessage = [
		`chore(rebuild): ${originalCommmitMessage}`,
		"",
		`SHA: ${sha}`,
		`Reason: ${event}, by @${actor}`,
		"",
		"",
		`Co-authored-by: ${GITHUB_ACTIONS_BOT}`,
	].join("\n");
	const COMMIT_MESSAGE_FILE = path.join(os.tmpdir(), "COMMIT_MSG");
	await fs.writeFile(COMMIT_MESSAGE_FILE, commitMessage, "utf-8");

	try {
		await sh(`git commit --file "${COMMIT_MESSAGE_FILE}"`);
		await sh(`git log -p -1 --color --word-diff`, "stream");
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * @param {Pick<GithubPagesDeployOptions, "repository" | "targetBranch" | "token">} opts
 */
async function push({ repository, targetBranch, token }) {
	const repoURI = `https://x-access-token:${token}@github.com/${repository}.git/`;
	await sh(`git remote set-url origin "${repoURI}"`);
	await sh(`git push --force-with-lease origin "${targetBranch}"`, "stream");
}

/**
 * @param {string} outputFile
 * @param {string} tmpOutputFile
 */
async function cleanUp(outputFile, tmpOutputFile) {
	try {
		await fs.unlink("index.html");
	} catch {}

	try {
		await sh(`git checkout -`);
		await sh(`git checkout -- .`);
	} catch {}

	try {
		await fs.copyFile(tmpOutputFile, outputFile);
	} catch {}
}
