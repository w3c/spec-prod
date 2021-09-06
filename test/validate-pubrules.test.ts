import main from "../src/validate-pubrules.js";
import { Outputs } from "./index.test.js";

export default async function validatePubrules(outputs: Outputs) {
	const { pubrules: shouldValidate = false } = outputs?.prepare?.validate || {};
	if (shouldValidate === false) {
		return;
	}

	const { dest = process.cwd() + ".common", file = "index.html" } =
		outputs?.build?.w3c || {};

	return await main({ dest, file });
}
