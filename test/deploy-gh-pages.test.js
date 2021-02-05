// @ts-check
const path = require("path");

module.exports = build;
async function build(outputs = {}) {
	const ghPages = outputs?.prepare?.all?.deploy?.ghPages || {};
	const inputs = {
		targetBranch: ghPages.targetBranch || "gh-pages",
		token: ghPages.token || "TOKEN",
		event: ghPages.event || "push",
		sha: ghPages.sha || "SHA",
		repository: ghPages.repository || "sidvishnoi/w3c-deploy-test",
		actor: ghPages.actor || "sidvishnoi",
	};

	const build = outputs?.build?.output || {};
	const outputDir = build.dir || path.resolve(process.cwd() + ".built");

	return await require("../src/deploy-gh-pages.js")(inputs, outputDir);
}
