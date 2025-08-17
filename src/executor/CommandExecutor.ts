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

      console.log(`[DEBUG] Executing command: ${cmd} ${args.join(' ')} in ${absoluteWorkdir}`);

      const childProcess = spawn(cmd, args, {
        cwd: absoluteWorkdir,
        shell: true,
      });

      // デバッグ: ストリームの状態を確認
      console.log(`[DEBUG] stdout: ${childProcess.stdout ? 'exists' : 'null'}`);
      console.log(`[DEBUG] stderr: ${childProcess.stderr ? 'exists' : 'null'}`);

      // ストリームをログファイルに書き込み
      let writePromise: Promise<void> | undefined;
      if (childProcess.stdout && childProcess.stderr) {
        console.log('[DEBUG] Starting writeStreams');
        writePromise = this.logWriter
          .writeStreams(childProcess.stdout, childProcess.stderr, logPaths)
          .catch((err) => {
            console.log('[DEBUG] writeStreams error:', err);
            reject(err);
          });
      } else {
        console.log('[DEBUG] No stdout/stderr available');
      }

      childProcess.on("error", (error) => {
        reject(new Error(`Command execution failed: ${error.message}`));
      });

      childProcess.on("exit", async (code) => {
        console.log(`[DEBUG] Process exited with code: ${code}`);
        
        // ストリームの書き込み完了を待つ
        if (writePromise) {
          try {
            console.log('[DEBUG] Waiting for writePromise');
            await writePromise;
            console.log('[DEBUG] writePromise completed');
          } catch (_error) {
            // エラーは既に reject で処理されている
            console.log('[DEBUG] writePromise failed, already rejected');
            return;
          }
        }
        
        // ファイルの存在確認
        try {
          await fs.access(logPaths.outputPath);
          console.log('[DEBUG] Output file exists');
        } catch {
          console.log('[DEBUG] Output file does NOT exist');
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
