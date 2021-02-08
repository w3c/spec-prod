// @ts-check

module.exports = setup;
async function setup(outputs = {}) {
	const build = outputs?.prepare?.build || {};
	const toolchain = build.toolchain || "respec";

	return await require("../src/setup.js")(toolchain);
}
