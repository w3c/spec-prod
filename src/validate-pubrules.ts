import { createRequire } from "node:module";
import {
	env,
	exit,
	install,
	StaticServer,
	yesOrNo,
	formatAsHeading,
} from "./utils.ts";

import type { BuildResult } from "./build.ts";
type Input = Pick<BuildResult, "dest" | "file">;

interface SpecberusError {
	name: string;
	key: string;
	detailMessage: string;
	extra: any;
}
interface Result {
	success: boolean;
	errors: SpecberusError[];
	warnings: SpecberusError[];
	info?: any[];
}
interface ExtractMetadataResult {
	success: boolean;
	metadata: {
		profile: string;
	};
}
interface SpecberusProfile {
	config: unknown;
	name: string;
	rules: { name: string; [key: string]: unknown }[];
}

const require = createRequire(import.meta.url);

const IGNORED_RULES = new Set([
	// Forbidden host (localhost)
	"validation.html",
	// Uses validator.w3c.org so we can't use localhost there
	"links.linkchecker",
]);

if (import.meta.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_PUBRULES")) === false) {
		exit("Skipped", 0);
	}

	const input: Input = JSON.parse(env("OUTPUTS_BUILD"));
	main(input).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main({ dest, file }: Input) {
	console.log(`Running specberus on ${file} in ${dest}...`);
	await install("specberus");

	const server = await new StaticServer(dest).start();
	const url = new URL(file, server.url);
	let result;
	try {
		result = await validate(url);
	} catch (error) {
		console.error(error);
		exit("Something went wrong");
	} finally {
		await server.stop();
	}

	if (result.errors?.length) {
		console.log(formatAsHeading("Errors"));
		console.log(result.errors);
	}
	if (result.warnings?.length) {
		console.log(formatAsHeading("Warnings"));
		console.log(result.warnings);
	}
	if (!result.success) {
		exit("There were some errors");
	}
}

function sinkAsync<T>() {
	const { Sink } = require("specberus/lib/sink");
	const noop = () => {};
	const sink = new Sink(noop, noop, noop, noop);
	return {
		sink,
		resultPromise: new Promise<T>((res, rej) => {
			sink.on("end-all", res);
			sink.on("exception", rej);
		}),
	};
}

async function validate(url: URL) {
	const { Specberus } = require("specberus");
	const specberus = new Specberus();

	console.log("getting metadata");
	const { metadata } = await extractMetadata(url);

	const { profiles } = require("specberus/lib/util");
	const importedProfile: SpecberusProfile = await profiles[metadata.profile];
	const profile: SpecberusProfile = {
		...importedProfile,
		rules: importedProfile.rules.filter(({ name }) => !IGNORED_RULES.has(name)),
	};

	console.log(`validating using profile: ${profile.name}`);
	const { sink, resultPromise } = sinkAsync<Result>();
	specberus.validate({
		url: url.href,
		profile,
		events: sink,
		echidnaReady: true,
	});
	const result = await resultPromise;
	delete result.info;
	return result;
}

async function extractMetadata(url: URL) {
	const { Specberus } = require("specberus");
	const specberus = new Specberus();

	const { sink, resultPromise } = sinkAsync<ExtractMetadataResult>();
	specberus.extractMetadata({ url, events: sink });
	const result = await resultPromise;
	return result;
}
