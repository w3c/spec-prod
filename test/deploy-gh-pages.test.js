// @ts-check
const path = require("path");

module.exports = build;
async function build(output) {
	const inputs = {
		targetBranch: "gh-pages",
		token: "TOKEN",
		event: "push",
		sha: "a820102",
		repository: "sidvishnoi/w3c-deploy-test",
		actor: "sidvishnoi",
	};
	const outputDir = path.resolve(process.cwd() + ".built");
	return await require("../src/deploy-gh-pages.js")(inputs, outputDir);
}
