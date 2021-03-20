import * as path from "path";

export const ACTION_DIR = path.join(__dirname, "..");

export const PUPPETEER_ENV = {
	PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: "1",
	PUPPETEER_EXECUTABLE_PATH: "/usr/bin/google-chrome",
};
