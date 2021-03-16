// @ts-check
const main = require("../src/setup.js");

module.exports = setup;
/** @param {import("./index.test.js").Output} outputs */
async function setup(outputs) {
	const { toolchain = "respec" } = outputs?.prepare?.build || {};
	return await main(toolchain);
}
