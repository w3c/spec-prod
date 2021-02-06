// @ts-check
const path = require("path");

module.exports = deployGhPages;
async function deployGhPages(outputs = {}) {
	const deploy = outputs?.prepare?.all?.deploy;
	if (deploy && deploy.ghPages === false) {
		return;
	}

	const ghPages = deploy?.ghPages || {};
	const inputs = {
		targetBranch: ghPages.targetBranch || "gh-pages",
		token: ghPages.token || "TOKEN",
		event: ghPages.event || "push",
		sha: ghPages.sha || "SHA",
		repository: ghPages.repository || "sidvishnoi/w3c-deploy-test",
		actor: ghPages.actor || "sidvishnoi",
	};

	const build = outputs?.build?.gh || {};
	const outputDir = build.dir || path.resolve(process.cwd() + ".built");

	return await require("../src/deploy-gh-pages.js")(inputs, outputDir);
}
