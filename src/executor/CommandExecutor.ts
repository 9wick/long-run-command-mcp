import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { Config } from "../config/ConfigManager.ts";
import { createLogPaths } from "../logger/LogWriter.ts";

export interface ExecutionRequest {
  key: string;
}

export interface ExecutionResult {
  outputPath: string;
  errorPath: string;
  exitCode: number;
}

async function validateWorkdir(workdir: string): Promise<void> {
  const absoluteWorkdir = path.resolve(workdir);
  try {
    await fs.access(absoluteWorkdir);
  } catch {
    throw new Error(`Working directory does not exist: ${absoluteWorkdir}`);
  }
}

function executeCommand(
  command: string,
  workdir: string,
  logPaths: { outputPath: string; errorPath: string },
): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const shell = isWindows ? "cmd.exe" : "/bin/sh";

    const redirectCommand = `${command} > "${logPaths.outputPath}" 2> "${logPaths.errorPath}"`;
    const shellArgs = isWindows
      ? ["/c", redirectCommand]
      : ["-c", redirectCommand];

    const childProcess = spawn(shell, shellArgs, {
      cwd: path.resolve(workdir),
      stdio: "inherit",
    });

    childProcess.on("error", (error) => {
      reject(new Error(`Command execution failed: ${error.message}`));
    });

    childProcess.on("exit", async (code) => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      resolve({
        outputPath: logPaths.outputPath,
        errorPath: logPaths.errorPath,
        exitCode: code || 0,
      });
    });
  });
}

export async function execute(
  request: ExecutionRequest,
  config: Config,
): Promise<ExecutionResult> {
  const { key } = request;
  const command = config.commands[key];

  if (!command) {
    throw new Error(`Unknown command key: ${key}`);
  }

  await validateWorkdir(command.workdir);

  const logPaths = createLogPaths(key, config.outputdir);

  const outputDir = path.dirname(logPaths.outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  return executeCommand(command.command, command.workdir, logPaths);
}
