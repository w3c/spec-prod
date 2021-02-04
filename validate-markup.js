// @ts-check
const { env, exit, sh, yesOrNo } = require("./utils.js");

// @ts-expect-error
if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_MARKUP")) === false) {
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
	console.log(`Validating ${outputFile}...`);
	await sh(`yarn add vnu-jar --silent`, {
		output: "silent",
		cwd: __dirname,
	});
	const vnuJar = require("vnu-jar");

	try {
		const cmd = `java -jar "${vnuJar}" --also-check-css "${outputFile}"`;
		await sh(cmd, "stream");
		exit("✅  Looks good! No HTML validation errors!", 0);
	} catch {
		exit("❌  Not so good... please fix the issues above.");
	}
}
