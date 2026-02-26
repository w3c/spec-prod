import * as path from "node:path";
import { copyFile, mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";
import type { ResourceType } from "subresources/types";
import { getAllSubResources as domSubResources } from "subresources/dom";
import { getAllSubResources as networkSubResources } from "subresources/network";
import { env, exit, setOutput, sh, unique } from "./utils.ts";
import { deepEqual, StaticServer } from "./utils.ts";
import { PUPPETEER_ENV } from "./constants.ts";

import type { BasicBuildOptions as BasicBuildOptions_ } from "./prepare-build.ts";
import type { ProcessedInput } from "./prepare.ts";
type BasicBuildOptions = Omit<BasicBuildOptions_, "artifactName">;
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

const rel = (p: string) => path.relative(process.cwd(), p);
const tmpOutputFile = (source: Input["source"]) => source.path + ".built.html";

if (import.meta.main) {
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
	if (deepEqual(configOverride.gh, configOverride.w3c)) {
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
	const server = await new StaticServer().start();
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
	const destinationDir = path.join(rootDir, destination.dir);
	const destinationFile = path.join(destinationDir, destination.file);
	const tmpOutFile = tmpOutputFile(source);

	const assets = await findAssetsToCopy(source);
	await copyLocalAssets(assets.local, rootDir);
	const newRemoteURLs = await downloadRemoteAssets(
		assets.remote,
		destinationDir,
	);

	// Copy output file to the publish directory
	if (!newRemoteURLs.length) {
		await copy(tmpOutFile, destinationFile);
	} else {
		console.log(`Replacing instances of remote URLs with download asset URLs…`);
		let text = await readFile(tmpOutFile, "utf8");
		for (const urls of newRemoteURLs) {
			text = replaceAll(urls.old, urls.new, text);
		}
		await mkdir(path.dirname(destinationFile), { recursive: true });
		await writeFile(destinationFile, text, "utf8");
	}

	await unlink(tmpOutFile);

	// List all files in output directory
	await sh(`ls -R`, { output: "buffer", cwd: destinationDir });

	return {
		root: rootDir,
		dest: destinationDir,
		dir: destination.dir,
		file: destination.file,
	};
}

async function findAssetsToCopy(source: Input["source"]) {
	console.groupCollapsed(`[INFO] Finding relevant assets…`);
	let localAssets: string[] = [];
	let remoteAssets: URL[] = [];

	Object.assign(process.env, PUPPETEER_ENV);

	const server = await new StaticServer().start();

	const isLocalAsset = (url: URL) => url.origin === server.url.origin;
	const remoteAssetRules: ((url: URL, type: ResourceType) => boolean)[] = [
		(url: URL) => url.origin === "https://user-images.githubusercontent.com",
	];

	const mainPage = urlToPage(new URL(tmpOutputFile(source), server.url));
	const pages = new Set([mainPage]);
	for (const page of pages) {
		const rootUrl = new URL(page);
		console.log(`[INFO] From ${rootUrl.pathname}…`);
		const { ok, headers } = await fetch(rootUrl);
		if (!ok || !headers.get("content-type")?.includes("text/html")) {
			console.log(
				`[WARNING] Failed to fetch ${rootUrl.pathname}. Some assets might be missing.`,
			);
			continue;
		}

		const options = {
			links: true,
			puppeteerOptions: {
				executablePath: PUPPETEER_ENV.PUPPETEER_EXECUTABLE_PATH,
				args: ["--no-sandbox"],
			},
		};
		// Merge results from both DOM- and network-based collectors
		// so we don't miss anything.
		const allSubResources = mergeAsyncIterables(
			domSubResources(rootUrl, options),
			networkSubResources(rootUrl, options),
		);
		for await (const res of allSubResources) {
			const url = new URL(res.url);
			if (isLocalAsset(url) && res.type === "link") {
				const nextPage = urlToPage(url);
				if (!pages.has(nextPage)) {
					pages.add(nextPage);
					localAssets.push(url.pathname);
				}
			} else if (isLocalAsset(url)) {
				localAssets.push(url.pathname);
			} else if (remoteAssetRules.some(matcher => matcher(url, res.type))) {
				remoteAssets.push(url);
			}
		}
	}

	localAssets = unique(localAssets);
	remoteAssets = unique(remoteAssets, url => url.href);

	console.log("Local assets to be copied:", trimList(localAssets));
	console.log(
		"Remote assets to be downloaded:",
		trimList(remoteAssets.map(u => u.href)),
	);
	console.groupEnd();

	await server.stop();
	return { local: localAssets.sort(), remote: remoteAssets.sort() };
}

async function copyLocalAssets(assets: string[], destinationDir: string) {
	console.groupCollapsed(`Copying ${assets.length} local files…`);
	await Promise.all(
		assets.map(asset => copy(asset, path.join(destinationDir, asset))),
	);
	console.groupEnd();
}

async function downloadRemoteAssets(urls: URL[], destinationDir: string) {
	console.groupCollapsed(`Downloading ${urls.length} remote files…`);
	const result = await Promise.all(
		urls.map(url => download(url, destinationDir)),
	);
	console.groupEnd();
	return result;
}

// ///////////////////////
// Utils
// ///////////////////////

async function copy(src: string, dst: string) {
	src = path.join(process.cwd(), src);
	try {
		await mkdir(path.dirname(dst), { recursive: true });
		await copyFile(src, dst);
	} catch (error) {
		const msg = `Copy: ${rel(src)} ➡ ${rel(dst)}`;
		console.log("[WARNING]", msg, error.message);
	}
}

async function download(url: URL, destinationDir: string) {
	const href = `downloaded-assets/${url.host}${url.pathname}`;
	const destination = path.join(destinationDir, href.replace(/\//g, path.sep));

	try {
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`Status: ${res.status}`);
		}
		await mkdir(path.dirname(destination), { recursive: true });
		await writeFile(
			destination,
			Readable.fromWeb(res.body as ReadableStream<Uint8Array>),
		);
	} catch (error) {
		const msg = `Download: ${url.href} ➡ ${rel(destination)}`;
		console.log("[WARNING]", msg, error.message);
	}
	return { old: url.href, new: href };
}

// https://www.npmjs.com/package/replaceall
function replaceAll(replaceThis: string, withThis: string, inThis: string) {
	withThis = withThis.replace(/\$/g, "$$$$");
	return inThis.replace(
		new RegExp(
			replaceThis.replace(
				/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|<>\-\&])/g,
				"\\$&",
			),
			"g",
		),
		withThis,
	);
}

function trimList(list: string[], len = 8) {
	if (list.length < len) return list;
	return list.slice(0, len).concat([`${list.length - len} more..`]);
}

function urlToPage(url: URL) {
	return new URL(url.pathname, url.origin).href;
}

// merge multiple async iterables into a single async iterable.
async function* mergeAsyncIterables<T>(...iters: AsyncIterable<T>[]) {
	for (const it of iters) {
		for await (const v of it) {
			yield v;
		}
	}
}
