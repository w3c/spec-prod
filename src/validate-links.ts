import * as path from "path";
import { env, exit, install, sh, yesOrNo } from "./utils.js";
import { PUPPETEER_ENV } from "./constants.js";
import { BuildResult } from "./build.js";

if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_LINKS")) === false) {
		exit("Skipped", 0);
	}
	exit("Link validator is currently disabled due to some bugs.", 0);

	const input: BuildResult = JSON.parse(env("OUTPUTS_BUILD"));
	main(input).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main({ dir, file }: BuildResult) {
	await install(`href-checker`, PUPPETEER_ENV);
	const relFile = path.relative(dir, file);
	await sh(`href-checker ${relFile} --no-same-site`, {
		output: "stream",
		cwd: dir,
		env: PUPPETEER_ENV,
	});
}
