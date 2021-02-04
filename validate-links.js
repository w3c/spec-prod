// @ts-check
const { env, exit, sh, yesOrNo } = require("./utils.js");

// @ts-expect-error
if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_LINKS")) === false) {
		exit("Skipped", 0);
	}
	const outputFile = env("OUTPUT_FILE");
	main(outputFile).catch(err => exit(err.message || "Failed", err.code));
}

module.exports = main;
/**
 * @param {string} outputFile
 */
async function main(outputFile) {
	await sh(`yarn add href-checker --silent`, {
		output: "stream",
		cwd: __dirname,
	});
	await sh(`href-checker "${outputFile}" --no-same-site`, "stream");
}
