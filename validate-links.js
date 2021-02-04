// @ts-check
const { env, exit, sh, yesOrNo } = require("./utils.js");

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
		cwd: __dirname,
	});
	await sh(`href-checker index.html --no-same-site`, {
		output: "stream",
		cwd: outputDir,
	});
}
