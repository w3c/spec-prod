// @ts-check
const { env, exit, sh, yesOrNo } = require("./utils.js");

if (yesOrNo(env("INPUTS_VALIDATE_MARKUP")) === false) {
	exit("Skipped", 0);
}

const outputFile = env("OUTPUT_FILE");
console.log(`Validating ${outputFile}...`);

(async () => {
	await sh(`yarn global add vnu-jar --silent`, "silent");
	const nodePath = await sh(`yarn global dir`, "silent");
	const vnuJar = await sh(
		`NODE_PATH="${nodePath}/node_modules/" node -p "require('vnu-jar')"`,
		"silent",
	);

	try {
		const cmd = `java -jar "${vnuJar}" --also-check-css "${outputFile}"`;
		await sh(cmd, "stream");
		exit("✅  Looks good! No HTML validation errors!", 0);
	} catch {
		exit("❌  Not so good... please fix the issues above.");
	}
})().catch(err => exit("Failed.", err.code));
