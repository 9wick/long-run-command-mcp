import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Config } from "../config/ConfigManager.ts";
import { execute } from "./CommandExecutor.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      expect(result).toHaveProperty("executionTimeMs");
      expect(result.executionTimeMs).toBeGreaterThan(0);
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

  describe("additionalArgs security", () => {
    const testOutputDir = path.join(__dirname, "test-output-security");
    const securityConfig: Config = {
      outputdir: testOutputDir,
      commands: {
        echo_no_args: {
          workdir: __dirname,
          command: "echo",
        },
        echo_with_args: {
          workdir: __dirname,
          command: "echo",
          additionalArgs: true,
        },
      },
    };

    it("should reject additional args when not allowed", async () => {
      await expect(
        execute(
          { key: "echo_no_args", additionalArgs: ["arg1"] },
          securityConfig,
        ),
      ).rejects.toThrow(
        "Additional arguments are not allowed for command: echo_no_args",
      );
    });

    it("should reject shell operators in additional arguments", async () => {
      await fs.mkdir(testOutputDir, { recursive: true });

      const dangerousArgs = [
        ["test && rm -rf /"],
        ["test | cat /etc/passwd"],
        ["test; cat /etc/passwd"],
        ["test > /tmp/evil"],
        ["$(cat /etc/passwd)"],
        ["`cat /etc/passwd`"],
        ["$HOME"],
        ["test\ncat /etc/passwd"],
      ];

      for (const args of dangerousArgs) {
        await expect(
          execute(
            { key: "echo_with_args", additionalArgs: args },
            securityConfig,
          ),
        ).rejects.toThrow("Invalid characters in additional arguments");
      }

      await fs.rm(testOutputDir, { recursive: true }).catch(() => {});
    });

    it("should allow safe additional arguments", async () => {
      await fs.mkdir(testOutputDir, { recursive: true });

      const safeArgs = [
        ["hello"],
        ["world"],
        ["hello-world"],
        ["hello_world"],
        ["hello.world"],
        ["123"],
        ["/path/to/file.txt"],
        ["--option=value"],
        ["-f"],
      ];

      for (const args of safeArgs) {
        const result = await execute(
          { key: "echo_with_args", additionalArgs: args },
          securityConfig,
        );
        expect(result).toHaveProperty("exitCode");
        expect(result).toHaveProperty("executionTimeMs");
        expect(result.executionTimeMs).toBeGreaterThan(0);
        expect(result.exitCode).toBe(0);
      }

      await fs.rm(testOutputDir, { recursive: true }).catch(() => {});
    });

    it("should handle multiple safe arguments", async () => {
      await fs.mkdir(testOutputDir, { recursive: true });

      const result = await execute(
        {
          key: "echo_with_args",
          additionalArgs: ["hello", "world", "--verbose"],
        },
        securityConfig,
      );
      expect(result).toHaveProperty("exitCode");
      expect(result).toHaveProperty("executionTimeMs");
      expect(result.executionTimeMs).toBeGreaterThan(0);
      expect(result.exitCode).toBe(0);

      await fs.rm(testOutputDir, { recursive: true }).catch(() => {});
    });

    it("should reject if any argument contains dangerous characters", async () => {
      await fs.mkdir(testOutputDir, { recursive: true });

      await expect(
        execute(
          {
            key: "echo_with_args",
            additionalArgs: ["safe", "test && dangerous", "also-safe"],
          },
          securityConfig,
        ),
      ).rejects.toThrow("Invalid characters in additional arguments");

      await fs.rm(testOutputDir, { recursive: true }).catch(() => {});
    });
  });
});
