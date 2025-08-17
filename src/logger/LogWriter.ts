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
    console.log("[DEBUG] writeStreams called with paths:", paths);

    // 出力ディレクトリの作成
    const outputDir = path.dirname(paths.outputPath);
    console.log("[DEBUG] Creating directory:", outputDir);
    await fs.mkdir(outputDir, { recursive: true });

    // ストリームをファイルに書き込み
    console.log("[DEBUG] Creating write streams");
    const outputWrite = createWriteStream(paths.outputPath);
    const errorWrite = createWriteStream(paths.errorPath);

    // ストリームにデータがあるかチェック
    let hasData = false;
    stdout.once("data", () => {
      console.log("[DEBUG] stdout has data");
      hasData = true;
    });
    stderr.once("data", () => {
      console.log("[DEBUG] stderr has data");
      hasData = true;
    });

    console.log("[DEBUG] Starting pipeline");
    await Promise.all([
      pipeline(stdout, outputWrite).then(() =>
        console.log("[DEBUG] stdout pipeline complete"),
      ),
      pipeline(stderr, errorWrite).then(() =>
        console.log("[DEBUG] stderr pipeline complete"),
      ),
    ]);

    console.log("[DEBUG] All pipelines complete, hasData:", hasData);

    // ファイルの存在とサイズを確認
    const stats = await fs.stat(paths.outputPath);
    console.log("[DEBUG] Output file size:", stats.size);
  }
}
