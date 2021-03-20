import { env, exit, install, sh, yesOrNo } from "./utils.js";
import { PUPPETEER_ENV } from "./constants.js";

if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_LINKS")) === false) {
		exit("Skipped", 0);
	}
	exit("Link validator is currently disabled due to some bugs.", 0);

	const outputDir = env("OUTPUT_DIR");
	main(outputDir).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main(outputDir: string) {
	await install(`href-checker`, PUPPETEER_ENV);
	await sh(`href-checker index.html --no-same-site`, {
		output: "stream",
		cwd: outputDir,
		env: PUPPETEER_ENV,
	});
}
