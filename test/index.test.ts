/**
 * This tries to mimic the behaviour of action.yml running on GitHub.
 * Useful during development, until we add proper tests.
 *
 * Run this file in a local GitHub repo, and change inputs as needed.
 */
import { platform } from "os";
import { formatAsHeading, pprint, ThenArg } from "../src/utils.js";

let SILENT_CHILD = !true;

// TODO: use `os.devNull` when switching to Node 16.3+
const devNull = platform() === "win32" ? String.raw`\\.\nul` : "/dev/null";
Object.assign(process.env, {
	GITHUB_ENV: devNull,
	GITHUB_PATH: devNull,
});

const console = global.console;
if (SILENT_CHILD) {
	global.console = new Proxy(global.console, {
		get(target, prop) {
			// @ts-ignore
			if (typeof target[prop] === "function") {
				return () => {};
			}
			throw new Error("Not implemented.");
		},
	});
}

export interface Outputs {
	prepare: ThenArg<ReturnType<typeof import("../src/prepare.js").default>>;
	setup: ThenArg<ReturnType<typeof import("../src/setup.js").default>>;
	build: ThenArg<ReturnType<typeof import("../src/build.js").default>>;
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

Promise.resolve()
	.then(run(require("./prepare.test.js").default))
	.then(run(require("./setup.test.js").default))
	.then(run(require("./build.test.js").default))
	.then(run(require("./validate-links.test.js").default))
	.then(run(require("./validate-markup.test.js").default))
	.then(run(require("./validate-webidl.test.js").default))
	.then(run(require("./validate-pubrules.test.js").default))
	.then(run(require("./deploy-gh-pages.test.js").default))
	.then(() => {
		console.log();
		console.log(formatAsHeading("OUTPUTS", "#"));
		pprint(outputs);
	})
	.catch(err => {
		console.error(err);
		process.exit(1);
	});
