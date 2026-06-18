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
	config: any;
	name: string;
	rules: { name: string; check: (ctx: any) => void }[];
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

async function validate(url: URL) {
	// @ts-ignore (specberus is lazily installed)
	const { Specberus } = await import("specberus");
	const specberus = new Specberus();

	console.log("getting metadata");
	const {
		metadata: { profile },
	} = await extractMetadata(url);

	// @ts-ignore (specberus is lazily installed)
	const { profiles } = await import("specberus/lib/util.js");
	const importedProfile: SpecberusProfile = await profiles[profile];
	const filteredProfile = {
		...importedProfile,
		rules: importedProfile.rules.filter(({ name }) => !IGNORED_RULES.has(name)),
	};

	console.log(`validating using profile: ${filteredProfile.name}`);
	const { errors, metadata, success, warnings } = await specberus.validate({
		url: url.href,
		profile: filteredProfile,
	});
	return { errors, metadata, success, warnings };
}

async function extractMetadata(url: URL) {
	// @ts-ignore (specberus is lazily installed)
	const { Specberus } = await import("specberus");
	const specberus = new Specberus();

	const result = await specberus.extractMetadata({ url });
	return result;
}
