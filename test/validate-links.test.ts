import main from "../src/validate-links.js";
import type { Outputs } from "./index.test.js";

export default async function validateLinks(outputs: Outputs) {
	const { links: shouldValidate = false } = outputs?.prepare?.validate || {};
	if (shouldValidate === false) {
		return;
	}

	const { dest = process.cwd() + ".common", file = "index.html" } =
		outputs?.build?.w3c || {};

	return await main({ dest, file });
}
