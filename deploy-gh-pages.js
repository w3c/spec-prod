// @ts-check
const path = require("path");
const os = require("os");
const fs = require("fs").promises;
const { env, exit, sh, yesOrNo } = require("./utils.js");

const targetBranch = env("INPUTS_GH_PAGES_BRANCH");
const githubEventName = env("IN_GITHUB_EVENT_NAME");
const repo = env("IN_GITHUB_REPOSITORY");
const userName = env("IN_GITHUB_ACTOR");
const sha = env("IN_GITHUB_SHA");
const outputFile = env("OUTPUT_FILE");
const GITHUB_TOKEN = env("INPUTS_GITHUB_TOKEN");

if (yesOrNo(targetBranch) === false) {
	exit("Skipped.", 0);
}
main();

async function main() {
	const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "w3c-deploy-output-"));
	const tmpOutputFile = path.join(tmpDir, outputFile);
	let error = null;
	try {
		await prepare(tmpOutputFile);
		const committed = await commit();
		if (!committed) {
			await cleanUp(tmpOutputFile);
			exit(`Nothing to commit. Skipping deploy.`, 0);
		}
		await push();
	} catch (err) {
		console.error(err);
		error = err;
	} finally {
		cleanUp(tmpOutputFile);
		if (error) {
			console.log();
			console.log("=".repeat(60));
			exit(error.message);
		}
	}
}

/**
 * @param {string} tmpOutputFile
 */
async function prepare(tmpOutputFile) {
	// Temporarily move built file as we'll be doing a checkout soon.
	await fs.rename(outputFile, tmpOutputFile);

	// Clean up working tree
	sh(`git checkout -- .`);

	// Check if target branch remote exists on remote.
	// If it exists, we do a pull, otherwise we create a new orphan branch.
	const repoUri = `https://github.com/${repo}.git/`;
	if (sh(`git ls-remote --heads "${repoUri}" "${targetBranch}"`)) {
		sh(`git fetch origin "${targetBranch}"`, { output: true });
		sh(`git checkout "${targetBranch}"`, { output: true });
	} else {
		sh(`git checkout --orphan "${targetBranch}"`, { output: true });
	}

	// Bring back the changed file. We'll be serving it as index.html
	await fs.copyFile(tmpOutputFile, "index.html");
}

async function commit() {
	const GITHUB_ACTIONS_BOT = `github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>`;

	sh(`git add .`);
	sh(`git status`, { output: true });

	const email = sh(`git show -s --format='%ae' ${sha}`);
	sh(`git config user.name "${userName}"`);
	sh(`git config user.email "${email}"`);

	const originalCommmitMessage = sh(`git log --format=%B -n1 ${sha}`);
	const commitMessage = [
		`chore(rebuild): ${originalCommmitMessage}`,
		"",
		`SHA: ${sha}`,
		`Reason: ${githubEventName}`,
		"",
		"",
		`Co-authored-by: ${GITHUB_ACTIONS_BOT}`,
	].join("\n");

	try {
		sh(`git commit --file -`, { input: commitMessage });
		sh(`git log -p -1 --color --word-diff`, { output: true });
		return true;
	} catch (error) {
		return false;
	}
}

async function push() {
	const REPO_URI = `https://x-access-token:${GITHUB_TOKEN}@github.com/${repo}.git/`;
	sh(`git remote set-url origin "${REPO_URI}"`, { output: true });
	sh(`git push --force-with-lease origin "${targetBranch}"`);
}

/**
 * @param {string} tmpOutputFile
 */
async function cleanUp(tmpOutputFile) {
	try {
		await fs.unlink("index.html");
	} catch {}

	try {
		sh(`git checkout -`);
		sh(`git checkout -- .`);
	} catch {}

	try {
		await fs.copyFile(tmpOutputFile, outputFile);
	} catch {}
}
