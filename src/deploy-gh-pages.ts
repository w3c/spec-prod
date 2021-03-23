import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";
import { setSecret } from "@actions/core";
import { env, exit, sh } from "./utils.js";

import { GithubPagesDeployOptions } from "./prepare-deploy.js";
import { BuildResult } from "./build.js";
type Input = Exclude<GithubPagesDeployOptions, false>;

if (module === require.main) {
	const inputs: GithubPagesDeployOptions = JSON.parse(env("INPUTS_DEPLOY"));
	const buildResult: BuildResult = JSON.parse(env("OUTPUTS_BUILD"));

	if (inputs === false) {
		exit("Skipped.", 0);
	}
	main(inputs, buildResult).catch(err => {
		exit(err.message || "Failed", err.code);
	});
}

export default async function main(inputs: Input, buildResult: BuildResult) {
	let error = null;
	await fs.copyFile(".git/config", "/tmp/spec-prod-git-config");
	try {
		await prepare(inputs, buildResult);
		const gitStatus = await sh(`git status`, "stream");
		const hasChanges = !gitStatus.includes("nothing to commit");
		const committed = hasChanges && (await commit(inputs));
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

async function prepare(
	opts: Pick<Input, "targetBranch" | "repository">,
	buildResult: BuildResult,
) {
	const outputDir = buildResult.root.endsWith(path.sep)
		? buildResult.root
		: `${buildResult.root}${path.sep}`;
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

	await sh(`rsync -a ${outputDir} .`, "stream");
	await sh(`git add -A`, "stream");
}

async function commit({
	sha,
	event,
	actor,
}: Pick<Input, "sha" | "event" | "actor">) {
	const GITHUB_ACTIONS_BOT = `github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>`;

	const author = await sh(`git show -s --format='%an | %ae' ${sha}`);
	const [name, email] = author.split(" | ");
	setSecret(email);
	await sh(`git config user.name "${name}"`);
	await sh(`git config user.email "${email}"`);

	const commitHeadline = await sh(`git show -s --format=%s ${sha}`);
	const commitMessage = [
		commitHeadline,
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
		return true;
	} catch (error) {
		return false;
	}
}

async function push({
	repository,
	targetBranch,
	token,
}: Pick<Input, "repository" | "targetBranch" | "token">) {
	const repoURI = `https://x-access-token:${token}@github.com/${repository}.git/`;
	await sh(`git remote set-url origin "${repoURI}"`);
	await sh(`git pull origin "${targetBranch}" --rebase`).catch(() => {});
	await sh(`git push --force-with-lease origin "${targetBranch}"`, "stream");
}

async function cleanUp() {
	console.group("Cleanup");
	try {
		await sh(`git reset`);
		await sh(`git clean -fd`);
		await sh(`git checkout -`);
		await sh(`git checkout -- .`);
		await fs.copyFile("/tmp/spec-prod-git-config", ".git/config");
	} catch {
	} finally {
		console.groupEnd();
	}
}
