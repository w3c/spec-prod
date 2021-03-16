// @ts-check
const path = require("path");

module.exports = deployGhPages;
async function deployGhPages(outputs = {}) {
	const deploy = outputs?.prepare?.deploy;
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

	const outputDir = outputs?.build?.w3c?.dir || process.cwd();
	const outputDirName = outputs?.prepare?.build?.destination.dir || "";

	return await require("../src/deploy-gh-pages.js")(
		inputs,
		outputDir,
		outputDirName,
	);
}
