import { env, exit, install, sh, yesOrNo } from "./utils.js";

if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_MARKUP")) === false) {
		exit("Skipped", 0);
	}

	const outputDir = env("OUTPUT_DIR");
	main(outputDir).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main(outputDir: string) {
	console.log(`Validating ${outputDir}/index.html...`);
	await install("vnu-jar");
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
