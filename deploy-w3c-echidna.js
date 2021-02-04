// @ts-check
const { env, exit, pprint, request, sh } = require("./utils.js");

const MAILING_LIST = `https://lists.w3.org/Archives/Public/public-tr-notifications/`;
const API_URL = "https://labs.w3.org/echidna/api/request";

// @ts-expect-error
if (module === require.main) {
	/** @type {import("./prepare.js").W3CDeployOptions} */
	const inputs = JSON.parse(env("INPUTS_DEPLOY"));
	const outputDir = env("OUTPUT_DIR");
	if (inputs === false) {
		exit("Skipped.", 0);
	}
	main(outputDir, inputs).catch(err => exit(err.message || "Failed", err.code));
}

module.exports = main;
/**
 * @typedef {Exclude<import("./prepare.js").W3CDeployOptions, false>} W3CDeployOptions
 * @param {W3CDeployOptions} inputs
 * @param {string} outputDir
 */
async function main(outputDir, inputs) {
	console.log(`📣 If it fails, check ${MAILING_LIST}`);
	const id = await publish(outputDir, inputs);

	console.group("Getting publish status...");
	const result = await getPublishStatus(id);
	console.groupEnd();
	const { response } = result;

	if (result.status !== "failure") {
		delete result.response; // don't need to print it right now.
		pprint(result);
	}

	if (result.status === "success") {
		exit(`🎉 Published at: ${result.deploymentURL}`, 0);
	}

	if (result.status !== "failure") {
		exit("🚧 Echidna publish job is pending.", 0);
	}

	if (response && typeof response !== "string") {
		// Assume it is JSON
		showErrors(response.results.jobs);
	}
	console.log(`Details: ${result.details}`);
	exit("💥 Echidna publish has failed.");
}

/**
 * @param {object} input
 * @param {string} input.wgDecisionURL
 * @param {string} input.token
 * @param {string} [input.cc]
 * @param {string} outputDir
 * @returns {Promise<string>}
 */
async function publish(outputDir, input) {
	const { wgDecisionURL: decision, token, cc } = input;
	const tarFileName = "/tmp/echidna.tar";
	await sh(`tar cvf ${tarFileName} *`, {
		output: "stream",
		cwd: outputDir,
	});

	let command = `curl '${API_URL}'`;
	command += ` -F "dry-run=true"`;
	command += ` -F "tar=@${tarFileName}"`;
	command += ` -F "token=${token}"`;
	command += ` -F "token=${token}"`;
	command += ` -F "decision=${decision}"`;
	if (cc) command += ` -F "cc=${cc}"`;

	const id = await sh(command, "stream");
	return id.trim();
}

/**
 * @typedef {object} PublishState
 * @property {string} PublishState.id
 * @property {"success" | "failure" | "pending"} PublishState.status
 * @property {string} PublishState.details
 * @property {string} [PublishState.deploymentURL]
 * @property {Record<string, any>} [PublishState.response]
 *
 * @param {string} id
 * @returns {Promise<PublishState>}
 */
async function getPublishStatus(id) {
	const isJSON = arg => typeof arg === "string" && arg.startsWith("{");

	// How many seconds to wait before retrying job status check?
	// The numbers are based on "experience", so are somewhat random.
	const RETRY_DURATIONS = [6, 3, 2, 8, 2, 5, 10, 6];

	let url = new URL("https://labs.w3.org/echidna/api/status");
	url.searchParams.set("id", id);

	/** @type {PublishState} */
	const state = {
		id,
		status: "pending",
		details: url.href,
		deploymentURL: undefined,
		response: undefined,
	};

	let response;
	do {
		const wait = RETRY_DURATIONS.shift();
		console.log(`⏱️ Wait ${wait}s for job to finish...`);
		await new Promise(res => setTimeout(res, wait * 1000));

		response = await request(url, { method: "GET" });
		if (typeof response === "string" && !response.startsWith("{")) {
			state.response = { message: response };
			continue;
		}
		response = isJSON(response) ? JSON.parse(response) : response;

		state.status = response.results.status;
		state.response = response;

		if (state.status === "success") {
			state.deploymentURL = response.results.metadata.thisVersion;
		}
	} while (
		state.status !== "success" &&
		state.status !== "failure" &&
		RETRY_DURATIONS.length > 0
	);
	state.response = response;
	return state;
}

function showErrors(jobs) {
	const loggers = {
		"token-checker"(errors) {
			console.group("Token Checker Errors:");
			for (const error of errors) {
				console.log(error);
			}
			console.groupEnd();
		},
		specberus(errors) {
			console.group("Specberus Errors:");
			for (const error of errors) {
				const { message, link } = error.extra || {};
				const { key, type } = error;
				console.group(message || key);
				if (type) console.log(type);
				if (link) console.log(link);
				console.groupEnd();
			}
			console.groupEnd();
		},
	};
	for (const [type, logger] of Object.entries(loggers)) {
		if (jobs[type] && jobs[type].errors.length) {
			console.log();
			logger(jobs[type].errors);
			console.log();
		}
	}
}
