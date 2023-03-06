import main from "../src/validate-input-markup.js";
import { Outputs } from "./index.test.js";

export default async function validateInputMarkup(outputs: Outputs) {
	const { input_markup: shouldValidate = false } = outputs?.prepare?.validate || {};
	if (shouldValidate === false) {
		return;
	}

	const { source = "index.html" } =
		outputs?.build?.w3c || {};

	return await main({ source });
}
