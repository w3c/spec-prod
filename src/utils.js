// @ts-check
const { inspect } = require("util");
const { exec } = require("child_process");
const { createServer } = require("http");

const core = require("@actions/core");
const split = require("split2");
const serveStatic = require("serve-static");
const finalhandler = require("finalhandler");

const { ACTION_DIR } = require("./constants.js");

/**
 * Get env variable value
 * @param {string} name name of env variable
 * @throws if env variable is not set
 */
function env(name) {
	const value = process.env[name];
	if (value) return value;
	exit(`env variable \`${name}\` is not set.`);
}

/**
 * @param {string} message
 * @param {number} [code]
 * @returns {never}
 */
function exit(message, code = 1) {
	if (code === 0) {
		console.log(message);
	} else {
		console.log(message);
	}
	process.exit(code);
}

/**
 * @param {string} text
 */
function formatAsHeading(text, symbol = "=") {
	const marker = symbol.repeat(Math.max(50, text.length));
	return `${marker}\n${text}:\n${marker}`;
}

/**
 * Locally install a npm package using Yarn.
 * @param {string | string[]} name
 * @param {import("child_process").ExecOptions["env"]} env
 */
function install(name, env = {}) {
	if (Array.isArray(name)) {
		name = name.join(" ");
	}
	return sh(`yarn add ${name} --silent`, { cwd: ACTION_DIR, env });
}

/**
 * Print print using util.inspect
 * @param {any} obj
 */
function pprint(obj) {
	console.log(inspect(obj, false, Infinity, true));
}

/** @type {<K extends string, V>(key: K, value: V) => { [k in K]: V }} */
function setOutput(key, value) {
	core.setOutput(key, value);
	// @ts-expect-error
	return { [key]: value };
}

/**
 * Asynchronously run a shell command get its result.
 * @param {string} command
 * @param {Output | Options} [options]
 * @typedef {"buffer" | "stream" | "silent"} Output
 * @typedef {{output?: Output} & import("child_process").ExecOptions} Options
 * @returns {Promise<string>} stdout
 * @throws {Promise<{ stdout: string, stderr: string, code: number }>}
 */
async function sh(command, options = {}) {
	const { output, ...execOptions } =
		typeof options === "string" ? { output: options } : options;

	const BOLD = "\x1b[1m";
	const RESET = "\x1b[22m";
	if (output !== "silent") {
		console.group(`${BOLD}$ ${command}${RESET}`);
	}

	try {
		return await new Promise((resolve, reject) => {
			let stdout = "";
			let stderr = "";
			const child = exec(command, {
				...execOptions,
				env: { ...process.env, ...execOptions.env },
				encoding: "utf-8",
			});
			child.stdout.pipe(split()).on("data", chunk => {
				if (output === "stream") console.log(chunk);
				stdout += chunk;
			});
			child.stderr.pipe(split()).on("data", chunk => {
				if (output === "stream") console.log(chunk);
				stderr += chunk;
			});
			child.on("exit", code => {
				stdout = stdout.trim();
				stderr = stderr.trim();
				if (output === "buffer") {
					if (stdout) console.log(stdout);
					if (stderr) console.error(stderr);
				}
				code === 0 ? resolve(stdout) : reject({ stdout, stderr, code });
			});
		});
	} finally {
		if (output !== "silent") {
			console.groupEnd();
		}
	}
}

function yesOrNo(value) {
	const str = String(value).trim();
	if (/^(?:y|yes|true|1|on)$/i.test(str)) {
		return true;
	}
	if (/^(?:n|no|false|0|off)$/i.test(value)) {
		return false;
	}
}

/** A simple HTTP server without all the fancy things. */
class StaticServer {
	/** @param {string} dir */
	constructor(dir) {
		const serve = serveStatic(dir);
		this._server = createServer((req, res) => {
			// @ts-expect-error
			serve(req, res, finalhandler(req, res));
		});
	}

	async start() {
		for (this._port = 3000; this._port < 9000; this._port++) {
			try {
				await this._tryStart(this._port);
				return this;
			} catch (error) {
				await this.stop();
				if (error.code !== "EADDRINUSE") {
					throw error;
				}
			}
		}
		throw new Error("Failed to start static server.");
	}

	/**
	 * @private
	 * @param {number} port
	 */
	_tryStart(port) {
		return new Promise((resolve, reject) => {
			this._server.listen(port).on("error", reject).on("listening", resolve);
		});
	}

	stop() {
		return new Promise(resolve => this._server.close(err => resolve()));
	}

	get url() {
		return `http://localhost:${this._port}`;
	}
}

module.exports = {
	env,
	exit,
	formatAsHeading,
	install,
	pprint,
	setOutput,
	sh,
	yesOrNo,
	StaticServer,
};
