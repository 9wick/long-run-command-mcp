import { promises as fs } from "node:fs";
import * as path from "node:path";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogPaths, writeStreams } from "./LogWriter.ts";

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

    it("should generate different timestamps for different calls", () => {
      const outputDir = "./output";
      const spy = vi
        .spyOn(Date, "now")
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1001);

      const paths1 = createLogPaths("test1", outputDir);
      const paths2 = createLogPaths("test2", outputDir);

      spy.mockRestore();

      expect(paths1.outputPath).not.toBe(paths2.outputPath);
      expect(paths1.errorPath).not.toBe(paths2.errorPath);
      expect(paths1.outputPath).toMatch(/1000-test1-output\.log$/);
      expect(paths2.outputPath).toMatch(/1001-test2-output\.log$/);
    });

    describe("key sanitization", () => {
      it("should remove path traversal patterns", () => {
        const testCases = [
          { input: "../test", expected: "test" },
          { input: "..\\test", expected: "test" },
          { input: "test/../file", expected: "test_file" },
          { input: "test\\..\\file", expected: "test_file" },
        ];

        testCases.forEach(({ input, expected }) => {
          const paths = createLogPaths(input, "./output");
          expect(paths.outputPath).toMatch(
            new RegExp(`\\d+-${expected}-output\\.log$`),
          );
          expect(paths.errorPath).toMatch(
            new RegExp(`\\d+-${expected}-error\\.log$`),
          );
        });
      });

      it("should replace path separators with underscores", () => {
        const testCases = [
          { input: "test/file", expected: "test_file" },
          { input: "test\\file", expected: "test_file" },
          { input: "/test/file/", expected: "test_file" },
        ];

        testCases.forEach(({ input, expected }) => {
          const paths = createLogPaths(input, "./output");
          expect(paths.outputPath).toMatch(
            new RegExp(`\\d+-${expected}-output\\.log$`),
          );
        });
      });

      it("should remove dangerous characters", () => {
        const testCases = [
          { input: "test<>file", expected: "test_file" },
          { input: "test:file", expected: "test_file" },
          { input: 'test"file', expected: "test_file" },
          { input: "test|file", expected: "test_file" },
          { input: "test?file", expected: "test_file" },
          { input: "test*file", expected: "test_file" },
        ];

        testCases.forEach(({ input, expected }) => {
          const paths = createLogPaths(input, "./output");
          expect(paths.outputPath).toMatch(
            new RegExp(`\\d+-${expected}-output\\.log$`),
          );
        });
      });

      it("should handle control characters", () => {
        const input = "test\x00\x1f\x7ffile";
        const paths = createLogPaths(input, "./output");
        expect(paths.outputPath).toMatch(/\d+-testfile-output\.log$/);
      });

      it("should handle whitespace and trim properly", () => {
        const testCases = [
          { input: "  test  ", expected: "test" },
          { input: "\ttest\n", expected: "test" },
          { input: " test file ", expected: "test file" },
        ];

        testCases.forEach(({ input, expected }) => {
          const paths = createLogPaths(input, "./output");
          expect(paths.outputPath).toMatch(
            new RegExp(`\\d+-${expected}-output\\.log$`),
          );
        });
      });

      it("should handle empty or invalid keys", () => {
        const testCases = [
          "../",
          "..\\",
          "/",
          "\\",
          "///",
          "...",
          "   ",
          "",
          "\x00\x1f",
        ];

        testCases.forEach((input) => {
          const paths = createLogPaths(input, "./output");
          expect(paths.outputPath).toMatch(/\d+-default-output\.log$/);
          expect(paths.errorPath).toMatch(/\d+-default-error\.log$/);
        });
      });

      it("should collapse multiple underscores", () => {
        const input = "test___file___name";
        const paths = createLogPaths(input, "./output");
        expect(paths.outputPath).toMatch(/\d+-test_file_name-output\.log$/);
      });

      it("should truncate very long keys", () => {
        const longKey = "a".repeat(250);
        const paths = createLogPaths(longKey, "./output");
        const filename = path.basename(paths.outputPath);
        // タイムスタンプと拡張子を除いた部分の長さを確認
        const keyPart = filename.split("-").slice(1, -1).join("-");
        expect(keyPart.length).toBeLessThanOrEqual(200);
      });

      it("should handle complex malicious inputs", () => {
        const maliciousInputs = [
          { input: "../../../etc/passwd", expected: "etc_passwd" },
          {
            input: "..\\..\\..\\windows\\system32",
            expected: "windows_system32",
          },
          { input: "test/../../secret", expected: "test_secret" },
          { input: "C:\\Windows\\System32\\", expected: "C_Windows_System32" },
          { input: "/etc/passwd", expected: "etc_passwd" },
          { input: "\\\\server\\share\\file", expected: "server_share_file" },
        ];

        maliciousInputs.forEach(({ input, expected }) => {
          const paths = createLogPaths(input, "./output");
          expect(paths.outputPath).toMatch(
            new RegExp(`\\d+-${expected}-output\\.log$`),
          );
          // パストラバーサルパターンが含まれていないことを確認
          expect(paths.outputPath).not.toMatch(/\.\./);
          expect(paths.errorPath).not.toMatch(/\.\./);
        });
      });
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
