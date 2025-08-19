import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  type Config,
  getAvailableKeys,
  getCommand,
  loadConfig,
} from "./config/ConfigManager.ts";
import { execute } from "./executor/CommandExecutor.ts";

function formatToolResponse(data: Record<string, any>) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function executeCommand(
  key: string,
  config: Config,
  additionalArgs?: string[],
) {
  const command = getCommand(config, key);

  try {
    const result = await execute({ key, additionalArgs }, config);

    // Build the full command including additional arguments
    const fullCommand =
      additionalArgs && additionalArgs.length > 0
        ? `${command.command} ${additionalArgs.map((arg) => `"${arg.replace(/"/g, '\\"')}"`).join(" ")}`
        : command.command;

    return formatToolResponse({
      success: true,
      command: fullCommand,
      workdir: command.workdir,
      outputPath: result.outputPath,
      errorPath: result.errorPath,
      exitCode: result.exitCode,
    });
  } catch (error) {
    return formatToolResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

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

  const toolName = `run_${safeKey}`;

  if (command.additionalArgs) {
    mcpServer.tool(
      toolName,
      fullDescription,
      {
        args: z
          .array(z.string())
          .describe("Additional arguments to pass to the command"),
      },
      async (args: { args: string[] }, _extra) =>
        executeCommand(key, config, args?.args),
    );
  } else {
    mcpServer.tool(toolName, fullDescription, async (_extra) =>
      executeCommand(key, config),
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
