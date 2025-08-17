import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ConfigManager } from "./config/ConfigManager";
import { CommandExecutor } from "./executor/CommandExecutor";

export class CommandExecutionServer {
  private mcpServer: McpServer;
  private configManager: ConfigManager;
  private executor: CommandExecutor;
  private transport: StdioServerTransport;

  constructor(private configPath: string) {
    this.mcpServer = new McpServer({
      name: "long-run-command-mcp",
      version: "1.0.0",
    });
    this.configManager = new ConfigManager();
    this.executor = new CommandExecutor(this.configManager);
    this.transport = new StdioServerTransport();
  }

  // 副作用: あり（サーバー起動、設定ファイル読み込み）
  async start(): Promise<void> {
    await this.configManager.loadConfig(this.configPath);

    // 設定に基づいて各コマンドを個別のツールとして登録
    const commandKeys = this.configManager.getAvailableKeys();

    for (const key of commandKeys) {
      const command = this.configManager.getCommand(key);

      // コマンドごとに個別のツールを作成
      this.mcpServer.tool(
        `run_${key}`,
        `Execute ${key} command: ${command.command} (workdir: ${command.workdir})`,
        {},
        async () => {
          try {
            const result = await this.executor.execute({ key });

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: true,
                      outputPath: result.outputPath,
                      errorPath: result.errorPath,
                      exitCode: result.exitCode,
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      success: false,
                      error:
                        error instanceof Error ? error.message : String(error),
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          }
        },
      );
    }

    // サーバーを開始
    await this.mcpServer.connect(this.transport);
  }

  // 副作用: あり（サーバー停止）
  async stop(): Promise<void> {
    await this.mcpServer.close();
  }
}
