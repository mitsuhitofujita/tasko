#!/usr/bin/env node

import { spawn } from "node:child_process";
import { promisify } from "node:util";

const sleep = promisify(setTimeout);

let serverProcess = null;
let firestoreEmulatorProcess = null;

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

async function startFirestoreEmulator() {
	return new Promise((resolve, reject) => {
		console.log("Starting Firestore emulator...");
		firestoreEmulatorProcess = spawn("gcloud", [
			"emulators",
			"firestore",
			"start",
			"--host-port=0.0.0.0:8080"
		], {
			stdio: "pipe",
			env: {
				...process.env,
			},
		});

		firestoreEmulatorProcess.stdout.on("data", (data) => {
			const output = data.toString();
			console.log(output);
			if (output.includes("Dev App Server is now running")) {
				resolve();
			}
		});

		firestoreEmulatorProcess.stderr.on("data", (data) => {
			console.error(data.toString());
		});

		firestoreEmulatorProcess.on("error", reject);

		// Fallback: resolve after 10 seconds if no specific message is found
		setTimeout(resolve, 10000);
	});
}

async function startServer() {
	return new Promise((resolve, reject) => {
		console.log("Starting server...");
		serverProcess = spawn("node", ["dist/index.js"], {
			cwd: "../../packages/backend",
			stdio: "pipe",
			env: {
				...process.env,
				NODE_ENV: "test",
				FIRESTORE_EMULATOR_HOST: "localhost:8080",
			},
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
		try {
			serverProcess.kill("SIGTERM");
			// Force kill after 3 seconds if still running
			setTimeout(() => {
				if (serverProcess && !serverProcess.killed) {
					console.log("Force killing server...");
					serverProcess.kill("SIGKILL");
				}
			}, 3000);
		} catch (error) {
			console.warn("Error stopping server:", error.message);
		}
		serverProcess = null;
	}
	
	// Also kill any remaining processes on port 3000
	try {
		spawn("pkill", ["-f", "node.*3000"], { stdio: "ignore" });
	} catch {
		// Ignore errors from pkill
	}
}

function stopFirestoreEmulator() {
	if (firestoreEmulatorProcess) {
		console.log("Stopping Firestore emulator...");
		
		try {
			// First try graceful termination
			firestoreEmulatorProcess.kill("SIGTERM");
			
			// Wait a bit and then force kill if still running
			setTimeout(() => {
				if (firestoreEmulatorProcess && !firestoreEmulatorProcess.killed) {
					console.log("Force killing Firestore emulator...");
					firestoreEmulatorProcess.kill("SIGKILL");
				}
			}, 2000);
		} catch (error) {
			console.warn("Error stopping Firestore emulator:", error.message);
		}
		
		firestoreEmulatorProcess = null;
	}
	
	// Also kill any remaining firestore processes
	try {
		spawn("pkill", ["-f", "cloud-firestore-emulator"], { stdio: "ignore" });
		spawn("pkill", ["-f", "firestore"], { stdio: "ignore" });
		spawn("pkill", ["-f", "java.*8080"], { stdio: "ignore" });
	} catch {
		// Ignore errors from pkill
	}
}

async function clearFirestoreData() {
	try {
		console.log("Clearing Firestore data...");
		
		// Try using the test API endpoint first (more reliable)
		try {
			const response = await fetch("http://localhost:3000/api/test-auth/clear-all-data", {
				method: "DELETE",
			});
			
			if (response.ok) {
				const result = await response.json();
				console.log("Test data cleared via API:", result.message);
				return;
			}
		} catch (apiError) {
			console.warn("API cleanup failed, trying emulator REST API...", apiError.message);
		}
		
		// Fallback to emulator REST API
		const response = await fetch("http://localhost:8080/emulator/v1/projects/tasko-test/databases/(default)/documents", {
			method: "DELETE",
		});
		
		if (response.ok) {
			console.log("Firestore data cleared via emulator API");
		} else {
			console.warn("Failed to clear Firestore data via emulator API");
		}
	} catch (error) {
		console.warn("Error clearing Firestore data:", error.message);
		// Continue anyway as this is not critical for test execution
	}
}

async function main() {
	let exitCode = 0;
	
	try {
		console.log("Starting Firestore emulator...");
		await startFirestoreEmulator();
		await sleep(2000); // Give emulator extra time to fully start

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

		// Clear test data after server is running
		await clearFirestoreData();

		console.log("Running E2E tests...");
		await runCommand("npx", ["playwright", "test"]);

		console.log("E2E tests completed successfully!");
	} catch (error) {
		console.error("E2E workflow failed:", error.message);
		exitCode = 1;
	} finally {
		console.log("Cleaning up processes...");
		stopServer();
		stopFirestoreEmulator();
		
		// Wait a bit for cleanup to complete
		await sleep(1000);
		
		if (exitCode !== 0) {
			process.exit(exitCode);
		}
	}
}

// Handle process termination
process.on("SIGINT", () => {
	console.log("Received SIGINT, cleaning up...");
	stopServer();
	stopFirestoreEmulator();
	process.exit(0);
});

process.on("SIGTERM", () => {
	console.log("Received SIGTERM, cleaning up...");
	stopServer();
	stopFirestoreEmulator();
	process.exit(0);
});

main();
