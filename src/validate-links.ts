import { env, exit, install, sh, yesOrNo } from "./utils.js";
import { BuildResult } from "./build.js";
type Input = Pick<BuildResult, "dest" | "file">;

const permaIgnore = [
	// Doesn't like robots
	"https://ev.buaa.edu.cn/",
];

if (module === require.main) {
	if (yesOrNo(env("INPUTS_VALIDATE_LINKS")) === false) {
		exit("Skipped", 0);
	}

	const input: Input = JSON.parse(env("OUTPUTS_BUILD"));
	main(input).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main({ dest: dir }: Input) {
	await install("link-checker");
	const ignoreList = makeIgnoreParams(permaIgnore);
	// Note: link-checker checks a directory, not a file.
	await sh(
		`link-checker ${ignoreList} --http-timeout=50000 --http-redirects=3 --http-always-get ${dir}`,
		"stream",
	);
}

function makeIgnoreParams(ignoreList: string[]) {
	return ignoreList.map(url => `--url-ignore="${url}"`).join(" ");
}
