// @ts-check
const path = require("path");
const { readFileSync, readdirSync } = require("fs");
const yaml = require("yaml");

module.exports = prepare;
async function prepare() {
	/** @type { import("../src/prepare.js").Inputs } */
	const INPUTS_USER = { ...getDefaultInputs(), ...getInputsFromWorkflow() };

	/** @type { import("../src/prepare.js").GitHubContext } */
	const INPUTS_GITHUB = {
		event_name: "push",
		repository: "sidvishnoi/w3c-deploy-test",
		event: { repository: { default_branch: "main", has_pages: false } },
		token: "GITHUB_TOKEN",
		sha: "HEAD^",
		actor: "GITHUB_ACTOR",
	};
	return await require("../src/prepare.js")(INPUTS_USER, INPUTS_GITHUB);
}

/** @returns { Partial<import("../src/prepare.js").Inputs> } */
function getInputsFromWorkflow() {
	try {
		const workflowDir = path.join(process.cwd(), ".github", "workflows");
		const workflow = readdirSync(workflowDir).find(f => /\.ya?ml$/.test(f));
		const text = readFileSync(path.join(workflowDir, workflow), "utf8");
		const parsed = yaml.parse(text);
		for (const job of Object.values(parsed.jobs)) {
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

/** @returns { Partial<import("../src/prepare.js").Inputs> } */
function getDefaultInputs() {
	const action = path.join(__dirname, "..", "action.yml");
	const text = readFileSync(action, "utf8");
	const parsed = yaml.parse(text);
	return Object.fromEntries(
		Object.entries(parsed.inputs)
			.filter(([name, info]) => info.default)
			.map(([name, info]) => [name, info.default]),
	);
}
