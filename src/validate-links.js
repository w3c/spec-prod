// @ts-check
const { env, exit, install, sh, yesOrNo } = require("./utils.js");
const { PUPPETEER_ENV } = require("./constants.js");

if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_LINKS")) === false) {
		exit("Skipped", 0);
	}
	exit("Link validator is currently disabled due to some bugs.", 0);

	/** @type {BuildOutput} */
	const destination = JSON.parse(env("OUT_DESTINATION"));
	main(destination).catch(err => exit(err.message || "Failed", err.code));
}

module.exports = main;
/**
 * @typedef {import("./build.js").BuildOutput} BuildOutput
 * @param {BuildOutput} destination
 */
async function main({ dir, file }) {
	await install(`href-checker`, PUPPETEER_ENV);
	await sh(`href-checker ${file} --no-same-site`, {
		output: "stream",
		cwd: dir,
		env: PUPPETEER_ENV,
	});
}
