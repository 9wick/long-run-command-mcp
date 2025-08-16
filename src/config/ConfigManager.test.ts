import { promises as fs } from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigManager } from "./ConfigManager";

describe("ConfigManager", () => {
  describe("constructor", () => {
    it("should create an instance", () => {
      const configManager = new ConfigManager();
      expect(configManager).toBeInstanceOf(ConfigManager);
    });
  });

  describe("loadConfig", () => {
    let configManager: ConfigManager;
    const testConfigPath = path.join(__dirname, "test-config.json");

    beforeEach(() => {
      configManager = new ConfigManager();
    });

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
      await expect(
        configManager.loadConfig(testConfigPath),
      ).resolves.not.toThrow();
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
      await expect(configManager.loadConfig(testConfigPath)).rejects.toThrow(
        "Config validation error: outputdir is required and must be a string",
      );
    });

    it("should throw error when commands is missing", async () => {
      const testConfig = {
        outputdir: "./output",
      };

      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
      await expect(configManager.loadConfig(testConfigPath)).rejects.toThrow(
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
      await expect(configManager.loadConfig(testConfigPath)).rejects.toThrow(
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
      await expect(configManager.loadConfig(testConfigPath)).rejects.toThrow(
        "Config validation error: commands.test.command is required and must be a string",
      );
    });
  });

  describe("getCommand", () => {
    let configManager: ConfigManager;
    const testConfigPath = path.join(__dirname, "test-config.json");

    beforeEach(async () => {
      configManager = new ConfigManager();
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
      await configManager.loadConfig(testConfigPath);
    });

    afterEach(async () => {
      try {
        await fs.unlink(testConfigPath);
      } catch (_error) {
        // ファイルが存在しない場合は無視
      }
    });

    it("should return command config for existing key", () => {
      const command = configManager.getCommand("test");
      expect(command).toEqual({
        workdir: "./",
        command: "echo test",
      });
    });

    it("should throw error for non-existing key", () => {
      expect(() => configManager.getCommand("nonexistent")).toThrow(
        "Command not found: nonexistent",
      );
    });

    it("should throw error when config is not loaded", () => {
      const newConfigManager = new ConfigManager();
      expect(() => newConfigManager.getCommand("test")).toThrow(
        "Config not loaded",
      );
    });
  });

  describe("getOutputDir", () => {
    let configManager: ConfigManager;
    const testConfigPath = path.join(__dirname, "test-config.json");

    beforeEach(async () => {
      configManager = new ConfigManager();
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
      await configManager.loadConfig(testConfigPath);
    });

    afterEach(async () => {
      try {
        await fs.unlink(testConfigPath);
      } catch (_error) {
        // ファイルが存在しない場合は無視
      }
    });

    it("should return output directory", () => {
      const outputDir = configManager.getOutputDir();
      expect(outputDir).toBe("./output");
    });

    it("should throw error when config is not loaded", () => {
      const newConfigManager = new ConfigManager();
      expect(() => newConfigManager.getOutputDir()).toThrow(
        "Config not loaded",
      );
    });
  });

  describe("getAvailableKeys", () => {
    let configManager: ConfigManager;
    const testConfigPath = path.join(__dirname, "test-config.json");

    beforeEach(async () => {
      configManager = new ConfigManager();
      const testConfig = {
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
      await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
      await configManager.loadConfig(testConfigPath);
    });

    afterEach(async () => {
      try {
        await fs.unlink(testConfigPath);
      } catch (_error) {
        // ファイルが存在しない場合は無視
      }
    });

    it("should return available command keys", () => {
      const keys = configManager.getAvailableKeys();
      expect(keys).toEqual(["test", "build"]);
    });

    it("should throw error when config is not loaded", () => {
      const newConfigManager = new ConfigManager();
      expect(() => newConfigManager.getAvailableKeys()).toThrow(
        "Config not loaded",
      );
    });
  });
});
