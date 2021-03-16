// @ts-check

module.exports = validateLinks;
async function validateLinks(outputs = {}) {
	const validate = outputs?.prepare?.validate;
	if (validate && validate.links === false) {
		return;
	}

	const build = outputs?.build?.w3c || {
		dir: process.cwd(),
		file: "index.html",
	};

	return await require("../src/validate-links.js")(build);
}
