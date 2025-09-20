import main from "../src/validate-pubrules.ts";
import type { Outputs } from "./index.test.ts";

export default async function validatePubrules(outputs: Outputs) {
	const { pubrules: shouldValidate = false } = outputs?.prepare?.validate || {};
	if (shouldValidate === false) {
		return;
	}

	const { dest = process.cwd() + ".w3c", file = "index.html" } =
		outputs?.build?.w3c || {};
	return await main({ dest, file });
}
