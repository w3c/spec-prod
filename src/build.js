// @ts-check
/**
 * @typedef {import("./prepare.js").ProcessedInput["build"]} BuildInput
 */
const path = require("path");
const { copyFile, unlink } = require("fs").promises;
const { env, exit, install, setOutput, sh } = require("./utils.js");
const { StaticServer } = require("./utils.js");
const { PUPPETEER_ENV } = require("./constants.js");

const OUT_FILE = "index.built.html";

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
		const out = await build(toolchain, source, flags, null, "common");
		return { ...setOutput("gh", out), ...setOutput("w3c", out) };
	}

	const confGh = configOverride.gh;
	const outGh = await build(toolchain, source, flags, confGh, "gh");

	const confW3C = configOverride.w3c;
	const outW3C = await build(toolchain, source, flags, confW3C, "w3c");

	return { ...setOutput("gh", outGh), ...setOutput("w3c", outW3C) };
}

/**
 * @param {BuildInput["toolchain"]} toolchain
 * @param {BuildInput["source"]} source
 * @param {BuildInput["flags"]} additionalFlags
 * @param {BuildInput["configOverride"]["gh" | "w3c"]} conf
 * @param {"common" | "gh" | "w3c"} suffix
 */
async function build(toolchain, source, additionalFlags, conf, suffix) {
	console.group(`[INFO] Build ${toolchain} document "${source}" (${suffix})…`);
	switch (toolchain) {
		case "respec":
			await buildReSpec(source, additionalFlags, conf);
			break;
		case "bikeshed":
			await buildBikeshed(source, additionalFlags, conf);
			break;
		default:
			throw new Error(`Unknown "TOOLCHAIN": "${toolchain}"`);
	}

	const destDir = path.resolve(process.cwd() + `.${suffix}`);
	const res = await copyRelevantAssets(destDir);
	console.groupEnd();
	return res;
}

/**
 * @param {BuildInput["source"]} source
 * @param {BuildInput["flags"]} additionalFlags
 * @param {BuildInput["configOverride"]["gh" | "w3c"]} conf
 */
async function buildReSpec(source, additionalFlags, conf) {
	const flags = additionalFlags.join(" ");
	const server = await new StaticServer(process.cwd()).start();
	const src = new URL(source, server.url);
	for (const [key, val] of Object.entries(conf || {})) {
		src.searchParams.set(key, val);
	}
	try {
		await sh(`respec -s "${src}" -o "${OUT_FILE}" --verbose -t 20 ${flags}`, {
			output: "stream",
			env: PUPPETEER_ENV,
		});
	} finally {
		await server.stop();
	}
}

/**
 * @param {BuildInput["source"]} source
 * @param {BuildInput["flags"]} additionalFlags
 * @param {BuildInput["configOverride"]["gh" | "w3c"]} conf
 */
async function buildBikeshed(source, additionalFlags, conf) {
	const metadataFlags = Object.entries(conf || {})
		.map(([key, val]) => `--md-${key.replace(/\s+/g, "-")}="${val}"`)
		.join(" ");
	const flags = additionalFlags.join(" ");
	await sh(
		`bikeshed ${flags} spec "${source}" "${OUT_FILE}" ${metadataFlags}`,
		"stream",
	);
}

/**
 * @param {string} destinationDir
 */
async function copyRelevantAssets(destinationDir) {
	if (!destinationDir.endsWith(path.sep)) {
		destinationDir += path.sep;
	}

	// Copy local dependencies of outputFile to a "ready to publish" directory
	await install("local-assets@1", PUPPETEER_ENV);
	await sh(`local-assets "${OUT_FILE}" -o ${destinationDir}`, {
		output: "stream",
		env: { VERBOSE: "1", ...PUPPETEER_ENV },
	});

	// Move outputFile to the publish directory.
	const rel = p => path.relative(process.cwd(), p);
	const destinationFile = path.join(destinationDir, "index.html");
	console.log(`[INFO] [COPY] ${rel(OUT_FILE)} >>> ${rel(destinationFile)}`);
	await copyFile(OUT_FILE, destinationFile);
	await unlink(OUT_FILE);

	// List all files in output directory
	await sh(`ls -R`, { output: "buffer", cwd: destinationDir });

	return { dir: destinationDir, file: destinationFile };
}
