import main from "../src/validate-markup.js";
import { Outputs } from "./index.test.js";

export default async function validateMarkup(outputs: Outputs) {
	const { markup: shouldValidate = false } = outputs?.prepare?.validate || {};
	if (shouldValidate === false) {
		return;
	}

	const { dir: outputDir = "." } = outputs?.build?.w3c || {};

	return await main(outputDir);
}
