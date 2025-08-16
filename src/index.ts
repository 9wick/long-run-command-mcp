import { CommandExecutionServer } from "./server";

// 副作用: あり（プロセス起動）
async function main(): Promise<void> {
  // コマンドライン引数から設定ファイルパスを取得
  const args = process.argv.slice(2);
  let configPath = "./config.json";
  
  // --config または -c オプションをパース
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--config" || args[i] === "-c") {
      if (i + 1 < args.length) {
        configPath = args[i + 1];
        break;
      }
    }
  }
  
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
