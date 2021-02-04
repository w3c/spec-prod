// @ts-check
const { env, exit, setOutput, sh } = require("./utils.js");

const toolchain = env("INPUTS_TOOLCHAIN");
const source = env("INPUTS_SOURCE");

// Please do not rely on this value. If you would like this to be available as
// an action output, file an issue.
const outputFile = source + ".built.html";

(async () => {
	switch (toolchain) {
		case "respec":
			console.log(`Converting ReSpec document '${source}' to HTML...`);
			await sh(
				`respec -s "${source}" -o "${outputFile}" --verbose --timeout 20`,
				"stream",
			);
			break;
		case "bikeshed":
			console.log(`Converting Bikeshed document '${source}' to HTML...`);
			await sh(`bikeshed spec "${source}" "${outputFile}"`, "stream");
			break;
		default:
			throw new Error(`Unknown "TOOLCHAIN": "${toolchain}"`);
	}

	return setOutput("output", outputFile);
}
})()
	.then(() => setOutput("output", outputFile))
	.catch(err => exit(err.message || "Failed", err.code));
