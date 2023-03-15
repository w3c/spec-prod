import { exit, yesOrNo } from "./utils.js";

import { Inputs, GitHubContext } from "./prepare.js";
export type W3CDeployOptions = Awaited<ReturnType<typeof w3cEchidnaDeployment>>;
export type GithubPagesDeployOptions = ReturnType<typeof githubPagesDeployment>;

export function githubPagesDeployment(
	inputs: Inputs,
	githubContext: GitHubContext,
) {
	const { event_name: event, sha, repository, actor } = githubContext;
	const { default_branch: defaultBranch, has_pages: hasGitHubPagesEnabled } =
		githubContext.event.repository;
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

export async function w3cEchidnaDeployment(
	inputs: Inputs,
	githubContext: GitHubContext,
) {
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

	const cc = inputs.W3C_NOTIFICATIONS_CC;

	return { wgDecisionURL, cc, token: token, repository };
}

function shouldTryDeploy(githubEvent: GitHubContext["event_name"]) {
	return githubEvent === "push" || githubEvent === "workflow_dispatch";
}
