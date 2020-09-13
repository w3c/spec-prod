// @ts-check
const { existsSync } = require("fs");
const {
	env,
	exit,
	formatAsHeading,
	pprint,
	setOutput,
	yesOrNo,
} = require("./utils.js");

main();

async function main() {
	/** @type {Inputs} */
	const inputs = JSON.parse(env("INPUTS_USER"));
	/** @type {GitHubContext} */
	const githubContext = JSON.parse(env("INPUTS_GITHUB"));

	console.log(formatAsHeading("Provided input"));
	pprint(inputs);
	console.log();

	const normalizedInputs = await processInputs(inputs, githubContext);

	console.log(`\n${formatAsHeading("Normalized input")}`);
	pprint(normalizedInputs);

	// Make processed inputs available to next steps.
	setOutput("all", JSON.stringify(normalizedInputs));
}

/**
 * @typedef {object} Inputs
 * @property {"respec" | "bikeshed"} [inputs.TYPE]
 * @property {string} [inputs.SOURCE]
 * @property {string} [inputs.VALIDATE_LINKS]
 * @property {string} [inputs.VALIDATE_MARKUP]
 * @property {string} [inputs.GH_PAGES_BRANCH]
 * @property {string} [inputs.GH_PAGES_TOKEN]
 * @property {string} [inputs.W3C_ECHIDNA_TOKEN]
 * @property {string} [inputs.W3C_MANIFEST_URL]
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
 */
async function processInputs(inputs, githubContext) {
	return {
		...typeAndInput(inputs),
		validate: validation(inputs),
		deploy: {
			ghPages: githubPagesDeployment(inputs, githubContext),
			w3c: await w3cEchidnaDeployment(inputs, githubContext),
		},
	};
}

/**
 * Figure out "type" and "source".
 * @param {Inputs} inputs
 */
function typeAndInput(inputs) {
	let type = inputs.TYPE;
	let source = inputs.SOURCE;

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
	const { event_name: event, repository } = githubContext;
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

	let manifest = inputs.W3C_MANIFEST_URL;
	if (!manifest) {
		if (existsSync("ECHIDNA")) {
			const [owner, name] = repository.split("/");
			manifest = `https://${owner}.github.io/${name}/ECHIDNA`;
		} else {
			console.error(`🚧 Echidna manifest file was not found.`);
			return false;
		}
	}

	const cc = inputs.W3C_NOTIFICATIONS_CC;

	return { manifest, wgDecisionURL, cc, token: token };
}

/**
 * @param {string} githubEvent
 */
function shouldTryDeploy(githubEvent) {
	return githubEvent === "push";
}
