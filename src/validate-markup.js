// @ts-check
const { env, exit, sh, yesOrNo, ACTION_DIR } = require("./utils.js");

// @ts-expect-error
if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_MARKUP")) === false) {
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
	console.log(`Validating ${outputDir}/index.html...`);
	await sh(`yarn add vnu-jar --silent`, { cwd: ACTION_DIR });
	const vnuJar = require("vnu-jar");

	try {
		await sh(`java -jar "${vnuJar}" --also-check-css index.html`, {
			output: "stream",
			cwd: outputDir,
		});
		exit("✅  Looks good! No HTML validation errors!", 0);
	} catch {
		exit("❌  Not so good... please fix the issues above.");
	}
}
