// @ts-check
const path = require("path");

const ACTION_DIR = path.join(__dirname, "..");

const PUPPETEER_ENV = {
	PUPPETEER_SKIP_CHROMIUM_DOWNLOAD: "1",
	PUPPETEER_EXECUTABLE_PATH: "/usr/bin/google-chrome",
};

module.exports = {
	ACTION_DIR,
	PUPPETEER_ENV,
};
