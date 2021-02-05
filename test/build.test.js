// @ts-check

module.exports = build;
async function build(outputs = {}) {
	const build = outputs?.prepare?.all?.build || {};
	const toolchain = build.toolchain || "respec";
	const source = build.source || "index.html";
	const flags = build.flags || ["-e"];

	return await require("../src/build.js")(toolchain, source, flags);
}
