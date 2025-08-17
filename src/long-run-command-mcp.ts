#!/usr/bin/env node

import { startServer } from "./server";

function parseArgs(): string {
  const args = process.argv.slice(2);
  let configPath = "./config.json";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config" || args[i] === "-c") {
      if (i + 1 < args.length) {
        configPath = args[i + 1];
        break;
      }
    }
  }

  return configPath;
}

async function main(): Promise<void> {
  const configPath = parseArgs();
  const stopServer = await startServer(configPath);

  process.on("SIGINT", async () => {
    await stopServer();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await stopServer();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
