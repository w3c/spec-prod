import * as path from "path";
import { readFileSync, readdirSync } from "fs";
import * as yaml from "yaml";

import main, { Inputs, GitHubContext } from "../src/prepare.js";

type Job = { steps: { uses?: string; with: object }[] };
type Workflow = {
	inputs: { [inputName: string]: { default?: string } };
	jobs: { [jobId: string]: Job };
};

export default async function prepare() {
	const INPUTS_USER = {
		...getDefaultInputs(),
		...getInputsFromWorkflow(),
	} as Inputs;
	const INPUTS_GITHUB: GitHubContext = {
		event_name: "push",
		repository: "sidvishnoi/w3c-deploy-test",
		event: { repository: { default_branch: "main", has_pages: false } },
		token: "GITHUB_TOKEN",
		sha: "HEAD^",
		actor: "GITHUB_ACTOR",
	};
	return await main(INPUTS_USER, INPUTS_GITHUB);
}

function getInputsFromWorkflow(): Partial<Inputs> {
	try {
		const workflowDir = path.join(process.cwd(), ".github", "workflows");
		const workflow = readdirSync(workflowDir).find(f => /\.ya?ml$/.test(f));
		if (!workflow) throw new Error("No workflow found.");
		const text = readFileSync(path.join(workflowDir, workflow), "utf8");
		const parsed = yaml.parse(text);
		for (const job of Object.values(parsed.jobs) as Job[]) {
			const step = job.steps.find(step => step.uses?.includes("w3c/spec-prod"));
			if (!step) continue;
			return step.with;
		}
	} catch (error) {
		console.error("Failed to read workflow inputs.");
		console.error(error);
	}
	return {};
}

function getDefaultInputs(): Partial<Inputs> {
	const action = path.join(__dirname, "..", "action.yml");
	const text = readFileSync(action, "utf8");
	const parsed = yaml.parse(text) as Workflow;
	return Object.fromEntries(
		Object.entries(parsed.inputs)
			.filter(([_inputName, inp]) => inp.default)
			.map(([inputName, inp]) => [inputName, inp.default as string]),
	);
}
