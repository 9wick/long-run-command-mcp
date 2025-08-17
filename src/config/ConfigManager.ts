import { promises as fs } from "node:fs";
import * as path from "node:path";

export interface Config {
  outputdir: string;
  commands: Record<string, CommandConfig>;
}

export interface CommandConfig {
  workdir: string;
  command: string;
  additionalArgs?: boolean;
}

function validateConfig(config: unknown): Config {
  if (!config || typeof config !== "object") {
    throw new Error("Config validation error: config must be an object");
  }

  const cfg = config as Record<string, unknown>;

  if (!cfg.outputdir || typeof cfg.outputdir !== "string") {
    throw new Error(
      "Config validation error: outputdir is required and must be a string",
    );
  }

  if (!cfg.commands || typeof cfg.commands !== "object") {
    throw new Error(
      "Config validation error: commands is required and must be an object",
    );
  }

  for (const [key, command] of Object.entries(
    cfg.commands as Record<string, unknown>,
  )) {
    if (!command || typeof command !== "object") {
      throw new Error(
        `Config validation error: commands.${key} must be an object`,
      );
    }
    const cmd = command as Record<string, unknown>;
    if (!cmd.workdir || typeof cmd.workdir !== "string") {
      throw new Error(
        `Config validation error: commands.${key}.workdir is required and must be a string`,
      );
    }
    if (!cmd.command || typeof cmd.command !== "string") {
      throw new Error(
        `Config validation error: commands.${key}.command is required and must be a string`,
      );
    }
    if (
      cmd.additionalArgs !== undefined &&
      typeof cmd.additionalArgs !== "boolean"
    ) {
      throw new Error(
        `Config validation error: commands.${key}.additionalArgs must be a boolean`,
      );
    }
  }

  return cfg as unknown as Config;
}

export async function loadConfig(configPath: string): Promise<Config> {
  const absolutePath = path.resolve(configPath);
  const configDir = path.dirname(absolutePath);

  try {
    const content = await fs.readFile(absolutePath, "utf-8");
    const parsedConfig = JSON.parse(content);
    const validatedConfig = validateConfig(parsedConfig);

    // Convert relative paths to absolute paths
    validatedConfig.outputdir = path.resolve(
      configDir,
      validatedConfig.outputdir,
    );

    for (const key in validatedConfig.commands) {
      validatedConfig.commands[key].workdir = path.resolve(
        configDir,
        validatedConfig.commands[key].workdir,
      );
    }

    return validatedConfig;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new Error(`Config file not found: ${absolutePath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in config file: ${error.message}`);
    }
    throw error;
  }
}

export function getCommand(config: Config, key: string): CommandConfig {
  const command = config.commands[key];
  if (!command) {
    throw new Error(`Command not found: ${key}`);
  }
  return command;
}

export function getOutputDir(config: Config): string {
  return config.outputdir;
}

export function getAvailableKeys(config: Config): string[] {
  return Object.keys(config.commands);
}
