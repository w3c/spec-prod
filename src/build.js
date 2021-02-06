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
	const { toolchain, source, flags, configOverride } = JSON.parse(
		env("INPUTS_BUILD"),
	);
	main(toolchain, source, flags, configOverride).catch(err =>
		exit(err.message || "Failed", err.code),
	);
}

module.exports = main;
/**
 * @param {BuildInput["toolchain"]} toolchain
 * @param {BuildInput["source"]} source
 * @param {BuildInput["flags"]} flags
 * @param {BuildInput["configOverride"]} configOverride
 */
async function main(toolchain, source, flags, configOverride) {
	// TODO: compare equal objects also
	if (configOverride.gh === configOverride.w3c) {
		let destDir = path.resolve(process.cwd() + ".built");
		const out = await build(toolchain, source, destDir, flags, null);

		return { ...setOutput("gh", out), ...setOutput("w3c", out) };
	}

	let destDirGh = path.resolve(process.cwd() + ".gh");
	const confGh = configOverride.gh;
	const outGh = await build(toolchain, source, destDirGh, flags, confGh);

	let destDirW3C = path.resolve(process.cwd() + ".w3c");
	const confW3C = configOverride.w3c;
	const outW3C = await build(toolchain, source, destDirW3C, flags, confW3C);

	return { ...setOutput("gh", outGh), ...setOutput("w3c", outW3C) };
}

/**
 * @param {BuildInput["toolchain"]} toolchain
 * @param {BuildInput["source"]} source
 * @param {string} destDir
 * @param {BuildInput["flags"]} additionalFlags
 * @param {BuildInput["configOverride"]["gh" | "w3c"]} conf
 */
async function build(toolchain, source, destDir, additionalFlags, conf) {
	const outputFile = source + ".built.html";

	switch (toolchain) {
		case "respec": {
			await buildReSpec(source, outputFile, additionalFlags, conf);
			break;
		}
		case "bikeshed": {
			await buildBikeshed(source, outputFile, additionalFlags, conf);
			break;
		}
		default:
			throw new Error(`Unknown "TOOLCHAIN": "${toolchain}"`);
	}

	return await copyRelevantAssets(outputFile, destDir);
}

/**
 * @param {BuildInput["source"]} source
 * @param {string} outputFile
 * @param {BuildInput["flags"]} additionalFlags
 * @param {BuildInput["configOverride"]["gh" | "w3c"]} conf
 */
async function buildReSpec(source, outputFile, additionalFlags, conf) {
	console.log(`Converting ReSpec document '${source}' to HTML...`);
	const flags = additionalFlags.join(" ");
	const params = new URLSearchParams(conf).toString();
	const src = `${source}${params ? `?${params}` : ""}`;
	await sh(
		`respec -s "${src}" -o "${outputFile}" --verbose --timeout 20 ${flags}`,
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
 * @param {BuildInput["configOverride"]["gh" | "w3c"]} conf
 */
async function buildBikeshed(source, outputFile, additionalFlags, conf) {
	console.log(`Converting Bikeshed document '${source}' to HTML...`);
	const metadataFlags = Object.entries(conf || {}).map(
		([key, val]) => `--md-${key.replace(/\s+/g, "-")}="${val}"`,
	);
	const flags = additionalFlags.concat(metadataFlags).join(" ");
	await sh(`bikeshed spec "${source}" "${outputFile}" ${flags}`, "stream");
}

/**
 * @param {string} outputFile
 * @param {string} destinationDir
 */
async function copyRelevantAssets(outputFile, destinationDir) {
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

	return { dir: destinationDir, file: destinationFile };
}
