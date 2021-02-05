// @ts-check

module.exports = validateMarkup;
async function validateMarkup(output) {
	const outputDir = ".";
	return await require("../src/validate-markup.js")(outputDir);
}
