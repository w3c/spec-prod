import * as path from "path";

export const ACTION_DIR = path.join(__dirname, "..");

export const PUPPETEER_ENV = (() => {
	const skipChromeDownload =
		!!process.env.PUPPETEER_SKIP_DOWNLOAD ||
		!!process.env.GITHUB_ACTIONS;
	if (!skipChromeDownload) return {};
	return {
		PUPPETEER_SKIP_DOWNLOAD: "1",
		PUPPETEER_EXECUTABLE_PATH:
			process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/google-chrome",
	};
})();
