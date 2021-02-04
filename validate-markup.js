// @ts-check
const { env, exit, sh, yesOrNo } = require("./utils.js");

if (yesOrNo(env("INPUTS_VALIDATE_MARKUP")) === false) {
	exit("Skipped", 0);
}

const outputFile = env("OUTPUT_FILE");
console.log(`Validating ${outputFile}...`);

(async () => {
	await sh(`yarn add vnu-jar --silent`, "silent");
	const vnuJar = await sh(`node -p "require('vnu-jar')"`, "silent");

	try {
		const cmd = `java -jar "${vnuJar}" --also-check-css "${outputFile}"`;
		await sh(cmd, "stream");
		exit("✅  Looks good! No HTML validation errors!", 0);
	} catch {
		exit("❌  Not so good... please fix the issues above.");
	}
})().catch(err => exit("Failed.", err.code));
