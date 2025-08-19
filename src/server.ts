import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  type Config,
  getAvailableKeys,
  getCommand,
  loadConfig,
} from "./config/ConfigManager.ts";
import { execute } from "./executor/CommandExecutor.ts";

function createCommandTool(
  mcpServer: McpServer,
  key: string,
  config: Config,
): void {
  const command = getCommand(config, key);
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "_");

  const baseDescription = `Execute ${command.command} (workdir: ${command.workdir})${command.additionalArgs ? " - supports additional arguments." : ""}`;
  const fullDescription = command.description
    ? `${baseDescription}\n\n${command.description}`
    : baseDescription;

  if (command.additionalArgs) {
    // Use Zod schema for tools with additional arguments
    const argsSchema = {
      args: z.array(z.string()).describe("Additional arguments to pass to the command")
    };
    
    mcpServer.tool(
      `run_${safeKey}`,
      fullDescription,
      argsSchema,
      async (args: { args: string[] }) => {
      try {
        const result = await execute(
          { key, additionalArgs: args?.args },
          config,
        );

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
    }
  );
  } else {
    // Tool without additional arguments
    mcpServer.tool(
      `run_${safeKey}`,
      fullDescription,
      {},
      async () => {
        try {
          const result = await execute(
            { key },
            config,
          );

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
      }
    );
  }
}

export async function startServer(
  configPath: string,
): Promise<() => Promise<void>> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
  );

  const mcpServer = new McpServer({
    name: "long-run-command-mcp",
    version: packageJson.version,
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
