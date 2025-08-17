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

    // 出力ディレクトリを作成
    const outputDir = path.dirname(logPaths.outputPath);
    await fs.mkdir(outputDir, { recursive: true });

    // コマンド実行
    return new Promise((resolve, reject) => {
      // シェルのリダイレクトを使用してファイルに直接出力
      const isWindows = process.platform === "win32";
      const shell = isWindows ? "cmd.exe" : "/bin/sh";

      // コマンドにリダイレクトを追加
      const redirectCommand = `${command.command} > "${logPaths.outputPath}" 2> "${logPaths.errorPath}"`;
      const shellArgs = isWindows
        ? ["/c", redirectCommand]
        : ["-c", redirectCommand];

      console.log(`[DEBUG] Executing with redirect: ${redirectCommand}`);

      const childProcess = spawn(shell, shellArgs, {
        cwd: absoluteWorkdir,
        stdio: "inherit", // 親プロセスのstdioを継承（ただし、リダイレクトされる）
      });

      childProcess.on("error", (error) => {
        reject(new Error(`Command execution failed: ${error.message}`));
      });

      childProcess.on("exit", async (code) => {
        // ファイルが確実に書き込まれるまで少し待機
        await new Promise((resolve) => setTimeout(resolve, 100));

        resolve({
          outputPath: logPaths.outputPath,
          errorPath: logPaths.errorPath,
          exitCode: code || 0,
        });
      });
    });
  }
}
