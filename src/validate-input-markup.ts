import { env, exit, install, sh, yesOrNo } from "./utils.js";

import { ProcessedInput } from "./prepare.js";
type Input = Pick<ProcessedInput["build"], "source">;

if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_INPUT_MARKUP")) === false) {
		exit("Skipped", 0);
	}

	const input: Input = JSON.parse(env("INPUTS_BUILD"));
	main(input).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main({ source }: Input) {
	console.log(`Validating ${source}...`);
	await install("vnu-jar");
	const vnuJar = require("vnu-jar");

	try {
		await sh(`java -jar "${vnuJar}" ${source}`, {
			output: "stream",
		});
		exit("✅  Looks good! No HTML validation errors!", 0);
	} catch {
		exit("❌  Not so good... please fix the issues above.");
	}
}
