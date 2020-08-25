// @ts-check
const { execSync } = require("child_process");

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
 */
function exit(message, code = 1) {
	if (code === 0) {
		console.log(message);
	} else {
		console.error(message);
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
 * Synchronously run a shell command get its result.
 * @param {string} command
 * @param {object} [options]
 * @param {boolean} [options.output] show stdout
 * @param {string} [options.input] stdin
 */
function sh(command, { output = false, input = "" } = {}) {
	const BOLD = "\x1b[1m";
	const RESET = "\x1b[22m";
	try {
		console.group(`\n${BOLD}$ ${command}${RESET}`);
		const stdout = execSync(command, { encoding: "utf-8", input }).trim();
		if (output && stdout) console.log(stdout);
		return stdout;
	} finally {
		console.groupEnd();
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
	setEnv,
	setOutput,
	sh,
	yesOrNo,
};
