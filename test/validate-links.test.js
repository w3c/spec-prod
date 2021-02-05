// @ts-check

module.exports = validateLinks;
async function validateLinks(outputs = {}) {
	const validate = outputs?.prepare?.all?.validate;
	if (validate && validate.links === false) {
		return;
	}

	const build = outputs?.build?.output || {};
	const outputDir = build.dir || ".";

	return await require("../src/validate-links.js")(outputDir);
}
