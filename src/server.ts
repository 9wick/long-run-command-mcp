import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
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

    // execute_command ツールの登録
    this.mcpServer.tool(
      "execute_command",
      "Execute a predefined command by key",
      { key: z.string().describe("Command key to execute") },
      async ({ key }) => {
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

    // list_commands ツールの登録
    this.mcpServer.tool(
      "list_commands",
      "List all available command keys",
      {},
      async () => {
        const commands = this.configManager.getAvailableKeys();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  availableCommands: commands,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );

    // サーバーを開始
    await this.mcpServer.connect(this.transport);
  }

  // 副作用: あり（サーバー停止）
  async stop(): Promise<void> {
    await this.mcpServer.close();
  }
}
