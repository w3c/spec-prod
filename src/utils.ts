import path from "node:path";
import { deepStrictEqual } from "node:assert";
import { inspect } from "node:util";
import { exec, type ExecOptions } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { createInterface } from "node:readline";
import type { Readable } from "node:stream";

import * as core from "@actions/core";
import finalhandler from "finalhandler";
import serveStatic from "serve-static";

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

interface ShOptions extends ExecOptions {
	silent?: boolean;
}
/**
 * Asynchronously run a shell command get its result.
 * @returns stdout
 * @throws {Promise<{ stdout: string, stderr: string, code: number }>}
 */
export async function sh(
	command: string,
	{ silent, ...execOptions }: ShOptions = {},
) {
	const title = `$ ${command}`;
	let isGroupOpen = false;
	const openGroup = () => {
		if (!isGroupOpen) core.startGroup(title);
		isGroupOpen = true;
	};
	// Show what's running, even if it's quiet for long (or hangs).
	const groupTimer = silent ? undefined : setTimeout(openGroup, 200);

	try {
		return await new Promise<string>((resolve, reject) => {
			let stdout = "";
			let stderr = "";
			const child = exec(command, {
				...execOptions,
				env: { ...process.env, ...execOptions.env },
				encoding: "utf-8",
			});
			const printLine = (line: string) => {
				if (!silent) {
					openGroup();
					console.log(line);
				}
			};
			readLines(child.stdout!, line => {
				printLine(line);
				stdout += line + "\n";
			});
			readLines(child.stderr!, line => {
				printLine(line);
				stderr += line + "\n";
			});
			child.on("close", code => {
				stdout = stdout.trim();
				stderr = stderr.trim();
				if (code === 0) {
					resolve(stdout);
				} else {
					const message = `Command \`${command}\` failed with exit code: ${code}.`;
					reject({ message, stdout, stderr, code });
				}
			});
		});
	} finally {
		clearTimeout(groupTimer);
		if (isGroupOpen) {
			core.endGroup();
		} else if (!silent) {
			console.log(`  ${title}`);
		}
	}
}

function readLines(input: Readable, onLine: (line: string) => void) {
	createInterface({ input, crlfDelay: Infinity }).on("line", onLine);
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
