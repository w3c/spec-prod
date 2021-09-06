import { deepStrictEqual } from "assert";
import { inspect } from "util";
import { exec } from "child_process";
import { createServer } from "http";

import core = require("@actions/core");
import split = require("split2");
import serveStatic = require("serve-static");
import finalhandler = require("finalhandler");

import { ACTION_DIR } from "./constants.js";
import { ExecOptions } from "child_process";
import { Server } from "http";

export function deepEqual(a: unknown, b: unknown) {
	try {
		deepStrictEqual(a, b);
		return true;
	} catch {
		return false;
	}
}

export function env(name: string) {
	const value = process.env[name];
	if (value) return value;
	exit(`env variable \`${name}\` is not set.`);
}

export function exit(message: string, code = 1): never {
	if (code === 0) {
		console.log(message);
	} else {
		console.log(message);
	}
	process.exit(code);
}

export function formatAsHeading(text: string, symbol = "=") {
	const marker = symbol.repeat(Math.max(50, text.length));
	return `${marker}\n${text}:\n${marker}`;
}

/**
 * Locally install a npm package using Yarn.
 */
export function install(name: string | string[], env: ExecOptions["env"] = {}) {
	if (Array.isArray(name)) {
		name = name.join(" ");
	}
	return sh(`yarn add ${name} --silent`, { cwd: ACTION_DIR, env });
}

/**
 * Print print using util.inspect
 */
export function pprint(obj: any) {
	console.log(inspect(obj, false, Infinity, true));
}

export function setOutput<K extends string, V>(key: K, value: V) {
	core.setOutput(key, value);
	return { [key]: value } as { [k in K]: V };
}

type ShOutput = "buffer" | "stream" | "silent";
interface ShOptions extends ExecOptions {
	output?: string;
}
/**
 * Asynchronously run a shell command get its result.
 * @returns stdout
 * @throws {Promise<{ stdout: string, stderr: string, code: number }>}
 */
export async function sh(command: string, options: ShOptions | ShOutput = {}) {
	const { output, ...execOptions } =
		typeof options === "string" ? { output: options } : options;

	const BOLD = "\x1b[1m";
	const RESET = "\x1b[22m";
	if (output !== "silent") {
		console.group(`${BOLD}$ ${command}${RESET}`);
	}

	try {
		return await new Promise<string>((resolve, reject) => {
			let stdout = "";
			let stderr = "";
			const child = exec(command, {
				...execOptions,
				env: { ...process.env, ...execOptions.env },
				encoding: "utf-8",
			});
			child.stdout!.pipe(split()).on("data", chunk => {
				if (output === "stream") console.log(chunk);
				stdout += chunk + "\n";
			});
			child.stderr!.pipe(split()).on("data", chunk => {
				if (output === "stream") console.log(chunk);
				stderr += chunk + "\n";
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

export function yesOrNo(value: string | number | boolean): boolean | undefined {
	const str = String(value).trim();
	if (/^(?:y|yes|true|1|on)$/i.test(str)) {
		return true;
	}
	if (/^(?:n|no|false|0|off)$/i.test(str)) {
		return false;
	}
}

/** A simple HTTP server without all the fancy things. */
export class StaticServer {
	private _server: Server;
	private _port: number = 3000;

	constructor(dir = process.cwd()) {
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

	private _tryStart(port: number) {
		return new Promise((resolve, reject) => {
			this._server.listen(port).on("error", reject).on("listening", resolve);
		});
	}

	stop() {
		return new Promise<void>(resolve => this._server.close(err => resolve()));
	}

	get url() {
		return new URL(`http://localhost:${this._port}`);
	}

	get port() {
		return this._port;
	}
}

export type ThenArg<T> = T extends PromiseLike<infer U> ? U : T;
