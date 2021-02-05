// @ts-check

module.exports = setup;
async function setup(outputs = {}) {
	const output = outputs?.prepare?.all?.build || {};

	const toolchain = output.toolchain || "respec";

	return await require("../src/setup.js")(toolchain);
}
