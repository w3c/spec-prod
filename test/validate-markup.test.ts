import main from "../src/validate-markup.ts";
import type { Outputs } from "./index.test.ts";

export default async function validateMarkup(outputs: Outputs) {
	const { markup: shouldValidate = false } = outputs?.prepare?.validate || {};
	if (shouldValidate === false) {
		return;
	}

	const { dest = process.cwd() + ".common", file = "index.html" } =
		outputs?.build?.w3c || {};

	return await main({ dest, file });
}
