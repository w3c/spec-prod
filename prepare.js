// @ts-check
const { existsSync } = require("fs");
const { inspect } = require("util");

const { exit, setOutput, formatAsHeading, sh, yesOrNo } = require("./utils.js");
const { env } = require("./utils.js");

main();

function main() {
	/** @type {Inputs} */
	const inputs = JSON.parse(env("INPUTS"));
	/** @type {GitHubContext} */
	const githubContext = {
		token: env("IN_GITHUB_TOKEN"),
		event_name: env("IN_GITHUB_EVENT_NAME"),
	};

	console.log(formatAsHeading("Provided input"));
	console.log(inspect(inputs, false, Infinity, true));

	const normalizedInputs = processInputs(inputs, githubContext);

	console.log(`\n\n${formatAsHeading("Normalized input")}`);
	console.log(inspect(normalizedInputs, false, Infinity, true));

	// Make processed inputs available to next steps.
	for (const [key, val] of Object.entries(normalizedInputs)) {
		setOutput(key, val);
	}
}

/**
 * @typedef {object} Inputs
 * @property {"respec" | "bikeshed"} [inputs.type]
 * @property {string} [inputs.source]
 * @property {string} [inputs.validateLinks]
 * @property {string} [inputs.validateMarkup]
 * @property {string} [inputs.ghPages]
 * @property {string} [inputs.GITHUB_TOKEN]
 *
 * @typedef {object} GitHubContext
 * @property {string} GitHubContext.token
 * @property {string} GitHubContext.event_name
 *
 * @param {Inputs} inputs
 * @param {GitHubContext} githubContext
 */
function processInputs(inputs, githubContext) {
	return {
		...typeAndInput(inputs),
		...validation(inputs),
		...(githubPagesDeployment(inputs, githubContext) || {
			ghPages: false,
			GITHUB_TOKEN: "NOT_REQUIRED",
		}),
	};
}

/**
 * Figure out "type" and "source".
 * @param {Inputs} inputs
 */
function typeAndInput(inputs) {
	let type = inputs.type;
	let source = inputs.source;

	if (type) {
		switch (type) {
			case "respec":
				source = source || "index.html";
				break;
			case "bikeshed":
				source = source || "index.bs";
				break;
			default:
				exit(`Invalid input "type": ${type}`);
		}
	} else if (!source) {
		exit(`Either of "type" or "source" must be provided.`);
	}

	if (!existsSync(source)) {
		exit(`"source" file "${source}" not found.`);
	}

	if (!type) {
		switch (source) {
			case "index.html":
				type = "respec";
				break;
			case "index.bs":
				type = "bikeshed";
				break;
			default:
				exit(
					`Failed to figure out "type" from "source". Please specify the "type".`,
				);
		}
	}

	return { type, source };
}

/**
 * Figure out validation requests.
 * @param {Inputs} inputs
 */
function validation(inputs) {
	const validateLinks = yesOrNo(inputs.validateLinks) || false;
	const validateMarkup = yesOrNo(inputs.validateMarkup) || false;
	return { validateLinks, validateMarkup };
}

/**
 * Figure out GitHub pages deployment.
 * @param {Inputs} inputs
 * @param {GitHubContext} githubContext
 * @typedef {ReturnType<typeof githubPagesDeployment>} GithubPagesDeployOptions
 */
function githubPagesDeployment(inputs, githubContext) {
	const { event_name: event } = githubContext;

	const shouldTryDeployToGitHubPages = event === "push";
	if (!shouldTryDeployToGitHubPages) {
		return false;
	}

	const askedNotToDeploy = yesOrNo(inputs.ghPages) === false;
	if (askedNotToDeploy) {
		return false;
	}

	const targetBranch = yesOrNo(inputs.ghPages) ? "gh-pages" : inputs.ghPages;

	const currentBranch = sh("git branch --show-current");
	if (currentBranch === targetBranch) {
		exit(`Current branch and "ghPages" cannot be same.`);
	}

	let token = inputs.GITHUB_TOKEN;
	if (!token) {
		console.log("Using default GITHUB_TOKEN.");
		token = githubContext.token;
	}

	return { ghPages: targetBranch, GITHUB_TOKEN: token };
}
