import { promises as fs } from "node:fs";
import * as path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogPaths, writeStreams } from "./LogWriter";

describe("LogWriter", () => {
  describe("createLogPaths", () => {
    it("should generate correct log paths", () => {
      const key = "test";
      const outputDir = "./output";
      const timestampBefore = Date.now();
      const paths = createLogPaths(key, outputDir);
      const timestampAfter = Date.now();

      // パスの形式を確認
      expect(paths.outputPath).toMatch(/^(\.\/)?output\/\d+-test-output\.log$/);
      expect(paths.errorPath).toMatch(/^(\.\/)?output\/\d+-test-error\.log$/);

      // タイムスタンプが正しい範囲にあることを確認
      const outputTimestamp = parseInt(
        path.basename(paths.outputPath).split("-")[0],
        10,
      );
      const errorTimestamp = parseInt(
        path.basename(paths.errorPath).split("-")[0],
        10,
      );

      expect(outputTimestamp).toBeGreaterThanOrEqual(timestampBefore);
      expect(outputTimestamp).toBeLessThanOrEqual(timestampAfter);
      expect(outputTimestamp).toBe(errorTimestamp);
    });

    it("should generate different timestamps for different calls", async () => {
      const outputDir = "./output";
      const paths1 = createLogPaths("test1", outputDir);
      await new Promise((resolve) => setTimeout(resolve, 5)); // 少し待つ
      const paths2 = createLogPaths("test2", outputDir);

      expect(paths1.outputPath).not.toBe(paths2.outputPath);
      expect(paths1.errorPath).not.toBe(paths2.errorPath);
    });
  });

  describe("writeStreams", () => {
    const testOutputDir = path.join(__dirname, "test-output");

    afterEach(async () => {
      try {
        await fs.rm(testOutputDir, { recursive: true });
      } catch (_error) {
        // ディレクトリが存在しない場合は無視
      }
    });

    it("should create output directory and write streams to files", async () => {
      const stdoutData = "stdout test data";
      const stderrData = "stderr test data";

      const stdout = Readable.from([stdoutData]);
      const stderr = Readable.from([stderrData]);

      const paths = {
        outputPath: path.join(testOutputDir, "test-output.log"),
        errorPath: path.join(testOutputDir, "test-error.log"),
      };

      await writeStreams(stdout, stderr, paths);

      // ディレクトリが作成されたことを確認
      const dirExists = await fs
        .access(testOutputDir)
        .then(() => true)
        .catch(() => false);
      expect(dirExists).toBe(true);

      // ファイルの内容を確認
      const outputContent = await fs.readFile(paths.outputPath, "utf-8");
      const errorContent = await fs.readFile(paths.errorPath, "utf-8");

      expect(outputContent).toBe(stdoutData);
      expect(errorContent).toBe(stderrData);
    });
  });
});
