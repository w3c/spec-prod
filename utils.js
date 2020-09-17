// @ts-check
const https = require("https");
const { inspect } = require("util");
const { exec } = require("child_process");

/**
 * @param {string} path
 */
function addPath(path) {
	console.log(`::add-path::${path}`);
}

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
function formatAsHeading(text) {
	const marker = "=".repeat(Math.max(50, text.length));
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
 * Send a HTTP request.
 * @param {URL} url
 * @param {import('https').RequestOptions & { body?: string }} options
 * @returns {Promise<any>}
 */
function request(url, { body, ...options } = {}) {
	console.log(`📡 Request: ${url}`);
	return new Promise((resolve, reject) => {
		const req = https.request(url, options, res => {
			const chunks = [];
			res.on("data", data => chunks.push(data));
			res.on("end", () => {
				const body = Buffer.concat(chunks).toString();
				const contentType = res.headers["content-type"] || "";
				contentType.includes("application/json")
					? resolve(JSON.parse(body))
					: resolve(body);
			});
		});
		req.on("error", reject);
		if (body) req.write(body);
		req.end();
	});
}

/**
 * @param {string} key
 * @param {string} value
 */
function setEnv(key, value) {
	console.log(`::set-env name=${key}::${value}`);
}

/**
 * @param {string} key
 * @param {string|boolean|null|number} value
 */
function setOutput(key, value) {
	console.log(`::set-output name=${key}::${value}`);
}

/**
 * Asynchronously run a shell command get its result.
 * @param {string} command
 * @param {"buffer"|"stream"|"silent"} [output]
 * @returns {Promise<string>}
 * @throws {Promise<{ stdout: string, stderr: string, code: number }>}
 */
function sh(command, output) {
	const BOLD = "\x1b[1m";
	const RESET = "\x1b[22m";
	if (output !== "silent") {
		console.group(`${BOLD}$ ${command}${RESET}`);
	}

	try {
		return new Promise((resolve, reject) => {
			let stdout = "";
			let stderr = "";
			const child = exec(command, { encoding: "utf-8" });
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
	addPath,
	env,
	exit,
	formatAsHeading,
	pprint,
	request,
	setEnv,
	setOutput,
	sh,
	yesOrNo,
};
