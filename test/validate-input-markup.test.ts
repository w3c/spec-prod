import main from "../src/validate-input-markup.ts";
import type { Outputs } from "./index.test.ts";

export default async function validateInputMarkup(outputs: Outputs) {
	const { input_markup: shouldValidate = false } =
		outputs?.prepare?.validate || {};
	if (shouldValidate === false) {
		return;
	}

	const { source } = outputs?.prepare?.build || { source: "index.html" };

	return await main({ source });
}
