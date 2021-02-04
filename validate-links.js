// @ts-check
const { env, exit, sh, yesOrNo } = require("./utils.js");

if (yesOrNo(env("INPUTS_VALIDATE_LINKS")) === false) {
	exit("Skipped", 0);
}

(async () => {
	const outputFile = env("OUTPUT_FILE");
	await sh(`yarn add href-checker --silent`, {
		output: "stream",
		cwd: __dirname,
	});
	await sh(`href-checker "${outputFile}" --no-same-site`, "stream");
})().catch(err => exit("Failed.", err.code));
