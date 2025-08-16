import { CommandExecutionServer } from "./server";

// 副作用: あり（プロセス起動）
async function main(): Promise<void> {
  const configPath = process.env.CONFIG_PATH || "./config.json";
  const server = new CommandExecutionServer(configPath);

  await server.start();

  // グレースフルシャットダウン
  process.on("SIGINT", async () => {
    await server.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await server.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
