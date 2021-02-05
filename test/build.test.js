// @ts-check

module.exports = build;
async function build(outputs = {}) {
	const output = outputs?.prepare?.all?.build || {};

	const toolchain = output.toolchain || "respec";
	const source = output.source || "index.html";
	const flags = output.flags || ["-e"];

	return await require("../src/build.js")(toolchain, source, flags);
}
