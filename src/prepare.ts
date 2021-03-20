import { existsSync } from "fs";
import * as puppeteer from "puppeteer";
import { PUPPETEER_ENV } from "./constants.js";
import {
	env,
	exit,
	formatAsHeading,
	pprint,
	setOutput,
	yesOrNo,
	ThenArg,
} from "./utils.js";

const FAIL_ON_OPTIONS = [
	"nothing",
	"fatal",
	"link-error",
	"warning",
	"everything",
];

export interface Inputs {
	TOOLCHAIN: "respec" | "bikeshed" | string;
	SOURCE: string;
	BUILD_FAIL_ON: string;
	VALIDATE_LINKS: string;
	VALIDATE_MARKUP: string;
	GH_PAGES_BRANCH: string;
	GH_PAGES_TOKEN: string;
	GH_PAGES_BUILD_OVERRIDE: string;
	W3C_ECHIDNA_TOKEN: string;
	W3C_BUILD_OVERRIDE: string;
	W3C_WG_DECISION_URL: string;
	W3C_NOTIFICATIONS_CC: string;
}

export interface GitHubContext {
	token: string;
	event_name: string;
	repository: `${string}/${string}`;
	sha: string;
	actor: string;
	event: {
		repository: { default_branch: string; has_pages: boolean };
	};
}

if (module === require.main) {
	const inputs: Inputs = JSON.parse(env("INPUTS_USER"));
	const githubContext: GitHubContext = JSON.parse(env("INPUTS_GITHUB"));
	main(inputs, githubContext).catch(err =>
		exit(err.message || "Failed", err.code),
	);
}

export default async function main(
	inputs: Inputs,
	githubContext: GitHubContext,
) {
	console.log(formatAsHeading("Provided input"));
	pprint(inputs);
	console.log();

	const normalizedInputs = await processInputs(inputs, githubContext);

	console.log(`\n${formatAsHeading("Normalized input")}`);
	pprint(normalizedInputs);

	// Make processed inputs available to next steps.
	return {
		...setOutput("build", normalizedInputs.build),
		...setOutput("validate", normalizedInputs.validate),
		...setOutput("deploy", normalizedInputs.deploy),
	};
}

export type ProcessedInput = ThenArg<ReturnType<typeof processInputs>>;
async function processInputs(inputs: Inputs, githubContext: GitHubContext) {
	return {
		build: await buildOptions(inputs),
		validate: validation(inputs),
		deploy: {
			ghPages: githubPagesDeployment(inputs, githubContext),
			w3c: await w3cEchidnaDeployment(inputs, githubContext),
		},
	};
}

async function buildOptions(inputs: Inputs) {
	const { toolchain, source } = getBasicBuildOptions(inputs);

	const configOverride = {
		gh: getConfigOverride(inputs.GH_PAGES_BUILD_OVERRIDE),
		w3c: await extendW3CBuildConfig(
			getConfigOverride(inputs.W3C_BUILD_OVERRIDE) || {},
			{ toolchain, source },
		),
	};

	const flags = [];
	flags.push(...getFailOnFlags(toolchain, inputs.BUILD_FAIL_ON));

	return { toolchain, source, flags, configOverride };
}

