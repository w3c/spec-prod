import main from "../src/validate-idl.js";
import { Outputs } from "./index.test.js";

export default async function validateIdl(outputs: Outputs) {
	const { idl: shouldValidate = false } = outputs?.prepare?.validate || {};
	if (shouldValidate === false) {
		return;
	}

	const { dest = process.cwd() + ".common", file = "index.html" } =
		outputs?.build?.w3c || {};

	return await main({ dest, file });
}
