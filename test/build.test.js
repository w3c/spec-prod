// @ts-check
const main = require("../src/build.js");

module.exports = build;
/** @param {import("./index.test.js").Output} outputs */
async function build(outputs) {
	const {
		toolchain = "respec",
		source = "index.html",
		flags = ["-e"],
		configOverride = { w3c: null, gh: null },
	} = outputs?.prepare?.build || {};

	return await main(toolchain, source, flags, configOverride);
}
