// @ts-check
const path = require("path");
const { env, exit, install, sh, yesOrNo } = require("./utils.js");

if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_MARKUP")) === false) {
		exit("Skipped", 0);
	}

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
	console.log(`Validating ${dir}/${file}...`);
	await install("vnu-jar");
	const vnuJar = require("vnu-jar");

	try {
		await sh(`java -jar "${vnuJar}" --also-check-css ${file}`, {
			output: "stream",
			cwd: dir,
		});
		exit("✅  Looks good! No HTML validation errors!", 0);
	} catch {
		exit("❌  Not so good... please fix the issues above.");
	}
}
