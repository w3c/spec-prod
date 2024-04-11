import { rm } from "fs/promises";
import { env, exit, install, yesOrNo } from "./utils.js";
import { BuildResult } from "./build.js";
type Input = Pick<BuildResult, "dest" | "file">;

if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_WEBIDL")) === false) {
		exit("Skipped", 0);
	}

	const input: Input = JSON.parse(env("OUTPUTS_BUILD"));
	main(input).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main({ dest, file }: Input) {
	console.log(`Validating Web IDL defined in ${file}...`);
	await install("reffy@15");
	const { crawlSpecs } = require("reffy");

	const fileurl = new URL(file, `file://${dest}/`).href;
	const results = await crawlSpecs(
		[{ url: fileurl, nightly: { url: fileurl } }],
		{ modules: ["idl"] },
	);
	await rm(".cache", { recursive: true, force: true });

	const idl = results[0]?.idl;
	if (!idl) {
		exit("No Web IDL found in spec, skipped validation", 0);
	}

	await install("webidl2@latest");
	// An outdated version might be cached from importing reffy.
	delete require.cache[require.resolve("webidl2")];

	const { parse, validate } = require("webidl2");
	let errors: { message: string }[] = [];
	try {
		const tree = parse(idl);
		errors = validate(tree);
	} catch (error) {
		errors = [error];
	}
	if (!errors.length) {
		exit("✅  Looks good! No Web IDL validation errors!", 0);
	} else {
		console.group("Invalid Web IDL detected:");
		for (const error of errors) {
			console.log(error.message);
			console.log("");
		}
		console.groupEnd();
		exit("❌  Invalid Web IDL detected... please fix the issues above.");
	}
}
