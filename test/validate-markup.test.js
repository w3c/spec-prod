// @ts-check

module.exports = validateMarkup;
async function validateMarkup(outputs = {}) {
	const validate = outputs?.prepare?.validate;
	if (validate && validate.markup === false) {
		return;
	}

	const build = outputs?.build?.w3c || {
		dir: process.cwd(),
		file: "index.html",
	};

	return await require("../src/validate-markup.js")(build);
}
