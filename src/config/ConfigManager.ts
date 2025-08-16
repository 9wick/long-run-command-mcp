import { promises as fs } from "node:fs";
import * as path from "node:path";
import { CommandConfig, Config } from "../types";

export class ConfigManager {
  private config: Config | null = null;

  // 副作用: あり（ファイル読み込み）
  async loadConfig(configPath: string): Promise<void> {
    const absolutePath = path.resolve(configPath);

    try {
      const content = await fs.readFile(absolutePath, "utf-8");
      const parsedConfig = JSON.parse(content);

      // バリデーション
      this.validateConfig(parsedConfig);
      this.config = parsedConfig;
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

  // 副作用: なし
  private validateConfig(config: unknown): void {
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
    }
  }

  // 副作用: なし
  getCommand(key: string): CommandConfig {
    if (!this.config) {
      throw new Error("Config not loaded");
    }

    const command = this.config.commands[key];
    if (!command) {
      throw new Error(`Command not found: ${key}`);
    }

    return command;
  }

  // 副作用: なし
  getOutputDir(): string {
    if (!this.config) {
      throw new Error("Config not loaded");
    }
    return this.config.outputdir;
  }

  // 副作用: なし
  getAvailableKeys(): string[] {
    if (!this.config) {
      throw new Error("Config not loaded");
    }
    return Object.keys(this.config.commands);
  }
}
