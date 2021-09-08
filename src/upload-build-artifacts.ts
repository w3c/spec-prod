import * as path from "path";
import { stat } from "fs/promises";
import * as artifact from "@actions/artifact";
import * as glob from "@actions/glob";
import { env, exit } from "./utils.js";
import { BuildResult } from "./build.js";

type DirectoryPath = BuildResult["dest"];

if (module === require.main) {
	if (!process.env.GITHUB_ACTIONS) {
		exit("Skipped", 0);
	}

	const ghBuildDir: DirectoryPath = env("GH_BUILD_DIR");
	const w3cBuildDir: DirectoryPath = env("W3C_BUILD_DIR");
	main(ghBuildDir, w3cBuildDir).catch((err: any) =>
		exit(err.message || "Failed", err.code),
	);
}

async function main(ghBuildDir: DirectoryPath, w3cBuildDir: DirectoryPath) {
	await uploadArtifact(ghBuildDir);
	await uploadArtifact(w3cBuildDir);
}

async function uploadArtifact(dir: string) {
	const client = artifact.create();
	const name = path.basename(dir);
	const root = path.join(dir, "..");
	const options = { continueOnError: true };
	console.group(`Uploading ${dir} as ${name}...`);
	const files = await findFilesToUpload(dir);
	const result = await client.uploadArtifact(name, files, root, options);
	if (result.failedItems.length) {
		console.log(`${result.failedItems.length} failed to upload.`);
	} else {
		console.log(
			`Artifact ${result.artifactName} uploaded with ${result.artifactItems.length} items (total size = ${result.size} bytes).`,
		);
	}
	console.groupEnd();
}

async function findFilesToUpload(dir: string) {
	const searchResults: string[] = [];
	const globber = await glob.create(dir);
	const rawSearchResults: string[] = await globber.glob();

	/*
    Directories will be rejected if attempted to be uploaded. This includes just empty
    directories so filter any directories out from the raw search results
  */
	for (const searchResult of rawSearchResults) {
		const fileStats = await stat(searchResult);
		// isDirectory() returns false for symlinks if using fs.lstat(), make sure to use fs.stat() instead
		if (!fileStats.isDirectory()) {
			searchResults.push(searchResult);
		}
	}
	return searchResults;
}
