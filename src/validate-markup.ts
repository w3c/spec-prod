import * as path from "path";
import { env, exit, install, sh, yesOrNo } from "./utils.js";
import { BuildResult } from "./build.js";

if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_MARKUP")) === false) {
		exit("Skipped", 0);
	}

	const input: BuildResult = JSON.parse(env("OUTPUTS_BUILD"));
	main(input).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main({ dir, file }: BuildResult) {
	console.log(`Validating ${file}...`);
	await install("vnu-jar");
	const vnuJar = require("vnu-jar");

	try {
		const relFile = path.relative(dir, file);
		await sh(`java -jar "${vnuJar}" --also-check-css ${relFile}`, {
			output: "stream",
			cwd: dir,
		});
		exit("✅  Looks good! No HTML validation errors!", 0);
	} catch {
		exit("❌  Not so good... please fix the issues above.");
	}
}
