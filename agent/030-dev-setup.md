# Development Environment Setup Log

## pnpm configuration

Create `pnpm-workspace.yaml` at the repository root:

```yaml
packages:
  - "packages/*"
```

Install pnpm at the root and add Biome as a dev dependency:

```bash
# Initialize the root package
pnpm init

# Install Biome (dev dependency, exact version)
pnpm add -D -E @biomejs/biome
```

## Create the frontend project

```bash
# Create the packages directory and move into it
mkdir packages
cd packages

# Create a Vite React + TypeScript app in "frontend"
pnpm create vite frontend --template react-ts

# Verify React app runs
cd frontend
pnpm install
pnpm run dev
cd ../..
```

## Create the backend project

```bash
# Create backend package and initialize
cd packages
mkdir backend
cd backend
pnpm init
pnpm add -E fastify
pnpm add -D -E typescript @types/node
pnpm add -D tsx
```

### Add dev scripts to `package.json`

Example `scripts` section:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node index.js"
  }
}
```

### Prepare `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "rootDir": "src",
    "resolveJsonModule": true,
    "outDir": "dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

### Add `src/index.ts`

```typescript
import fastify from "fastify";

const server = fastify();

server.get("/ping", async (request, reply) => {
  return "pong\n";
});

server.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
```

### Run and verify

```bash
pnpm run dev
```

Open a browser and visit `http://localhost:3000/ping` — you should see the response `pong`.

## Create the E2E test package

```bash
# Create e2e package and initialize
cd packages
mkdir e2e
cd e2e
pnpm init
pnpm add -D -E @playwright/test @types/node typescript
```

### Configure `package.json` scripts

Example `scripts` section:

```json
{
  "scripts": {
    "check": "biome check . --write && tsc -p tsconfig.json --noEmit",
    "test": "node scripts/run-e2e.js",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug"
  }
}
```

### Add TypeScript configuration `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "node",
    "strict": true,
    "skipLibCheck": true,
    "types": ["@playwright/test"]
  }
}
```

### Configure Playwright in `playwright.config.ts`

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless: true,
      },
    },
  ],
});
```

### Create E2E test runner script `scripts/run-e2e.js`

```javascript
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
```

### Install Playwright browsers

```bash
npx playwright install
```

### Create a simple test `tests/homepage.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test("homepage has title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Vite \+ React \+ TS/);
});
```

### Run E2E tests

```bash
pnpm run test
```
