import { env, exit, pprint, sh } from "./utils.ts";

import type { W3CDeployOptions } from "./prepare-deploy.ts";
import type { BuildResult } from "./build.ts";
type Input = Exclude<W3CDeployOptions, false>;

const MAILING_LIST = `https://lists.w3.org/Archives/Public/public-tr-notifications/`;
const API_URL = "https://labs.w3.org/echidna/api/request";

if (import.meta.main) {
	const inputs: W3CDeployOptions = JSON.parse(env("INPUTS_DEPLOY"));
	const buildOutput: BuildResult = JSON.parse(env("OUTPUTS_BUILD"));
	if (inputs === false) {
		exit("Skipped.", 0);
	}
	main(inputs, buildOutput).catch(err => {
		exit(err.message || "Failed", err.code);
	});
}

interface PublishState {
	id: string;
	status: "success" | "failure" | "pending";
	details: string;
	deploymentURL?: string;
	response?: string | EchidnaResponse | { message: string; [x: string]: any };
}

interface EchidnaJobs
	extends Record<
		| "token-checker"
		| "third-party-checker"
		| "update-tr-shortlink"
		| "tr-install"
		| "publish"
		| "ip-checker"
		| "metadata",
		{ errors: any[] }
	> {
	specberus: {
		errors: {
			key: string;
			detailMessage: string;
			type: { name: string; section: string; rule: string };
			extra?: { message: string; link: string };
		}[];
	};
}

interface EchidnaResponse {
	id: string;
	decision: string;
	results: {
		status: PublishState["status"];
		metadata: {
			thisVersion: string;
			previousVersion: string;
		};
		jobs: EchidnaJobs;
	};
}

export default async function main(inputs: Input, buildOutput: BuildResult) {
	console.log(`📣 If it fails, check ${MAILING_LIST}`);
	const id = await publish(inputs, buildOutput);

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

async function publish(input: Input, buildOutput: BuildResult) {
	const { dest: outputDir, file } = buildOutput;
	const { wgDecisionURL: decision, token, cc, repository } = input;
	const annotation = `triggered by auto-publish spec-prod action on ${repository}`;
	const tarFileName = "/tmp/echidna.tar";
	await sh(`mv -n ${file} Overview.html`, { cwd: outputDir });
	await sh(`tar cvf ${tarFileName} *`, {
		output: "stream",
		cwd: outputDir,
	});
	await sh(`mv -n Overview.html ${file}`, { cwd: outputDir });

	let command = `curl '${API_URL}'`;
	// command += ` -F "dry-run=true"`;
	command += ` -F "tar=@${tarFileName}"`;
	command += ` -F "token=${token}"`;
	command += ` -F "annotation=${annotation}"`;
	command += ` -F "decision=${decision}"`;
	if (cc) command += ` -F "cc=${cc}"`;

	const id = await sh(command);
	return id.trim();
}

async function getPublishStatus(id: string) {
	// How many seconds to wait before retrying job status check?
	// The numbers are based on "experience", so are somewhat random.
	const RETRY_DURATIONS = [6, 3, 2, 8, 2, 5, 10, 6];

	let url = new URL("https://labs.w3.org/echidna/api/status");
	url.searchParams.set("id", id);

	const state: PublishState = {
		id,
		status: "pending",
		details: url.href,
		deploymentURL: undefined,
		response: undefined,
	};

	let response;
	do {
		const wait = RETRY_DURATIONS.shift();
		if (!wait) break;
		console.log(`⏱️ Wait ${wait}s for job to finish...`);
		await new Promise(res => setTimeout(res, wait * 1000));

		console.log(`📡 Request: ${url}`);
		const res = await fetch(url);
		if (res.headers.get("content-type")?.includes("json")) {
			response = (await res.json()) as EchidnaResponse;
		} else {
			response = await res.text();
			state.response = { message: response };
			continue;
		}

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

function showErrors(jobs: EchidnaJobs) {
	type ErrorLoggers = {
		[k in keyof EchidnaJobs]?: (errors: EchidnaJobs[k]["errors"]) => void;
	};
	const loggers: ErrorLoggers = {
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
				const { detailMessage } = error;
				const { message, link } = error.extra || {};
				const { key, type } = error;
				console.group(detailMessage || message || key);
				if (type) console.log(type);
				if (link) console.log(link);
				console.groupEnd();
			}
			console.groupEnd();
		},
	};

	type AvailableErrorLoggers = keyof ErrorLoggers;
	for (const type of Object.keys(loggers) as AvailableErrorLoggers[]) {
		const logger = loggers[type]!;
		if (jobs[type]?.errors.length) {
			console.log();
			logger(jobs[type].errors);
			console.log();
		}
	}
}
