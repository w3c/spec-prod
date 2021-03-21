import * as path from "path";
import { copyFile, unlink } from "fs/promises";
import { env, exit, install, setOutput, sh } from "./utils.js";
import { StaticServer } from "./utils.js";
import { PUPPETEER_ENV } from "./constants.js";

import { ProcessedInput } from "./prepare.js";
type Input = ProcessedInput["build"];
type ConfigOverride = Input["configOverride"]["gh" | "w3c"];
type BuildSuffix = "common" | "gh" | "w3c";
type BuildResult = { dir: string; file: string };

const OUT_FILE = "index.built.html";

if (module === require.main) {
	const input: Input = JSON.parse(env("INPUTS_BUILD"));
	main(input).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main({
	toolchain,
	source,
	flags,
	configOverride,
}: Input) {
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

async function build(
	toolchain: Input["toolchain"],
	source: Input["source"],
	additionalFlags: Input["flags"],
	conf: ConfigOverride,
	suffix: BuildSuffix,
): Promise<BuildResult> {
	console.group(
		`[INFO] Build ${toolchain} document "${source.path}" (${suffix})…`,
	);
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

async function buildReSpec(
	source: Input["source"],
	additionalFlags: Input["flags"],
	conf: ConfigOverride,
) {
	const flags = additionalFlags.join(" ");
	const server = await new StaticServer(process.cwd()).start();
	const src = new URL(source.path, server.url);
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

async function buildBikeshed(
	source: Input["source"],
	additionalFlags: Input["flags"],
	conf: ConfigOverride,
) {
	const metadataFlags = Object.entries(conf || {})
		.map(([key, val]) => `--md-${key.replace(/\s+/g, "-")}="${val}"`)
		.join(" ");
	const flags = additionalFlags.join(" ");
	await sh(
		`bikeshed ${flags} spec "${source.path}" "${OUT_FILE}" ${metadataFlags}`,
		"stream",
	);
}

async function copyRelevantAssets(
	destinationDir: string,
): Promise<BuildResult> {
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
	const rel = (p: string) => path.relative(process.cwd(), p);
	const destinationFile = path.join(destinationDir, "index.html");
	console.log(`[INFO] [COPY] ${rel(OUT_FILE)} >>> ${rel(destinationFile)}`);
	await copyFile(OUT_FILE, destinationFile);
	await unlink(OUT_FILE);

	// List all files in output directory
	await sh(`ls -R`, { output: "buffer", cwd: destinationDir });

	return { dir: destinationDir, file: destinationFile };
}
