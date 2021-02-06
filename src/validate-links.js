// @ts-check
const { env, exit, sh, yesOrNo, ACTION_DIR } = require("./utils.js");

// @ts-expect-error
if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_LINKS")) === false) {
		exit("Skipped", 0);
	}
	const outputDir = env("OUTPUT_DIR");
	main(outputDir).catch(err => exit(err.message || "Failed", err.code));
}

module.exports = main;
/**
 * @param {string} outputDir
 */
async function main(outputDir) {
	await sh(`yarn add href-checker --silent`, {
		output: "stream",
		cwd: ACTION_DIR,
		env: { PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: "1" },
	});
	await sh(`href-checker index.html --no-same-site`, {
		output: "stream",
		cwd: outputDir,
		env: { PUPPETEER_EXECUTABLE_PATH: "/usr/bin/google-chrome" },
	});
}
