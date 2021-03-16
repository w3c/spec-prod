// @ts-check
const path = require("path");
const main = require("../src/deploy-gh-pages.js");

module.exports = deployGhPages;
/** @param {import("./index.test.js").Output} outputs */
async function deployGhPages(outputs) {
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

	const { dir: outputDir = path.resolve(process.cwd() + ".gh") } =
		outputs?.build?.gh || {};
	const { dir: outputDirName = "" } =
		outputs?.prepare?.build?.destination || {};

	return await main(inputs, outputDir, outputDirName);
}
