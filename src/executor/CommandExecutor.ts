import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { ConfigManager } from "../config/ConfigManager";
import { LogWriter } from "../logger/LogWriter";
import { ExecutionRequest, ExecutionResult } from "../types";

export class CommandExecutor {
  private logWriter: LogWriter;

  constructor(private configManager: ConfigManager) {
    this.logWriter = new LogWriter(configManager);
  }

  // 副作用: あり（プロセス実行、ファイル書き込み）
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const { key } = request;
    const command = this.configManager.getCommand(key);

    // 作業ディレクトリの検証
    const absoluteWorkdir = path.resolve(command.workdir);
    try {
      await fs.access(absoluteWorkdir);
    } catch {
      throw new Error(`Working directory does not exist: ${absoluteWorkdir}`);
    }

    // ログパスの生成
    const logPaths = this.logWriter.createLogPaths(key);

    // コマンド実行
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.command.split(" ");

      const childProcess = spawn(cmd, args, {
        cwd: absoluteWorkdir,
        shell: true,
      });

      // ストリームをログファイルに書き込み
      let writePromise: Promise<void> | undefined;
      if (childProcess.stdout && childProcess.stderr) {
        writePromise = this.logWriter
          .writeStreams(childProcess.stdout, childProcess.stderr, logPaths)
          .catch(reject);
      }

      childProcess.on("error", (error) => {
        reject(new Error(`Command execution failed: ${error.message}`));
      });

      childProcess.on("exit", async (code) => {
        // ストリームの書き込み完了を待つ
        if (writePromise) {
          try {
            await writePromise;
          } catch (error) {
            // エラーは既に reject で処理されている
            return;
          }
        }
        
        resolve({
          outputPath: logPaths.outputPath,
          errorPath: logPaths.errorPath,
          exitCode: code || 0,
        });
      });
    });
  }
}
