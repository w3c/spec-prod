// @ts-check
const { env, exit, install, sh, yesOrNo } = require("./utils.js");
const { PUPPETEER_ENV } = require("./constants.js");

if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_LINKS")) === false) {
		exit("Skipped", 0);
	}
	exit("Link validator is currently disabled due to some bugs.", 0);

	const outputDir = env("OUTPUT_DIR");
	main(outputDir).catch(err => exit(err.message || "Failed", err.code));
}

module.exports = main;
/**
 * @param {string} outputDir
 */
async function main(outputDir) {
	await install(`href-checker`, PUPPETEER_ENV);
	await sh(`href-checker index.html --no-same-site`, {
		output: "stream",
		cwd: outputDir,
		env: PUPPETEER_ENV,
	});
}
