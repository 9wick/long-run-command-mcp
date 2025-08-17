import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  getAvailableKeys,
  getCommand,
  loadConfig,
} from "./config/ConfigManager";
import { execute } from "./executor/CommandExecutor";
import type { Config } from "./types";

function createCommandTool(
  mcpServer: McpServer,
  key: string,
  config: Config,
): void {
  const command = getCommand(config, key);
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");

  mcpServer.tool(
    `run_${safeKey}`,
    `Execute ${key} command: ${command.command} (workdir: ${command.workdir})`,
    {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    async () => {
      try {
        const result = await execute({ key }, config);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  command: command.command,
                  workdir: command.workdir,
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
                  error: error instanceof Error ? error.message : String(error),
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

export async function startServer(
  configPath: string,
): Promise<() => Promise<void>> {
  const mcpServer = new McpServer({
    name: "long-run-command-mcp",
    version: "1.0.0",
  });
  const transport = new StdioServerTransport();

  const config = await loadConfig(configPath);
  const commandKeys = getAvailableKeys(config);

  for (const key of commandKeys) {
    createCommandTool(mcpServer, key, config);
  }

  await mcpServer.connect(transport);

  return async () => {
    await mcpServer.close();
  };
}
