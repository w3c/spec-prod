import { env, exit, install, yesOrNo } from "./utils.js";
import { BuildResult } from "./build.js";
type Input = Pick<BuildResult, "dest" | "file">;

if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_IDL")) === false) {
		exit("Skipped", 0);
	}

	const input: Input = JSON.parse(env("OUTPUTS_BUILD"));
	main(input).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main({ dest, file }: Input) {
	console.log(`Validating IDL defined in ${file}...`);
	await install("reffy");
	const { crawlList } = require("reffy/src/cli/crawl-specs");

	const fileurl = new URL(file, `file://${dest}/`).href;
	const results = await crawlList(
		[{ url: fileurl, nightly: { url: fileurl } }],
		{ modules: ["idl"] },
	);

	const idl = results[0]?.idl?.idl;
	if (!idl) {
		exit("No IDL found in spec, skipped IDL validation", 0);
	}

	await install("webidl2");
	const { parse, validate } = require("webidl2");
	let errors: { message: string }[] = [];
	try {
		const tree = parse(idl);
		errors = validate(tree);
	} catch (error) {
		errors = [error];
	}
	if (!errors.length) {
		exit("✅  Looks good! No IDL validation errors!", 0);
	} else {
		for (const error of errors) {
			console.log(error.message);
		}
		exit("❌  Invalid IDL detected... please fix the issues above.");
	}
}
