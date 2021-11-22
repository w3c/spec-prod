import { env } from "../src/utils.js";
import main from "../src/validate-pubrules.js";
import { Outputs } from "./index.test.js";

export default async function validatePubrules(outputs: Outputs) {
	const { pubrules: shouldValidate = false } = outputs?.prepare?.validate || {};
	if (shouldValidate === false) {
		return;
	}

	const { dest = process.cwd() + ".w3c", file = "index.html" } =
		outputs?.build?.w3c || {};
	const apiKey = env("W3C_API_KEY");
	return await main({ dest, file }, apiKey);
}
