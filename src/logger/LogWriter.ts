import { createWriteStream, promises as fs } from "node:fs";
import * as path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ConfigManager } from "../config/ConfigManager";
import { LogPaths } from "../types";

export class LogWriter {
  constructor(private configManager: ConfigManager) {}

  // 副作用: なし
  createLogPaths(key: string): LogPaths {
    const outputDir = this.configManager.getOutputDir();
    const timestamp = Date.now();

    return {
      outputPath: path.join(outputDir, `${timestamp}-${key}-output.log`),
      errorPath: path.join(outputDir, `${timestamp}-${key}-error.log`),
    };
  }

  // 副作用: あり（ファイル書き込み）
  async writeStreams(
    stdout: Readable,
    stderr: Readable,
    paths: LogPaths,
  ): Promise<void> {
    // 出力ディレクトリの作成
    const outputDir = path.dirname(paths.outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // ストリームをファイルに書き込み
    const outputWrite = createWriteStream(paths.outputPath);
    const errorWrite = createWriteStream(paths.errorPath);

    await Promise.all([
      pipeline(stdout, outputWrite),
      pipeline(stderr, errorWrite),
    ]);
  }
}
