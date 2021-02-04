// @ts-check
const path = require("path");
const { copyFile } = require("fs").promises;
const { env, exit, setOutput, sh } = require("./utils.js");

// @ts-expect-error
if (module === require.main) {
	const toolchain = env("INPUTS_TOOLCHAIN");
	const source = env("INPUTS_SOURCE");
	main(toolchain, source).catch(err => exit(err.message || "Failed", err.code));
}

module.exports = main;
/**
 * @param {"respec" | "bikeshed" | string} toolchain
 * @param {string} source
 */
async function main(toolchain, source) {
	// Please do not rely on this value. If you would like this to be available as
	// an action output, file an issue.
	const outputFile = source + ".built.html";

	switch (toolchain) {
		case "respec":
			console.log(`Converting ReSpec document '${source}' to HTML...`);
			await sh(
				`respec -s "${source}" -o "${outputFile}" --verbose --timeout 20`,
				"stream",
			);
			break;
		case "bikeshed":
			console.log(`Converting Bikeshed document '${source}' to HTML...`);
			await sh(`bikeshed spec "${source}" "${outputFile}"`, "stream");
			break;
		default:
			throw new Error(`Unknown "TOOLCHAIN": "${toolchain}"`);
	}

	return await copyRelevantAssets(outputFile);
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
	await sh("yarn add https://github.com/sidvishnoi/local-assets/ --silent", {
		output: "stream",
		cwd: __dirname,
	});
	await sh(`local-assets "${outputFile}" -o ${destinationDir}`, {
		output: "stream",
		env: { VERBOSE: "1" },
	});

	// Copy outputFile itself.
	const rel = p => path.relative(process.cwd(), p);
	const destinationFile = path.join(destinationDir, "index.html");
	console.log(`[COPY] ${rel(outputFile)} >>> ${rel(destinationFile)}`);
	await copyFile(outputFile, destinationFile);

	// List all files in output directory
	await sh(`ls -R`, { output: "buffer", cwd: destinationDir });

	return setOutput("output", {
		dir: destinationDir,
		file: destinationFile,
	});
}
