import { env, exit, formatAsHeading, pprint, setOutput } from "./utils.ts";

import { buildOptions } from "./prepare-build.ts";
import {
	githubPagesDeployment,
	w3cEchidnaDeployment,
} from "./prepare-deploy.ts";
import { validation } from "./prepare-validate.ts";

export interface Inputs {
	TOOLCHAIN: "respec" | "bikeshed" | string;
	SOURCE: string;
	DESTINATION: string;
	BUILD_FAIL_ON: string;
	VALIDATE_LINKS: string;
	VALIDATE_INPUT_MARKUP: string;
	VALIDATE_MARKUP: string;
	VALIDATE_PUBRULES: string;
	VALIDATE_WEBIDL: string;
	SUBRESOURCES_METHOD: "dom" | "network" | string;
	GH_PAGES_BRANCH: string;
	GH_PAGES_TOKEN: string;
	GH_PAGES_BUILD_OVERRIDE: string;
	W3C_ECHIDNA_TOKEN: string;
	W3C_BUILD_OVERRIDE: string;
	W3C_WG_DECISION_URL: string;
	W3C_NOTIFICATIONS_CC: string;
	ARTIFACT_NAME?: string;
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

if (import.meta.main) {
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

export type ProcessedInput = Awaited<ReturnType<typeof processInputs>>;
async function processInputs(inputs: Inputs, githubContext: GitHubContext) {
	return {
		build: await buildOptions(inputs, githubContext),
		validate: validation(inputs),
		deploy: {
			ghPages: githubPagesDeployment(inputs, githubContext),
			w3c: await w3cEchidnaDeployment(inputs, githubContext),
		},
	};
}
