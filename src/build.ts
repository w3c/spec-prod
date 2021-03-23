import * as path from "path";
import { copyFile, unlink } from "fs/promises";
import { env, exit, install, setOutput, sh } from "./utils.js";
import { StaticServer } from "./utils.js";
import { PUPPETEER_ENV } from "./constants.js";

import { BasicBuildOptions } from "./prepare-build.js";
import { ProcessedInput } from "./prepare.js";
type Input = ProcessedInput["build"];
type ConfigOverride = Input["configOverride"]["gh" | "w3c"];
type BuildSuffix = "common" | "gh" | "w3c";

/**
 * @example
 * ```js
 * let destination = "my-spec/index.html"; // then:
 * root = process.cwd() + BuildSuffix
 * dir = "my-spec"
 * file = "index.html"
 * dest = path.join(process.cwd() + BuildSuffix, "my-spec")
 * ```
 */
export interface BuildResult {
	root: string;
	dir: string;
	file: string;
	dest: string;
}

const tmpOutputFile = (source: Input["source"]) => source.path + ".built.html";

if (module === require.main) {
	const input: Input = JSON.parse(env("INPUTS_BUILD"));
	main(input).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main({
	toolchain,
	source,
	destination,
	flags,
	configOverride,
}: Input) {
	const input: BasicBuildOptions = { toolchain, source, destination };
	// TODO: compare equal objects also
	if (configOverride.gh === configOverride.w3c) {
		const out = await build(input, flags, null, "common");
		return { ...setOutput("gh", out), ...setOutput("w3c", out) };
	}

	const confGh = configOverride.gh;
	const outGh = await build(input, flags, confGh, "gh");

	const confW3C = configOverride.w3c;
	const outW3C = await build(input, flags, confW3C, "w3c");

	return { ...setOutput("gh", outGh), ...setOutput("w3c", outW3C) };
}

async function build(
	input: BasicBuildOptions,
	additionalFlags: Input["flags"],
	conf: ConfigOverride,
	suffix: BuildSuffix,
): Promise<BuildResult> {
	const { toolchain, source, destination } = input;
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

	const res = await copyRelevantAssets(source, destination, suffix);
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
	const outFile = tmpOutputFile(source);
	try {
		await sh(`respec -s "${src}" -o "${outFile}" --verbose -t 20 ${flags}`, {
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
	const outFile = tmpOutputFile(source);
	await sh(
		`bikeshed ${flags} spec "${source.path}" "${outFile}" ${metadataFlags}`,
		"stream",
	);
}

async function copyRelevantAssets(
	source: Input["source"],
	destination: Input["destination"],
	suffix: BuildSuffix,
): Promise<BuildResult> {
	const rootDir = path.join(process.cwd() + `.${suffix}`);
	let destinationDir = path.join(rootDir, destination.dir);
	if (!destinationDir.endsWith(path.sep)) {
		destinationDir += path.sep;
	}

	// Copy local dependencies of outputFile to a "ready to publish" directory
	await install("local-assets@1", PUPPETEER_ENV);
	const outFile = tmpOutputFile(source);
	await sh(`local-assets "${outFile}" -o ${destinationDir}`, {
		output: "stream",
		env: { VERBOSE: "1", ...PUPPETEER_ENV },
	});

	// Move outputFile to the publish directory.
	const rel = (p: string) => path.relative(process.cwd(), p);
	const destinationFile = path.join(destinationDir, destination.file);
	console.log(`[INFO] [COPY] ${rel(outFile)} >>> ${rel(destinationFile)}`);
	await copyFile(outFile, destinationFile);
	await unlink(outFile);

	// List all files in output directory
	await sh(`ls -R`, { output: "stream", cwd: destinationDir });

	return {
		root: rootDir,
		dest: destinationDir,
		dir: destination.dir,
		file: destination.file,
	};
}
