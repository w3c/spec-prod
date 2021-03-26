import { env, exit, install, sh, yesOrNo } from "./utils.js";
import { PUPPETEER_ENV } from "./constants.js";

import { BuildResult } from "./build.js";
type Input = Pick<BuildResult, "dest" | "file">;

if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_LINKS")) === false) {
		exit("Skipped", 0);
	}
	exit("Link validator is currently disabled due to some bugs.", 0);

	const input: Input = JSON.parse(env("OUTPUTS_BUILD"));
	main(input).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main({ dest, file }: Input) {
	await install(`href-checker`, PUPPETEER_ENV);
	await sh(`href-checker ${file} --no-same-site`, {
		output: "stream",
		cwd: dest,
		env: PUPPETEER_ENV,
	});
}
