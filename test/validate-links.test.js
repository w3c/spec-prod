// @ts-check

module.exports = validateLinks;
async function validateLinks(output) {
	const outputDir = ".";
	return await require("../src/validate-links.js")(outputDir);
}
