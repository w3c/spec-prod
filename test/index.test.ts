/**
 * This tries to mimic the behaviour of action.yml running on GitHub.
 * Useful during development, until we add proper tests.
 *
 * Run this file in a local GitHub repo, and change inputs as needed.
 */
import { devNull } from "node:os";
import { createRequire } from "node:module";
import { formatAsHeading, pprint } from "../src/utils.ts";

let SILENT_CHILD = !true;

Object.assign(process.env, {
	GITHUB_ENV: devNull,
	GITHUB_PATH: devNull,
});

const console = global.console;
if (SILENT_CHILD) {
	global.console = new Proxy(global.console, {
		get(target, prop) {
			// @ts-expect-error
			if (typeof target[prop] === "function") {
				return () => {};
			}
			throw new Error("Not implemented.");
		},
	});
}

export interface Outputs {
	prepare: Awaited<ReturnType<typeof import("../src/prepare.ts").default>>;
	setup: Awaited<ReturnType<typeof import("../src/setup.ts").default>>;
	build: Awaited<ReturnType<typeof import("../src/build.ts").default>>;
}
const outputs: Partial<Outputs> = {};
type AsyncFn = (outputs: Partial<Outputs>) => Promise<object | undefined>;
const run = (fn: AsyncFn) => async () => {
	await Promise.resolve();
	console.log(formatAsHeading(fn.name, "+"));
	const res = await fn(outputs);
	console.log(res);
	console.log();
	// @ts-ignore
	outputs[fn.name as keyof Outputs] = res;
};

const require = createRequire(import.meta.url);
Promise.resolve()
	.then(run(require("./prepare.test.ts").default))
	.then(run(require("./setup.test.ts").default))
	.then(run(require("./validate-input-markup.test.ts").default))
	.then(run(require("./build.test.ts").default))
	.then(run(require("./validate-links.test.ts").default))
	.then(run(require("./validate-markup.test.ts").default))
	.then(run(require("./validate-webidl.test.ts").default))
	.then(run(require("./validate-pubrules.test.ts").default))
	.then(run(require("./deploy-gh-pages.test.ts").default))
	.then(() => {
		console.log();
		console.log(formatAsHeading("OUTPUTS", "#"));
		pprint(outputs);
	})
	.catch(err => {
		console.error(err);
		process.exit(1);
	});
