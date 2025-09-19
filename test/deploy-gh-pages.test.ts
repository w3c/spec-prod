import main from "../src/deploy-gh-pages.js";
import type { Outputs } from "./index.test.js";

export default async function deployGhPages(outputs: Outputs) {
	const { ghPages = false } = outputs?.prepare?.deploy || {};
	if (ghPages === false) {
		return;
	}
	if (ghPages === true) {
		throw new Error("Unexpected.");
	}
	const inputs = {
		targetBranch: ghPages.targetBranch || "gh-pages",
		token: ghPages.token || "TOKEN",
		event: ghPages.event || "push",
		sha: ghPages.sha || "SHA",
		repository: ghPages.repository || "sidvishnoi/w3c-deploy-test",
		actor: ghPages.actor || "sidvishnoi",
	};

	const { root: outputDir = process.cwd() + ".common" } =
		outputs?.build?.w3c || {};

	return await main(inputs, outputDir);
}
