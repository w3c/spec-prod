import * as path from "path";
import main from "../src/validate-links.js";
import { Outputs } from "./index.test.js";

export default async function validateLinks(outputs: Outputs) {
	const { links: shouldValidate = false } = outputs?.prepare?.validate || {};
	if (shouldValidate === false) {
		return;
	}

	const cwd = process.cwd();
	const { dir = cwd, file = path.join(cwd, "index.html") } =
		outputs?.build?.w3c || {};

	return await main({ dir, file });
}
