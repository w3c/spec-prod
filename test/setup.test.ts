import main from "../src/setup.ts";
import type { Outputs } from "./index.test.ts";

export default async function setup(outputs: Outputs) {
	const { toolchain = "respec" } = outputs?.prepare?.build || {};
	return await main(toolchain);
}
