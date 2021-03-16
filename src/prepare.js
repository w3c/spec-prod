// @ts-check
const path = require("path");
const { existsSync } = require("fs");
const puppeteer = require("puppeteer");
const {
	env,
	exit,
	formatAsHeading,
	pprint,
	setOutput,
	yesOrNo,
} = require("./utils.js");
const { PUPPETEER_ENV } = require("./constants.js");

const FAIL_ON_OPTIONS = [
	"nothing",
	"fatal",
	"link-error",
	"warning",
	"everything",
];

if (module === require.main) {
	/** @type {Inputs} */
	const inputs = JSON.parse(env("INPUTS_USER"));
	/** @type {GitHubContext} */
	const githubContext = JSON.parse(env("INPUTS_GITHUB"));
	main(inputs, githubContext).catch(err =>
		exit(err.message || "Failed", err.code),
	);
}

module.exports = main;
/**
 * @param {Inputs} inputs
 * @param {GitHubContext} githubContext
 */
async function main(inputs, githubContext) {
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

/**
 * @typedef {object} Inputs
 * @property {"respec" | "bikeshed"} [inputs.TOOLCHAIN]
 * @property {string} [inputs.SOURCE]
 * @property {string} [inputs.DESTINATION]
 * @property {string} [inputs.BUILD_FAIL_ON]
 * @property {string} [inputs.VALIDATE_LINKS]
 * @property {string} [inputs.VALIDATE_MARKUP]
 * @property {string} [inputs.GH_PAGES_BRANCH]
 * @property {string} [inputs.GH_PAGES_TOKEN]
 * @property {string} [inputs.GH_PAGES_BUILD_OVERRIDE]
 * @property {string} [inputs.W3C_ECHIDNA_TOKEN]
 * @property {string} [inputs.W3C_BUILD_OVERRIDE]
 * @property {string} [inputs.W3C_WG_DECISION_URL]
 * @property {string} [inputs.W3C_NOTIFICATIONS_CC]
 *
 * @typedef {{ default_branch: string, has_pages: boolean }} Repository
 *
 * @typedef {object} GitHubContext
 * @property {string} GitHubContext.token
 * @property {string} GitHubContext.event_name
 * @property {string} GitHubContext.repository
 * @property {string} GitHubContext.sha
 * @property {string} GitHubContext.actor
 * @property {{ repository: Repository }} GitHubContext.event
 *
 * @param {Inputs} inputs
 * @param {GitHubContext} githubContext
 *
 * @typedef {ThenArg<ReturnType<processInputs>>} ProcessedInput
 */
async function processInputs(inputs, githubContext) {
	return {
		build: await buildOptions(inputs),
		validate: validation(inputs),
		deploy: {
			ghPages: githubPagesDeployment(inputs, githubContext),
			w3c: await w3cEchidnaDeployment(inputs, githubContext),
		},
	};
}

/**
 * Figure out "toolchain" and input "source".
 * // TODO: refactor this to remove duplicate logic.
 * @param {Inputs} inputs
 */
async function buildOptions(inputs) {
	const { toolchain, source, destination } = getBasicBuildOptions(inputs);

	const configOverride = {
		gh: getConfigOverride(inputs.GH_PAGES_BUILD_OVERRIDE),
		w3c: await extendW3CBuildConfig(
			getConfigOverride(inputs.W3C_BUILD_OVERRIDE) || {},
			{ toolchain, source },
		),
	};

	const flags = [];
	flags.push(...getFailOnFlags(toolchain, inputs.BUILD_FAIL_ON));

	return { toolchain, source, destination, flags, configOverride };
}

/**
 * @param {Inputs} inputs
 * @typedef {object} BasicBuildOptions
 * @property {"respec" | "bikeshed"} BasicBuildOptions.toolchain
 * @property {string} BasicBuildOptions.source
 * @property {{ dir: string, file: string }} BasicBuildOptions.destination
 * @returns {BasicBuildOptions}
 */
function getBasicBuildOptions(inputs) {
	let toolchain = inputs.TOOLCHAIN;
	let source = inputs.SOURCE;
	let destination = inputs.DESTINATION || "index.html";

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

	const dest = path.parse(path.join(process.cwd(), destination));
	if (!dest.base) {
		dest.base = "index.html";
	} else if (!dest.ext) {
		dest.dir = dest.base;
		dest.base = "index.html";
	}
	dest.dir = path.relative(process.cwd(), dest.dir);

	return { toolchain, source, destination: { dir: dest.dir, file: dest.base } };
}

/** @param {string} confStr */
function getConfigOverride(confStr) {
	if (!confStr) {
		return null;
	}

	/** @type {Record<string, string>} */
	const config = {};
	for (const line of confStr.trim().split("\n")) {
		const idx = line.indexOf(":");
		const key = line.slice(0, idx).trim();
		const value = line.slice(idx + 1).trim();
		config[key] = value;
	}
	return config;
}

/**
 * @param {ReturnType<getConfigOverride>} conf
 * @param {Pick<BasicBuildOptions, "toolchain" | "source">} basicBuildOptions
 */
async function extendW3CBuildConfig(conf, { toolchain, source }) {
	/** Get present date in YYYY-MM-DD format */
	const getShortIsoDate = () => new Date().toISOString().slice(0, 10);

	let publishDate = getShortIsoDate();
	if (toolchain === "respec") {
		conf.publishDate = publishDate = conf.publishDate || publishDate;
	} else if (toolchain === "bikeshed") {
		conf.date = publishDate = conf.date || publishDate;
	}

	let shortName = conf.shortName || conf.shortname;
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

/** @param {string} source */
async function getShortnameForRespec(source) {
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
		/** @type {string} */
		const shortName = await page.evaluate(
			() => window["respecConfig"].shortName,
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

/**
 * @param {string} shortName
 * @param {string} publishDate
 */
async function getPreviousVersionInfo(shortName, publishDate) {
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
			const thisVersion = elems.find(el =>
				/this (?:published )?version/i.test(el.textContent.trim()),
			);
			if (thisVersion) {
				const dd = thisVersion.nextElementSibling;
				if (dd && dd.localName === "dd") {
					return dd.querySelector("a").href;
				}
			}
			return null;
		});
		console.log("[INFO] thisURI:", thisURI);

		const previousURI = await page.$$eval("body div.head dl dt", elems => {
			const previousVersion = elems.find(el =>
				/previous (?:published )?version/i.test(el.textContent.trim()),
			);
			if (previousVersion) {
				const dd = previousVersion.nextElementSibling;
				if (dd && dd.localName === "dd") {
					return dd.querySelector("a").href;
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

		const thisDate = thisURI.match(/[1-2][0-9]{7}/)[0];
		const targetPublishDate = publishDate.replace(/\-/g, "");
		const currentURI = thisDate === targetPublishDate ? previousURI : thisURI;

		const previousMaturity = currentURI.match(/\/TR\/[0-9]{4}\/([A-Z]+)/)[1];

		const previousPublishDate = currentURI
			.match(/[1-2][0-9]{7}/)[0]
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

/**
 * @param {"respec" | "bikeshed" | string} toolchain
 * @param {string} failOn
 */
function getFailOnFlags(toolchain, failOn) {
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
	}
	return [];
}

/**
 * Figure out validation requests.
 * @param {Inputs} inputs
 */
function validation(inputs) {
	const links = yesOrNo(inputs.VALIDATE_LINKS) || false;
	const markup = yesOrNo(inputs.VALIDATE_MARKUP) || false;
	return { links, markup };
}

/**
 * @template T
 * @typedef {T extends PromiseLike<infer U> ? U : T} ThenArg<T>
 */

/**
 * Figure out GitHub pages deployment.
 * @param {Inputs} inputs
 * @param {GitHubContext} githubContext
 * @typedef {ReturnType<typeof githubPagesDeployment>} GithubPagesDeployOptions
 */
function githubPagesDeployment(inputs, githubContext) {
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
		exit(`Default branch and "ghPages": "${targetBranch}" cannot be same.`);
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

/**
 * Figure out GitHub pages deployment.
 * @param {Inputs} inputs
 * @param {GitHubContext} githubContext
 * @typedef {ThenArg<ReturnType<typeof w3cEchidnaDeployment>>} W3CDeployOptions
 */
async function w3cEchidnaDeployment(inputs, githubContext) {
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

/**
 * @param {string} githubEvent
 */
function shouldTryDeploy(githubEvent) {
	return githubEvent === "push";
}
