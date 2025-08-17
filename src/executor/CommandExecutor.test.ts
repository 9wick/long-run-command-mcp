import { promises as fs } from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import type { Config } from "../config/ConfigManager";
import { execute } from "./CommandExecutor";

describe("CommandExecutor", () => {
  describe("execute", () => {
    it("should throw error when working directory does not exist", async () => {
      const nonExistentDir = path.join(__dirname, "non-existent-directory");
      const config: Config = {
        outputdir: "./output",
        commands: {
          test: {
            workdir: nonExistentDir,
            command: "echo test",
          },
        },
      };

      await expect(execute({ key: "test" }, config)).rejects.toThrow(
        `Working directory does not exist: ${path.resolve(nonExistentDir)}`,
      );
    });

    it("should throw error when command key does not exist", async () => {
      const config: Config = {
        outputdir: "./output",
        commands: {},
      };

      await expect(execute({ key: "test" }, config)).rejects.toThrow(
        "Unknown command key: test",
      );
    });

    it("should execute simple command successfully", async () => {
      const testOutputDir = path.join(__dirname, "test-output");
      await fs.mkdir(testOutputDir, { recursive: true });

      const config: Config = {
        outputdir: testOutputDir,
        commands: {
          test: {
            workdir: __dirname,
            command: 'echo "test output"',
          },
        },
      };

      const result = await execute({ key: "test" }, config);

      // 結果の確認
      expect(result).toHaveProperty("outputPath");
      expect(result).toHaveProperty("errorPath");
      expect(result.exitCode).toBe(0);

      // ログファイルが作成されていることを確認
      const outputExists = await fs
        .access(result.outputPath)
        .then(() => true)
        .catch(() => false);
      expect(outputExists).toBe(true);

      // 出力内容を確認
      const outputContent = await fs.readFile(result.outputPath, "utf-8");
      expect(outputContent.trim()).toContain("test output");

      // クリーンアップ
      await fs.rm(testOutputDir, { recursive: true }).catch(() => {});
    });

    it("should handle command execution errors", async () => {
      const testOutputDir = path.join(__dirname, "test-output");
      await fs.mkdir(testOutputDir, { recursive: true });

      const config: Config = {
        outputdir: testOutputDir,
        commands: {
          test: {
            workdir: __dirname,
            command: "nonexistentcommand123",
          },
        },
      };

      const result = await execute({ key: "test" }, config);

      // エラーでもexitCodeが返されることを確認
      expect(result.exitCode).not.toBe(0);

      // クリーンアップ
      await fs.rm(testOutputDir, { recursive: true }).catch(() => {});
    });
  });
});
