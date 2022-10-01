import * as path from "path";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import * as puppeteer from "puppeteer";
import { PUPPETEER_ENV } from "./constants.js";
import { exit } from "./utils.js";

import { Inputs } from "./prepare.js";
export type BuildOptions = Awaited<ReturnType<typeof buildOptions>>;

export async function buildOptions(inputs: Inputs) {
	const { toolchain, source, destination } = getBasicBuildOptions(inputs);

	const configOverride = {
		gh: getConfigOverride(inputs.GH_PAGES_BUILD_OVERRIDE),
		w3c: getConfigOverride(inputs.W3C_BUILD_OVERRIDE),
	};
	if (inputs.W3C_ECHIDNA_TOKEN || inputs.W3C_WG_DECISION_URL) {
		configOverride.w3c = await extendW3CBuildConfig(
			configOverride.w3c || {},
			toolchain,
			source,
		);
	}

	const flags = [];
	flags.push(...getFailOnFlags(toolchain, inputs.BUILD_FAIL_ON));

	return { toolchain, source, destination, flags, configOverride };
}

type NormalizedPath = { dir: string; file: string; path: string };
export type BasicBuildOptions = {
	toolchain: "respec" | "bikeshed";
	source: NormalizedPath;
	destination: NormalizedPath;
};
function getBasicBuildOptions(inputs: Inputs): BasicBuildOptions {
	let toolchain = inputs.TOOLCHAIN;
	let source = inputs.SOURCE;
	let destination = inputs.DESTINATION;

	if (toolchain) {
		switch (toolchain) {
			case "respec":
				source ||= "index.html";
				break;
			case "bikeshed":
				source ||= "index.bs";
				break;
			default:
				exit(`Invalid input "TOOLCHAIN": ${toolchain}`);
		}
	}

	if (!source) {
		if (existsSync("index.bs")) {
			source = "index.bs";
		} else if (existsSync("index.html")) {
			source = "index.html";
		}
	}

	if (!toolchain && !source) {
		exit(`Either of "TOOLCHAIN" or "SOURCE" must be provided.`);
	}

	if (!existsSync(source)) {
		exit(`"SOURCE" file "${source}" not found.`);
	}

	if (!toolchain) {
		switch (source) {
			case "index.html":
				toolchain = "respec";
				break;
			case "index.bs":
				toolchain = "bikeshed";
				break;
			default:
				exit(
					`Failed to figure out "TOOLCHAIN" from "SOURCE". Please specify the "TOOLCHAIN".`,
				);
		}
	}

	const getNormalizedPath = (p: string): NormalizedPath => {
		const cwd = process.cwd();
		const parsed = path.parse(path.join(cwd, p));
		if (!parsed.base) {
			parsed.base = "index.html";
		} else if (!parsed.ext) {
			parsed.dir = path.join(parsed.dir, parsed.base);
			parsed.base = "index.html";
		}
		parsed.dir = path.relative(cwd, parsed.dir);
		const { dir, base: file } = parsed;
		return { dir, file, path: path.join(dir, file) };
	};

	destination = (() => {
		const dest = path.parse(destination || source);
		dest.ext = ".html";
		dest.base = dest.base.replace(/\.bs$/, ".html");
		return path.format(dest);
	})();

	return {
		toolchain,
		source: getNormalizedPath(source),
		destination: getNormalizedPath(destination),
	} as BasicBuildOptions;
}

function getConfigOverride(confStr: string) {
	if (!confStr) {
		return null;
	}

	const config: Record<string, string> = {};
	for (const line of confStr.trim().split("\n")) {
		const idx = line.indexOf(":");
		const key = line.slice(0, idx).trim();
		const value = line.slice(idx + 1).trim();
		config[key] = value;
	}
	return config;
}

async function extendW3CBuildConfig(
	conf: NonNullable<ReturnType<typeof getConfigOverride>>,
	toolchain: BasicBuildOptions["toolchain"],
	source: BasicBuildOptions["source"],
) {
	/** Get present date in YYYY-MM-DD format */
	const getShortIsoDate = () => new Date().toISOString().slice(0, 10);

	let publishDate = getShortIsoDate();
	if (toolchain === "respec") {
		conf.publishDate = publishDate = conf.publishDate || publishDate;
	} else if (toolchain === "bikeshed") {
		conf.date = publishDate = conf.date || publishDate;
	}

	if (toolchain === "bikeshed") {
		conf["Prepare For TR"] = "yes";
	}

	let shortName: string | undefined = conf.shortName || conf.shortname;
	if (!shortName) {
		if (toolchain === "respec") {
			shortName = await getShortnameForRespec(source);
		} else if (toolchain === "bikeshed") {
			shortName = await getShortnameForBikeshed(source);
		}
	}
	if (shortName) {
		try {
			const prev = await getPreviousVersionInfo(shortName, publishDate);
			if (toolchain === "respec") {
				conf.previousMaturity = prev.maturity;
				conf.previousPublishDate = prev.publishDate;
			} else if (toolchain === "bikeshed") {
				conf["previous version"] = prev.URI;
			}
		} catch (error) {
			console.error(error.message);
		}
	}

	return conf;
}

