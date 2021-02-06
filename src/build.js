// @ts-check
/**
 * @typedef {import("./prepare.js").ProcessedInput["build"]} BuildInput
 */
const path = require("path");
const { copyFile, unlink } = require("fs").promises;
const { env, exit, setOutput, sh, ACTION_DIR } = require("./utils.js");

// @ts-expect-error
if (module === require.main) {
	/** @type {BuildInput} */
	const { toolchain, source, flags } = JSON.parse(env("INPUTS_BUILD"));
	main(toolchain, source, flags).catch(err =>
		exit(err.message || "Failed", err.code),
	);
}

module.exports = main;
/**
 * @param {BuildInput["toolchain"]} toolchain
 * @param {BuildInput["source"]} source
 * @param {BuildInput["flags"]} additionalFlags
 */
async function main(toolchain, source, additionalFlags) {
	// Please do not rely on this value. If you would like this to be available as
	// an action output, file an issue.
	const outputFile = source + ".built.html";

	switch (toolchain) {
		case "respec":
			await buildReSpec(source, outputFile, additionalFlags);
			break;
		case "bikeshed":
			await buildBikeshed(source, outputFile, additionalFlags);
			break;
		default:
			throw new Error(`Unknown "TOOLCHAIN": "${toolchain}"`);
	}

	return await copyRelevantAssets(outputFile);
}

/**
 * @param {BuildInput["source"]} source
 * @param {string} outputFile
 * @param {BuildInput["flags"]} additionalFlags
 */
async function buildReSpec(source, outputFile, additionalFlags) {
	const flags = additionalFlags.join(" ");
	console.log(`Converting ReSpec document '${source}' to HTML...`);
	await sh(
		`respec -s "${source}" -o "${outputFile}" --verbose --timeout 20 ${flags}`,
		{
			output: "stream",
			env: { PUPPETEER_EXECUTABLE_PATH: "/usr/bin/google-chrome" },
		},
	);
}

/**
 * @param {BuildInput["source"]} source
 * @param {string} outputFile
 * @param {BuildInput["flags"]} additionalFlags
 */
async function buildBikeshed(source, outputFile, additionalFlags) {
	const flags = additionalFlags.join(" ");
	console.log(`Converting Bikeshed document '${source}' to HTML...`);
	await sh(`bikeshed spec "${source}" "${outputFile}" ${flags}`, "stream");
}

/**
 * @param {string} outputFile
 */
async function copyRelevantAssets(outputFile) {
	let destinationDir = path.resolve(process.cwd() + ".built");
	if (!destinationDir.endsWith(path.sep)) {
		destinationDir += path.sep;
	}

	// Copy local dependencies of outputFile to a "ready to publish" directory
	await sh("yarn add local-assets@1 --silent", {
		output: "stream",
		cwd: ACTION_DIR,
		env: { PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: "1" },
	});
	await sh(`local-assets "${outputFile}" -o ${destinationDir}`, {
		output: "stream",
		env: { VERBOSE: "1", PUPPETEER_EXECUTABLE_PATH: "/usr/bin/google-chrome" },
	});

	// Move outputFile to the publish directory.
	const rel = p => path.relative(process.cwd(), p);
	const destinationFile = path.join(destinationDir, "index.html");
	console.log(`[INFO] [COPY] ${rel(outputFile)} >>> ${rel(destinationFile)}`);
	await copyFile(outputFile, destinationFile);
	await unlink(outputFile);

	// List all files in output directory
	await sh(`ls -R`, { output: "buffer", cwd: destinationDir });

	return setOutput("output", {
		dir: destinationDir,
		file: destinationFile,
	});
}
