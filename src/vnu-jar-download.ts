import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import os from "node:os";
import https from "node:https";
import { IncomingMessage, ClientRequest } from "node:http";
import crypto from "node:crypto";

const BASE_URL =
	"https://github.com/validator/validator/releases/download/latest";
const JAR_URL = `${BASE_URL}/vnu.jar`;
const SHA1_URL = `${BASE_URL}/vnu.jar.sha1`;

export interface DownloadOptions {
	log?: (msg: string) => void;
	maxRetries?: number;
	retryDelayMs?: number;
}

function getCacheDir(): string {
	const platform = os.platform();
	let root: string;
	if (platform === "win32") {
		root =
			process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
	} else if (platform === "darwin") {
		root = path.join(os.homedir(), "Library", "Caches");
	} else {
		root = process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
	}
	return path.join(root, "vnu", "latest");
}

async function sha1OfFile(file: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash("sha1");
		const stream = fsSync.createReadStream(file);
		stream.on("data", (chunk: Buffer | string) => {
			hash.update(chunk as Buffer);
		});
		stream.on("end", () => resolve(hash.digest("hex")));
		stream.on("error", reject);
	});
}

async function downloadWithRetry(
	url: string,
	dest: string,
	headers?: Record<string, string>,
	options: DownloadOptions = {},
): Promise<IncomingMessage> {
	const { maxRetries = 3, retryDelayMs = 500 } = options;
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			await fs.mkdir(path.dirname(dest), { recursive: true });
			return await new Promise<IncomingMessage>((resolve, reject) => {
				const file = fsSync.createWriteStream(dest);
				const req: ClientRequest = https.get(
					url,
					{ headers },
					(res: IncomingMessage) => {
						if (res.statusCode && res.statusCode >= 400) {
							reject(
								new Error(
									`Download failed: ${res.statusCode} ${res.statusMessage}`,
								),
							);
							return;
						}
						if (res.statusCode === 304) {
							file.close();
							resolve(res);
							return;
						}
						res.pipe(file);
						file.on("finish", () => file.close(() => resolve(res)));
						file.on("error", reject);
					},
				);
				req.on("error", reject);
			});
		} catch (err) {
			if (attempt < maxRetries) {
				const delay = retryDelayMs * 2 ** attempt;
				await new Promise(res => setTimeout(res, delay));
			} else {
				throw err;
			}
		}
	}
	throw new Error("Unreachable code in downloadWithRetry");
}

export async function ensureVnuJar(
	options: DownloadOptions = {},
): Promise<string> {
	const { log = () => {}, maxRetries = 3, retryDelayMs = 500 } = options;
	const cacheDir = getCacheDir();
	const jarPath = path.join(cacheDir, "vnu.jar");
	const shaPath = path.join(cacheDir, "vnu.jar.sha1");
	const metaPath = path.join(cacheDir, "vnu.meta.json");
	let expectedSha: string | null = null;
	let etag: string | undefined;
	let lastModified: string | undefined;
	try {
		const meta = JSON.parse(await fs.readFile(metaPath, "utf8")) as {
			etag?: string;
			lastModified?: string;
			sha?: string;
		};
		etag = meta.etag;
		lastModified = meta.lastModified;
		expectedSha = meta.sha ?? null;
		if (expectedSha && fsSync.existsSync(jarPath)) {
			const actualSha = await sha1OfFile(jarPath);
			if (actualSha === expectedSha) {
				log("✅ vnu.jar cache hit and valid");
				return jarPath;
			}
			log("⚠️ Cached vnu.jar checksum mismatch, redownloading...");
		}
	} catch {}
	const shaHeaders: Record<string, string> = {};
	if (etag) shaHeaders["If-None-Match"] = etag;
	if (lastModified) shaHeaders["If-Modified-Since"] = lastModified;
	await downloadWithRetry(SHA1_URL, shaPath, shaHeaders, {
		maxRetries,
		retryDelayMs,
	});
	expectedSha = (await fs.readFile(shaPath, "utf8")).trim();
	log("⬇️ Downloading vnu.jar...");
	const res = await downloadWithRetry(
		JAR_URL,
		jarPath,
		{},
		{ maxRetries, retryDelayMs },
	);
	const newEtag = res.headers.etag;
	const newLastModified = res.headers["last-modified"];
	await fs.writeFile(
		metaPath,
		JSON.stringify(
			{ etag: newEtag, lastModified: newLastModified, sha: expectedSha },
			null,
			2,
		),
		"utf8",
	);
	const actualSha = await sha1OfFile(jarPath);
	if (actualSha !== expectedSha) {
		await fs.unlink(jarPath).catch(() => {});
		throw new Error(
			`Checksum mismatch for vnu.jar: expected ${expectedSha}, got ${actualSha}`,
		);
	}
	log("✅ vnu.jar ready");
	return jarPath;
}