async function getShortnameForRespec(source: BasicBuildOptions["source"]) {
	console.group(`[INFO] Finding shortName for ReSpec document: ${source.path}`);
	const browser = await puppeteer.launch({
		executablePath: PUPPETEER_ENV.PUPPETEER_EXECUTABLE_PATH,
	});

	try {
		const page = await browser.newPage();
		const url = new URL(source.path, `file://${process.cwd()}/`).href;
		console.log("[INFO] Navigating to", url);
		await page.goto(url);
		await page.waitForFunction(() => window.hasOwnProperty("respecConfig"), {
			timeout: 10000,
		});
		const shortName: string = await page.evaluate(
			// @ts-ignore
			() => window.respecConfig.shortName as string,
		);
		console.log("[INFO] shortName:", shortName);
		return shortName;
	} catch (error) {
		console.warn(`[WARN] ${error.message}`);
	} finally {
		console.groupEnd();
		await browser.close();
	}
}

// Parses `pre.metadata` in `source` and gets shortname from there.
async function getShortnameForBikeshed(source: BasicBuildOptions["source"]) {
	console.group(
		`[INFO] Finding shortName for Bikeshed document: ${source.path}`,
	);
	const browser = await puppeteer.launch({
		executablePath: PUPPETEER_ENV.PUPPETEER_EXECUTABLE_PATH,
	});

	try {
		console.log("[INFO] Parsing metadata from", source.path);
		const page = await browser.newPage();
		// Navigating to `source.path` then finding and parsing `pre.metadata` is
		// not possible, as the content of .bs file gets escaped by the browser.
		// Alternative is to not use puppeteer and use something like linkeddom, but
		// then why add another dependency? So, we use DOMParser inside puppeteer.
		const text = await readFile(source.path, "utf8");
		const metadata = await page.evaluate((text: string) => {
			const doc = new DOMParser().parseFromString(text, "text/html");
			return doc.querySelector("pre.metadata")?.textContent || null;
		}, text);
		if (!metadata) {
			throw new Error("Failed to read metadata");
		}

		const config = getConfigOverride(metadata)!;
		// Bikeshed allows metadata keys to be in any case: Shortname/shortName etc.
		const shortnameKey = Object.keys(config).find(
			key => key.toLowerCase() === "shortname",
		);
		if (!shortnameKey || !config[shortnameKey]) {
			throw new Error("No `shortname` found in metadata");
		}
		const shortName = config[shortnameKey];
		console.log("[INFO] shortName:", shortName);
		return shortName;
	} catch (error) {
		console.warn(`[WARN] ${error.message}`);
	} finally {
		console.groupEnd();
		await browser.close();
	}
}

async function getPreviousVersionInfo(shortName: string, publishDate: string) {
	console.group(`[INFO] Finding previous version details...`);
	const url = "https://www.w3.org/TR/" + shortName + "/";

	const browser = await puppeteer.launch({
		executablePath: PUPPETEER_ENV.PUPPETEER_EXECUTABLE_PATH,
	});

	try {
		const page = await browser.newPage();
		console.log("[INFO] Navigating to", url);
		const res = await page.goto(url);
		console.log("[INFO] Navigation complete with statusCode:", res!.status());
		if (!res!.ok) {
			throw new Error(`Failed to fetch ${url}`);
		}

		const thisURI = await page.$$eval("body div.head dl dt", elems => {
			const thisVersion = (elems as HTMLElement[]).find(el =>
				/this (?:published )?version/i.test(el.textContent!.trim()),
			);
			if (thisVersion) {
				const dd = thisVersion.nextElementSibling as HTMLElement | null;
				if (dd?.localName === "dd") {
					const link = dd.querySelector("a");
					if (link) return link.href;
				}
			}
			return null;
		});
		console.log("[INFO] thisURI:", thisURI);

		const previousURI = await page.$$eval("body div.head dl dt", elems => {
			const thisVersion = (elems as HTMLElement[]).find(el =>
				/previous (?:published )?version/i.test(el.textContent!.trim()),
			);
			if (thisVersion) {
				const dd = thisVersion.nextElementSibling as HTMLElement | null;
				if (dd?.localName === "dd") {
					const link = dd.querySelector("a");
					if (link) return link.href;
				}
			}
			return null;
		});
		console.log("[INFO] prevURI:", previousURI);

		if (!thisURI) {
			throw new Error(
				"Couldn't find a 'This version' uri in the previous version.",
			);
		}

		const thisDate = thisURI.match(/[1-2][0-9]{7}/)![0];
		const targetPublishDate = publishDate.replace(/\-/g, "");
		const currentURI =
			thisDate === targetPublishDate && previousURI ? previousURI : thisURI;

		const previousMaturity = currentURI.match(/\/TR\/[0-9]{4}\/([A-Z]+)/)![1];

		const previousPublishDate = currentURI
			.match(/[1-2][0-9]{7}/)![0]
			.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");

		return {
			maturity: previousMaturity,
			publishDate: previousPublishDate,
			URI: currentURI,
		};
	} finally {
		console.groupEnd();
		await browser.close();
	}
}

function getFailOnFlags(
	toolchain: BasicBuildOptions["toolchain"],
	failOn: string,
) {
	const FAIL_ON_OPTIONS = [
		"nothing",
		"fatal",
		"link-error",
		"warning",
		"everything",
	];

	if (failOn && !FAIL_ON_OPTIONS.includes(failOn)) {
		exit(
			`BUILD_FAIL_ON must be one of [${FAIL_ON_OPTIONS.join(", ")}]. ` +
				`Found "${failOn}".`,
		);
	}
	switch (toolchain) {
		case "respec": {
			switch (failOn) {
				case "fatal":
				case "link-error":
					return ["-e"];
				case "warning":
					return ["-w"];
				case "everything":
					return ["-e", "-w"];
				case "nothing":
				default:
					return [];
			}
		}
		case "bikeshed": {
			return [`--die-on=${failOn}`];
		}
		default:
			throw new Error("Unreachable");
	}
}