export type BasicBuildOptions = {
	toolchain: "respec" | "bikeshed";
	source: string;
};
function getBasicBuildOptions(inputs: Inputs): BasicBuildOptions {
	let toolchain = inputs.TOOLCHAIN;
	let source = inputs.SOURCE;

	if (toolchain) {
		switch (toolchain) {
			case "respec":
				source = source || "index.html";
				break;
			case "bikeshed":
				source = source || "index.bs";
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

	return { toolchain, source } as BasicBuildOptions;
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
	{ toolchain, source }: BasicBuildOptions,
) {
	/** Get present date in YYYY-MM-DD format */
	const getShortIsoDate = () => new Date().toISOString().slice(0, 10);

	let publishDate = getShortIsoDate();
	if (toolchain === "respec") {
		conf.publishDate = publishDate = conf.publishDate || publishDate;
	} else if (toolchain === "bikeshed") {
		conf.date = publishDate = conf.date || publishDate;
	}

	let shortName: string | undefined = conf.shortName || conf.shortname;
	if (!shortName) {
		if (toolchain === "respec") {
			shortName = await getShortnameForRespec(source);
		} // TODO: do same for Bikeshed
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

async function getShortnameForRespec(source: string) {
	console.group(`[INFO] Finding shortName for ReSpec document: ${source}`);
	const browser = await puppeteer.launch({
		executablePath: PUPPETEER_ENV.PUPPETEER_EXECUTABLE_PATH,
	});

	try {
		const page = await browser.newPage();
		const url = new URL(source, `file://${process.cwd()}/`).href;
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
		console.log("[INFO] Navigation complete with statusCode:", res.status());
		if (!res.ok) {
			throw new Error(`Failed to fetch ${url}`);
		}

		const thisURI = await page.$$eval("body div.head dl dt", elems => {
			const thisVersion = (elems as HTMLElement[]).find(el =>
				/this (?:published )?version/i.test(el.textContent!.trim()),
			);
			if (thisVersion) {
				const dd = thisVersion.nextElementSibling as HTMLElement | null;
				if (dd && dd.localName === "dd") {
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
				if (dd && dd.localName === "dd") {
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
			}
		}
		case "bikeshed": {
			return [`--die-on=${failOn}`];
		}
		default:
			throw new Error("Unreachable");
	}
}

function validation(inputs: Inputs) {
	const links = yesOrNo(inputs.VALIDATE_LINKS) || false;
	const markup = yesOrNo(inputs.VALIDATE_MARKUP) || false;
	return { links, markup };
}

export type GithubPagesDeployOptions = ReturnType<typeof githubPagesDeployment>;
function githubPagesDeployment(inputs: Inputs, githubContext: GitHubContext) {
	const { event_name: event, sha, repository, actor } = githubContext;
	const {
		default_branch: defaultBranch,
		has_pages: hasGitHubPagesEnabled,
	} = githubContext.event.repository;
	const ghPagesBranch = inputs.GH_PAGES_BRANCH;

	if (!shouldTryDeploy(event)) {
		return false;
	}

	const askedNotToDeploy = yesOrNo(ghPagesBranch) === false;
	if (askedNotToDeploy || !ghPagesBranch) {
		return false;
	}

	const targetBranch = yesOrNo(ghPagesBranch) ? "gh-pages" : ghPagesBranch;

	if (defaultBranch === targetBranch) {
		exit(
			`Default branch and "GH_PAGES_BRANCH": "${targetBranch}" cannot be same.`,
		);
	}

	if (!hasGitHubPagesEnabled) {
		console.log(`📣 Please enable GitHub pages in repository settings.`);
	}

	let token = inputs.GH_PAGES_TOKEN;
	if (!token) {
		token = githubContext.token;
	}

	return { targetBranch, token, event, sha, repository, actor };
}

export type W3CDeployOptions = ThenArg<ReturnType<typeof w3cEchidnaDeployment>>;
async function w3cEchidnaDeployment(
	inputs: Inputs,
	githubContext: GitHubContext,
) {
	const { event_name: event } = githubContext;
	if (!shouldTryDeploy(event)) {
		return false;
	}

	const token = inputs.W3C_ECHIDNA_TOKEN;
	const wgDecisionURL = inputs.W3C_WG_DECISION_URL;
	if (!token || !wgDecisionURL) {
		console.log(
			"📣 Skipping deploy to W3C as required inputs were not provided.",
		);
		return false;
	}

	const cc = inputs.W3C_NOTIFICATIONS_CC;

	return { wgDecisionURL, cc, token: token };
}

function shouldTryDeploy(githubEvent: GitHubContext["event_name"]) {
	return githubEvent === "push";
}
