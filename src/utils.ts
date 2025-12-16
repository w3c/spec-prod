import path from "node:path";
import { deepStrictEqual } from "node:assert";
import { inspect } from "node:util";
import { exec, type ExecOptions } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";

import core from "@actions/core";
import finalhandler from "finalhandler";
import serveStatic from "serve-static";
import split from "split2";

import { ACTION_DIR } from "./constants.ts";

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
		console.error(message);
		core.error(message);
	}
	process.exit(code);
}

export function formatAsHeading(text: string, symbol = "=") {
	const marker = symbol.repeat(Math.max(50, text.length));
	return `${marker}\n${text}:\n${marker}`;
}

/**
 * Locally install a npm package using pnpm.
 */
export async function install(name: string, env: ExecOptions["env"] = {}) {
	const [packageJson, pnpmLock] = await Promise.all([
		readFile(path.join(ACTION_DIR, "package.json")),
		readFile(path.join(ACTION_DIR, "pnpm-lock.yaml")),
	]);
	const output = await sh(`pnpm add ${name}`, { cwd: ACTION_DIR, env });
	// Restore as if `pnpm add --no-save` was supported.
	// https://github.com/pnpm/pnpm/issues/1237
	await Promise.all([
		writeFile(path.join(ACTION_DIR, "package.json"), packageJson),
		writeFile(path.join(ACTION_DIR, "pnpm-lock.yaml"), pnpmLock),
	]);
	const pkgName = name.replace(/@.+/, "");
	const re = new RegExp(String.raw`\+ (${pkgName})\s(.+)$`);
	const versionLine = output.split("\n").find(line => re.test(line));
	if (versionLine) {
		console.log(versionLine);
	}
	return output;
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
	output?: ShOutput;
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
				if (code === 0) {
					resolve(stdout);
				} else {
					const message = `Command \`${command}\` failed with exit code: ${code}.`;
					reject({ message, stdout, stderr, code });
				}
			});
		});
	} finally {
		if (output !== "silent") {
			console.groupEnd();
		}
	}
}

export function unique<T>(items: T[], key?: (item: T) => string | number) {
	if (!key) {
		return [...new Set(items)];
	}

	const alreadyHas = new Set<ReturnType<typeof key>>();
	const uniqueItems: T[] = [];
	for (const item of items) {
		const k = key(item);
		if (!alreadyHas.has(k)) {
			uniqueItems.push(item);
			alreadyHas.add(k);
		}
	}
	return uniqueItems;
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
}
