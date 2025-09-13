#!/usr/bin/env node

import { spawn } from "node:child_process";
import { promisify } from "node:util";

const sleep = promisify(setTimeout);

let serverProcess = null;

async function runCommand(command, args = [], options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: "inherit",
			shell: true,
			...options,
		});

		child.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Command failed with exit code ${code}`));
			}
		});

		child.on("error", reject);
	});
}

async function startServer() {
	return new Promise((resolve, reject) => {
		console.log("Starting server...");
		serverProcess = spawn("node", ["dist/index.js"], {
			cwd: "../../packages/backend",
			stdio: "pipe",
		});

		serverProcess.stdout.on("data", (data) => {
			const output = data.toString();
			console.log(output);
			if (
				output.includes("Server running on port 3000") ||
				output.includes("listening on port 3000")
			) {
				resolve();
			}
		});

		serverProcess.stderr.on("data", (data) => {
			console.error(data.toString());
		});

		serverProcess.on("error", reject);

		// Fallback: resolve after 5 seconds if no specific message is found
		setTimeout(resolve, 5000);
	});
}

function stopServer() {
	if (serverProcess) {
		console.log("Stopping server...");
		serverProcess.kill("SIGTERM");
		serverProcess = null;
	}
}

async function main() {
	try {
		console.log("Building frontend...");
		await runCommand("pnpm", ["--filter", "frontend", "build"], {
			cwd: "../..",
		});

		console.log("Building backend...");
		await runCommand("pnpm", ["--filter", "backend", "build"], {
			cwd: "../..",
		});

		await startServer();
		await sleep(2000); // Give server extra time to fully start

		console.log("Running E2E tests...");
		await runCommand("npx", ["playwright", "test"]);

		console.log("E2E tests completed successfully!");
	} catch (error) {
		console.error("E2E workflow failed:", error.message);
		process.exit(1);
	} finally {
		stopServer();
	}
}

// Handle process termination
process.on("SIGINT", () => {
	console.log("Received SIGINT, cleaning up...");
	stopServer();
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.log("Received SIGTERM, cleaning up...");
	stopServer();
	process.exit(0);
});

main();
