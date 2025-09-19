import main from "../src/setup.js";
import type { Outputs } from "./index.test.js";

export default async function setup(outputs: Outputs) {
	const { toolchain = "respec" } = outputs?.prepare?.build || {};
	return await main(toolchain);
}
