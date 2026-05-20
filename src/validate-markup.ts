import { createRequire } from "node:module";
import { env, exit, install, sh, yesOrNo } from "./utils.ts";
import { ensureVnuJar } from "./vnu-jar-download.ts";

import type { BuildResult } from "./build.ts";
type Input = Pick<BuildResult, "dest" | "file">;

const require = createRequire(import.meta.url);

if (import.meta.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_MARKUP")) === false) {
		exit("Skipped", 0);
	}

	const input: Input = JSON.parse(env("OUTPUTS_BUILD"));
	main(input).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main({ dest, file }: Input) {
	console.log(`Validating ${file}...`);
	const vnuJar = await ensureVnuJar({
		log: console.log,
		maxRetries: 5,
		retryDelayMs: 500,
	});

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
