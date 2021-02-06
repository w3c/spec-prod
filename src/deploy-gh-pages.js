// @ts-check
const path = require("path");
const os = require("os");
const fs = require("fs").promises;
const { env, exit, sh } = require("./utils.js");

// @ts-expect-error
if (module === require.main) {
	/** @type {import("./prepare.js").GithubPagesDeployOptions} */
	const inputs = JSON.parse(env("INPUTS_DEPLOY"));
	const outputDir = env("OUTPUT_DIR");

	if (inputs === false) {
		exit("Skipped.", 0);
	}
	main(inputs, outputDir).catch(err => exit(err.message || "Failed", err.code));
}

module.exports = main;
/**
 * @typedef {Exclude<import("./prepare.js").GithubPagesDeployOptions, false>} GithubPagesDeployOptions
 * @param {GithubPagesDeployOptions} inputs
 * @param {string} outputDir
 */
async function main(inputs, outputDir) {
	if (!outputDir.endsWith(path.sep)) {
		outputDir += path.sep;
	}
	let error = null;
	await fs.copyFile(".git/config", "/tmp/spec-prod-git-config");
	try {
		await prepare(inputs, outputDir);
		const committed = await commit(inputs);
		if (!committed) {
			await cleanUp();
			exit(`Nothing to commit. Skipping deploy.`, 0);
		}
		await push(inputs);
	} catch (err) {
		console.log(err);
		error = err;
	} finally {
		await cleanUp();
		if (error) {
			console.log();
			console.log("=".repeat(60));
			exit(error.message);
		}
	}
}

/**
 * @param {Pick<GithubPagesDeployOptions, "targetBranch" | "repository">} opts
 * @param {string} outputDir
 */
async function prepare(opts, outputDir) {
	if (!outputDir.endsWith(path.sep)) {
		throw new Error("outputDir must end with a trailing slash.");
	}
	const { targetBranch, repository } = opts;

	// Check if target branch remote exists on remote.
	// If it exists, we do a pull, otherwise we create a new orphan branch.
	const repoUri = `https://github.com/${repository}.git/`;
	if (await sh(`git ls-remote --heads "${repoUri}" "${targetBranch}"`)) {
		await sh(`git fetch origin "${targetBranch}"`, "stream");
		await sh(`git checkout "${targetBranch}"`, "stream");
	} else {
		await sh(`git checkout --orphan "${targetBranch}"`, "stream");
		await sh(`git reset --hard`, "stream");
	}

	await sh(`rsync -av ${outputDir} .`, "stream");
	await sh(`git add -A --verbose`, "stream");
	await sh(`git status`, "buffer");
}

/**
 * @param {Pick<GithubPagesDeployOptions, "sha" | "event" | "actor">} opts
 */
async function commit({ sha, event, actor }) {
	const GITHUB_ACTIONS_BOT = `github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>`;

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

async function cleanUp() {
	try {
		await sh(`git checkout -`);
		await sh(`git checkout -- .`);
		await fs.copyFile("/tmp/spec-prod-git-config", ".git/config");
	} catch {}
}
