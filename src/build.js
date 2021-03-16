// @ts-check
/**
 * @typedef {import("./prepare.js").ProcessedInput["build"]} BuildInput
 */
const path = require("path");
const { copyFile, unlink } = require("fs").promises;
const { env, exit, install, setOutput, sh } = require("./utils.js");
const { StaticServer } = require("./utils.js");
const { PUPPETEER_ENV } = require("./constants.js");

if (module === require.main) {
	/** @type {BuildInput} */
	const { toolchain, source, destination, flags, configOverride } = JSON.parse(
		env("INPUTS_BUILD"),
	);
	main(toolchain, source, destination, flags, configOverride).catch(err =>
		exit(err.message || "Failed", err.code),
	);
}

module.exports = main;
/**
 * @param {BuildInput["toolchain"]} tool
 * @param {BuildInput["source"]} source
 * @param {BuildInput["destination"]} destination
 * @param {BuildInput["flags"]} flags
 * @param {BuildInput["configOverride"]} configOverride
 */
async function main(tool, source, destination, flags, configOverride) {
	// TODO: compare equal objects also
	if (configOverride.gh === configOverride.w3c) {
		const out = await build(tool, source, destination, flags, null, "common");
		return { ...setOutput("gh", out), ...setOutput("w3c", out) };
	}

	const confGh = configOverride.gh;
	const outGh = await build(tool, source, destination, flags, confGh, "gh");

	const confW3C = configOverride.w3c;
	const outW3C = await build(tool, source, destination, flags, confW3C, "w3c");

	return { ...setOutput("gh", outGh), ...setOutput("w3c", outW3C) };
}

/**
 * @param {BuildInput["toolchain"]} tool
 * @param {BuildInput["source"]} source
 * @param {BuildInput["destination"]} destination
 * @param {BuildInput["flags"]} additionalFlags
 * @param {BuildInput["configOverride"]["gh" | "w3c"]} conf
 * @param {"common" | "gh" | "w3c"} suffix
 * @typedef {{ dir: string, file: string }} BuildOutput
 * @returns {Promise<BuildOutput>}
 */
async function build(tool, source, destination, additionalFlags, conf, suffix) {
	const toolchain = tool;
	const outputFile = source + ".built.html";

	console.group(`[INFO] Build ${toolchain} document "${source}" (${suffix})…`);
	switch (toolchain) {
		case "respec":
			await buildReSpec(source, outputFile, additionalFlags, conf);
			break;
		case "bikeshed":
			await buildBikeshed(source, outputFile, additionalFlags, conf);
			break;
		default:
			throw new Error(`Unknown "TOOLCHAIN": "${toolchain}"`);
	}

	const res = await copyRelevantAssets(outputFile, destination, suffix);
	console.groupEnd();
	return res;
}

/**
 * @param {BuildInput["source"]} source
 * @param {string} outputFile
 * @param {BuildInput["flags"]} additionalFlags
 * @param {BuildInput["configOverride"]["gh" | "w3c"]} conf
 */
async function buildReSpec(source, outputFile, additionalFlags, conf) {
	const flags = additionalFlags.join(" ");
	const server = await new StaticServer(process.cwd()).start();
	const src = new URL(source, server.url);
	for (const [key, val] of Object.entries(conf || {})) {
		src.searchParams.set(key, val);
	}
	try {
		await sh(`respec -s "${src}" -o "${outputFile}" --verbose -t 20 ${flags}`, {
			output: "stream",
			env: PUPPETEER_ENV,
		});
	} finally {
		await server.stop();
	}
}

/**
 * @param {BuildInput["source"]} source
 * @param {string} outputFile
 * @param {BuildInput["flags"]} additionalFlags
 * @param {BuildInput["configOverride"]["gh" | "w3c"]} conf
 */
async function buildBikeshed(source, outputFile, additionalFlags, conf) {
	const metadataFlags = Object.entries(conf || {})
		.map(([key, val]) => `--md-${key.replace(/\s+/g, "-")}="${val}"`)
		.join(" ");
	const flags = additionalFlags.join(" ");
	await sh(
		`bikeshed ${flags} spec "${source}" "${outputFile}" ${metadataFlags}`,
		"stream",
	);
}

/**
 * @param {string} outputFile
 * @param {BuildInput["destination"]} destination
 * @param {string} suffix
 * @returns {Promise<BuildOutput>}
 */
async function copyRelevantAssets(outputFile, destination, suffix) {
	let destinationDir = path.join(`${process.cwd()}.${suffix}`, destination.dir);
	if (!destinationDir.endsWith(path.sep)) {
		destinationDir += path.sep;
	}

	// Copy local dependencies of outputFile to a "ready to publish" directory
	await install("local-assets@1", PUPPETEER_ENV);
	await sh(`local-assets "${outputFile}" -o ${destinationDir}`, {
		output: "stream",
		env: { VERBOSE: "1", ...PUPPETEER_ENV },
	});

	// Move outputFile to the publish directory.
	const rel = p => path.relative(process.cwd(), p);
	const destinationFile = path.join(destinationDir, destination.file);
	console.log(`[INFO] [COPY] ${rel(outputFile)} >>> ${rel(destinationFile)}`);
	await copyFile(outputFile, destinationFile);
	await unlink(outputFile);

	// List all files in output directory
	await sh(`ls -R`, { output: "buffer", cwd: destinationDir });

	return { dir: destinationDir, file: destination.file };
}
