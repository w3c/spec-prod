// @ts-check
const path = require("path");
const { addPath, exportVariable } = require("@actions/core");
const { env, exit, install, sh } = require("./utils.js");
const { ACTION_DIR, PUPPETEER_ENV } = require("./constants.js");

const PYTHONUSERBASE = path.join(ACTION_DIR, "python_modules");

// @ts-expect-error
if (module === require.main) {
	const toolchain = env("INPUTS_TOOLCHAIN");
	main(toolchain).catch(err => exit(err.message || "Failed", err.code));
}

module.exports = main;
/**
 * @param {"respec" | "bikeshed" | string} toolchain
 */
async function main(toolchain) {
	addPath(path.join(ACTION_DIR, "node_modules", ".bin"));
	addPath(path.join(PYTHONUSERBASE, "bin"));

	switch (toolchain) {
		case "respec": {
			await install("respec", PUPPETEER_ENV);
			break;
		}
		case "bikeshed": {
			await sh(`pip3 install bikeshed --quiet`, {
				output: "stream",
				cwd: ACTION_DIR,
				env: {
					PYTHONUSERBASE,
				},
			});
			exportVariable("PYTHONUSERBASE", PYTHONUSERBASE);
			await sh("bikeshed update", "stream");
			break;
		}
		default: {
			const msg = `Envirnoment variable "INPUTS_TOOLCHAIN" must be either one of "respec" or "bikeshed". found "${toolchain}"`;
			exit(msg, 1);
		}
	}
}
