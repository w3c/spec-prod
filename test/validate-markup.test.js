// @ts-check
const main = require("../src/validate-markup.js");

module.exports = validateMarkup;
/** @param {import("./index.test.js").Output} outputs */
async function validateMarkup(outputs) {
	const { markup: shouldValidate = false } = outputs?.prepare?.validate || {};
	if (shouldValidate === false) {
		return;
	}

	const { dir = process.cwd(), file = "index.html" } =
		outputs?.build?.w3c || {};

	return await main({ dir, file });
}
