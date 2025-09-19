import { env, exit, install, sh } from "./utils.js";
import type { BuildResult } from "./build.js";
type Input = Pick<BuildResult, "dest" | "file">;

const URL_IGNORE = [
	// Doesn't like robots
	"https://ev.buaa.edu.cn/",
	// The to-be published /TR URL.
	// Ideally should include shortname, but may be good enough.
	`/TR/.+${new Date().toISOString().slice(0, 10).replace(/-/g, "")}/$`,
];

if (import.meta.main) {
	const input: Input = JSON.parse(env("OUTPUTS_BUILD"));
	main(input).catch(err => exit(err.message || "Failed", err.code));
}

export default async function main({ dest: dir }: Input) {
	await install("link-checker");
	const opts = getLinkCheckerOptions(URL_IGNORE);
	// Note: link-checker checks a directory, not a file.
	await sh(`link-checker ${opts} ${dir}`, "stream");
}

function getLinkCheckerOptions(ignoreList: string[]) {
	return ignoreList
		.map(url => `--url-ignore="${url}"`)
		.concat(["--http-timeout=50000", "--http-redirects=3", "--http-always-get"])
		.join(" ");
}
