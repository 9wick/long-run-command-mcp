import { promises as fs } from "node:fs";
import * as path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigManager } from "../config/ConfigManager";
import { CommandExecutor } from "./CommandExecutor";

describe("CommandExecutor", () => {
  describe("constructor", () => {
    it("should create an instance", () => {
      const configManager = new ConfigManager();
      const executor = new CommandExecutor(configManager);
      expect(executor).toBeInstanceOf(CommandExecutor);
    });
  });

  describe("execute", () => {
    let executor: CommandExecutor;
    let configManager: ConfigManager;

    beforeEach(() => {
      configManager = new ConfigManager();
      executor = new CommandExecutor(configManager);
    });

    it("should throw error when working directory does not exist", async () => {
      const nonExistentDir = path.join(__dirname, "non-existent-directory");
      vi.spyOn(configManager, "getCommand").mockReturnValue({
        workdir: nonExistentDir,
        command: "echo test",
      });

      await expect(executor.execute({ key: "test" })).rejects.toThrow(
        `Working directory does not exist: ${path.resolve(nonExistentDir)}`,
      );
    });

    it("should execute simple command successfully", async () => {
      const testOutputDir = path.join(__dirname, "test-output");

      // 出力ディレクトリを返すようにモック
      vi.spyOn(configManager, "getOutputDir").mockReturnValue(testOutputDir);
      vi.spyOn(configManager, "getCommand").mockReturnValue({
        workdir: __dirname,
        command: 'echo "test output"',
      });

      const result = await executor.execute({ key: "test" });

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

      vi.spyOn(configManager, "getOutputDir").mockReturnValue(testOutputDir);
      vi.spyOn(configManager, "getCommand").mockReturnValue({
        workdir: __dirname,
        command: "nonexistentcommand123",
      });

      const result = await executor.execute({ key: "test" });

      // エラーでもexitCodeが返されることを確認
      expect(result.exitCode).not.toBe(0);

      // クリーンアップ
      await fs.rm(testOutputDir, { recursive: true }).catch(() => {});
    });
  });
});
