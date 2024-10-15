import * as path from "path";
import { addPath, exportVariable } from "@actions/core";
import { env, exit, install, sh } from "./utils.js";
import { ACTION_DIR, PUPPETEER_ENV } from "./constants.js";

const PYTHONUSERBASE = path.join(ACTION_DIR, "python_modules");

if (module === require.main) {
	const toolchain = env("INPUTS_TOOLCHAIN");
	main(toolchain).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main(toolchain: "respec" | "bikeshed" | string) {
	addPath(path.join(ACTION_DIR, "node_modules", ".bin"));
	addPath(path.join(PYTHONUSERBASE, "bin"));

	switch (toolchain) {
		case "respec": {
			await install("respec", PUPPETEER_ENV);
			await sh("respec --version", "buffer");
			break;
		}
		case "bikeshed": {
			await sh("pip3 --version", "buffer");
			await sh(`pipx install bikeshed --quiet`, {
				output: "stream",
				cwd: ACTION_DIR,
				env: {
					PYTHONUSERBASE,
				},
			});
			exportVariable("PYTHONUSERBASE", PYTHONUSERBASE);
			await sh("bikeshed update", "stream");
			await sh("pipx list --short | grep -i bikeshed", "buffer");
			break;
		}
		default: {
			const msg = `Environment variable "INPUTS_TOOLCHAIN" must be either one of "respec" or "bikeshed". found "${toolchain}"`;
			exit(msg, 1);
		}
	}
}
