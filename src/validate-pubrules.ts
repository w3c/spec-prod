import {
	env,
	exit,
	install,
	StaticServer,
	yesOrNo,
	formatAsHeading,
} from "./utils.js";

import type { BuildResult } from "./build.js";
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

const INGORED_RULES = new Set(["validation.html", "links.linkchecker"]);

if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_PUBRULES")) === false) {
		exit("Skipped", 0);
	}

	const input: Input = JSON.parse(env("OUTPUTS_BUILD"));
	main(input).catch(err => exit(err.message || "Failed", err.code));
}

// TODO: API key private
export default async function main({ dest, file }: Input) {
	console.log(`Pubrules ${file}...`);
	await install("specberus");

	const server = await new StaticServer(dest).start();
	let result;
	try {
		process.env.W3C_API_KEY = "API_KEY";
		process.env.BASE_URI = "/";
		// TODO: use correct file in URL
		result = await validate(server.url);
	} catch (error) {
		console.error(error);
		exit("Something went wrong");
	} finally {
		delete process.env.W3C_API_KEY;
		delete process.env.BASE_URI;
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

// TODO:
// - imrpove current step indicator
// - pretty print errors
// - happy typescript
// - API key exception handling
async function validate(url: URL) {
	const { Specberus } = require("specberus");

	const specberus = new Specberus();

	console.log("getting metadata");
	const { metadata } = await extractMetadata(url);

	const profile = require(`specberus/lib/util`).profiles[metadata.profile];
	// @ts-ignore
	profile.rules = profile.rules.filter(({ name }) => !INGORED_RULES.has(name));

	console.log("validating");
	const { sink, resultPromise } = sinkAsync<Result>();
	specberus.validate({
		url,
		profile,
		events: sink,
		echidnaReady: true,
		patentPolicy: "pp2020",
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
