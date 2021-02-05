// @ts-check
const path = require("path");
const { inspect } = require("util");
const { exec } = require("child_process");
const core = require("@actions/core");

const ACTION_DIR = path.join(__dirname, "..");

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
 * Print print using util.inspect
 * @param {any} obj
 */
function pprint(obj) {
	console.log(inspect(obj, false, Infinity, true));
}

/**
 * @param {string} key
 * @param {string|boolean|null|number|Record<string, any>} value
 */
function setOutput(key, value) {
	core.setOutput(key, value);
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
function sh(command, options = {}) {
	const { output, ...execOptions } =
		typeof options === "string" ? { output: options } : options;

	const BOLD = "\x1b[1m";
	const RESET = "\x1b[22m";
	if (output !== "silent") {
		console.group(`${BOLD}$ ${command}${RESET}`);
	}

	try {
		return new Promise((resolve, reject) => {
			let stdout = "";
			let stderr = "";
			const child = exec(command, {
				...execOptions,
				env: { ...process.env, ...execOptions.env },
				encoding: "utf-8",
			});
			child.stdout.on("data", chunk => {
				if (output === "stream") process.stdout.write(chunk);
				stdout += chunk;
			});
			child.stderr.on("data", chunk => {
				if (output === "stream") process.stderr.write(chunk);
				stderr += chunk;
			});
			child.on("exit", code => {
				stdout = stdout.trim();
				stderr = stderr.trim();
				if (output === "buffer") {
					if (stdout) console.log(stdout);
					if (stderr) console.error(stderr);
				}
				if (output && output !== "silent") {
					console.log();
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

module.exports = {
	ACTION_DIR,
	env,
	exit,
	formatAsHeading,
	pprint,
	setOutput,
	sh,
	yesOrNo,
};
