// @ts-check

module.exports = build;
async function build(outputs = {}) {
	const build = outputs?.prepare?.build || {};
	const toolchain = build.toolchain || "respec";
	const source = build.source || "index.html";
	const flags = build.flags || ["-e"];
	const configOverride = build.configOverride || { w3c: null, gh: null };

	return await require("../src/build.js")(
		toolchain,
		source,
		flags,
		configOverride,
	);
}
