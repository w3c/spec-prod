import { env, exit, install, sh, yesOrNo } from "./utils.js";
import core = require("@actions/core");
import path = require("path");

import { BuildResult } from "./build.js";
type Input = Pick<BuildResult, "dest" | "file">;

if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_MARKUP")) === false) {
		exit("Skipped", 0);
	}

	const input: Input = JSON.parse(env("OUTPUTS_BUILD"));
	main(input).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main({ dest, file }: Input) {
	console.log(`Validating ${file}...`);
	await install("vnu-jar");
	const vnuJar = require("vnu-jar");

	const matchersPath = path.join(
		__dirname,
		"validate-markup-problem-matcher.json",
	);
	core.info(`##[add-matcher]${matchersPath}`);

	try {
		await sh(`java -jar "${vnuJar}" --also-check-css ${file}`, {
			output: "stream",
			cwd: dest,
		});
		exit("✅  Looks good! No HTML validation errors!", 0);
	} catch {
		exit("❌  Not so good... please fix the issues above.");
	}
}
