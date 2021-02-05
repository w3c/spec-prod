// @ts-check
/**
 * This tries to mimic the behaviour of action.yml running on GitHub.
 * Useful during development, until we add proper tests.
 *
 * Run this file in a local GitHub repo, and change inputs as needed.
 */
const { formatAsHeading } = require("../src/utils.js");
const prepare = require("./prepare.test.js");
const setup = require("./setup.test.js");
const build = require("./build.test.js");
const validateLinks = require("./validate-links.test.js");
const validateMarkup = require("./validate-markup.test.js");
const deployGhPages = require("./deploy-gh-pages.test.js");

const SILENT_CHILD = !true;
Object.assign(process.env, {
	GITHUB_ENV: "/dev/null",
	GITHUB_PATH: "/dev/null",
});

const console = global.console;
if (SILENT_CHILD) {
	global.console = new Proxy(global.console, {
		get(target, prop) {
			if (typeof target[prop] === "function") {
				return () => {};
			}
			throw new Error("Not implemented.");
		},
	});
}

const outputs = {};
/**
 * @typedef {(arg?: any) => Promise<Record<string, any> | void>} AsyncFn
 * @param {AsyncFn} fn
 */
const run = fn => (...args) => {
	return Promise.resolve()
		.then(() => console.log(formatAsHeading(fn.name, "#")))
		.then(async () => {
			const res = await fn(outputs);
			console.log(res);
			console.log();
			outputs[fn.name] = res;
			return res;
		});
};

Promise.resolve()
	.then(run(prepare))
	.then(run(setup))
	.then(run(build))
	// .then(run(validateLinks))
	// .then(run(validateMarkup))
	// .then(run(deployGhPages))
	.then(() => {
		console.log();
		console.log(formatAsHeading("OUTPUTS", "#"));
		console.log(outputs);
	})
	.catch(err => {
		console.error(err);
		process.exit(1);
	});
