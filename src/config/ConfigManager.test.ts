import { promises as fs } from "node:fs";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Config } from "./ConfigManager.ts";
import {
  getAvailableKeys,
  getCommand,
  getOutputDir,
  loadConfig,
} from "./ConfigManager.ts";

describe("ConfigManager", () => {
  describe("loadConfig", () => {
    const testConfigPath = path.join(__dirname, "test-config.json");

    afterEach(async () => {
      try {
        await fs.unlink(testConfigPath);
      } catch (_error) {
        // ファイルが存在しない場合は無視
      }
    });

    it("should load a valid config file", async () => {
      const testConfig = {
        outputdir: "./output",
        commands: {
          test: {
            workdir: "./",
            command: "echo test",
          },
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
      const config = await loadConfig(testConfigPath);
      expect(config).toEqual(testConfig);
    });

    it("should throw error when outputdir is missing", async () => {
      const testConfig = {
        commands: {
          test: {
            workdir: "./",
            command: "echo test",
          },
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
      await expect(loadConfig(testConfigPath)).rejects.toThrow(
        "Config validation error: outputdir is required and must be a string",
      );
    });

    it("should throw error when commands is missing", async () => {
      const testConfig = {
        outputdir: "./output",
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
      await expect(loadConfig(testConfigPath)).rejects.toThrow(
        "Config validation error: commands is required and must be an object",
      );
    });

    it("should throw error when command workdir is missing", async () => {
      const testConfig = {
        outputdir: "./output",
        commands: {
          test: {
            command: "echo test",
          },
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
      await expect(loadConfig(testConfigPath)).rejects.toThrow(
        "Config validation error: commands.test.workdir is required and must be a string",
      );
    });

    it("should throw error when command.command is missing", async () => {
      const testConfig = {
        outputdir: "./output",
        commands: {
          test: {
            workdir: "./",
          },
        },
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
      await expect(loadConfig(testConfigPath)).rejects.toThrow(
        "Config validation error: commands.test.command is required and must be a string",
      );
    });
  });

  describe("getCommand", () => {
    const testConfig: Config = {
      outputdir: "./output",
      commands: {
        test: {
          workdir: "./",
          command: "echo test",
        },
      },
    };

    it("should return command config for existing key", () => {
      const command = getCommand(testConfig, "test");
      expect(command).toEqual({
        workdir: "./",
        command: "echo test",
      });
    });

    it("should throw error for non-existing key", () => {
      expect(() => getCommand(testConfig, "nonexistent")).toThrow(
        "Command not found: nonexistent",
      );
    });
  });

  describe("getOutputDir", () => {
    const testConfig: Config = {
      outputdir: "./output",
      commands: {
        test: {
          workdir: "./",
          command: "echo test",
        },
      },
    };

    it("should return output directory", () => {
      const outputDir = getOutputDir(testConfig);
      expect(outputDir).toBe("./output");
    });
  });

  describe("getAvailableKeys", () => {
    const testConfig: Config = {
      outputdir: "./output",
      commands: {
        test: {
          workdir: "./",
          command: "echo test",
        },
        build: {
          workdir: "./",
          command: "npm build",
        },
      },
    };

    it("should return available command keys", () => {
      const keys = getAvailableKeys(testConfig);
      expect(keys).toEqual(["test", "build"]);
    });
  });
});
