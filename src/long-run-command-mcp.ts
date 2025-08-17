#!/usr/bin/env node

import { startServer } from "./server";
import { readFileSync } from "fs";
import { join } from "path";

function getVersion(): string {
  const packageJsonPath = join(__dirname, "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  return packageJson.version;
}

function parseArgs(): { configPath: string; showVersion: boolean } {
  const args = process.argv.slice(2);
  let configPath = "./config.json";
  let showVersion = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--version" || args[i] === "-v") {
      showVersion = true;
      break;
    }
    if (args[i] === "--config" || args[i] === "-c") {
      if (i + 1 < args.length) {
        configPath = args[i + 1];
      }
    }
  }

  return { configPath, showVersion };
}

async function main(): Promise<void> {
  const { configPath, showVersion } = parseArgs();

  if (showVersion) {
    console.log(getVersion());
    process.exit(0);
  }

  const stopServer = await startServer(configPath);
  let stopping = false;

  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await stopServer();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
