// @ts-check
const { env, exit, setOutput, sh } = require("./utils.js");

// @ts-expect-error
if (module === require.main) {
	const toolchain = env("INPUTS_TOOLCHAIN");
	const source = env("INPUTS_SOURCE");
	main(toolchain, source).catch(err => exit(err.message || "Failed", err.code));
}

module.exports = main;
/**
 * @param {"respec" | "bikeshed" | string} toolchain
 * @param {string} source
 */
async function main(toolchain, source) {
	// Please do not rely on this value. If you would like this to be available as
	// an action output, file an issue.
	const outputFile = source + ".built.html";

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
