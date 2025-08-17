import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { Config } from "../config/ConfigManager.ts";
import { createLogPaths } from "../logger/LogWriter.ts";

export interface ExecutionRequest {
  key: string;
  additionalArgs?: string[];
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

function validateAdditionalArgs(args: string[]): void {
  // Dangerous characters and patterns that could lead to shell injection
  const dangerousPatterns = [
    /[;&|<>`$]/, // Shell operators and command substitution
    /\n|\r/, // Newlines
    /\$\(/, // Command substitution $(...)
    /\$\{/, // Variable expansion ${...}
  ];

  for (const arg of args) {
    for (const pattern of dangerousPatterns) {
      if (pattern.test(arg)) {
        throw new Error("Invalid characters in additional arguments");
      }
    }
  }
}

function executeCommand(
  command: string,
  workdir: string,
  logPaths: { outputPath: string; errorPath: string },
  additionalArgs?: string[],
): Promise<ExecutionResult> {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const shell = isWindows ? "cmd.exe" : "/bin/sh";

    const fullCommand =
      additionalArgs && additionalArgs.length > 0
        ? `${command} ${additionalArgs.map((arg) => `"${arg.replace(/"/g, '\\"')}"`).join(" ")}`
        : command;
    const redirectCommand = `${fullCommand} > "${logPaths.outputPath}" 2> "${logPaths.errorPath}"`;
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
  const { key, additionalArgs } = request;
  const command = config.commands[key];

  if (!command) {
    throw new Error(`Unknown command key: ${key}`);
  }

  if (additionalArgs && additionalArgs.length > 0) {
    if (!command.additionalArgs) {
      throw new Error(
        `Additional arguments are not allowed for command: ${key}`,
      );
    }
    validateAdditionalArgs(additionalArgs);
  }

  await validateWorkdir(command.workdir);

  const logPaths = createLogPaths(key, config.outputdir);

  const outputDir = path.dirname(logPaths.outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  return executeCommand(
    command.command,
    command.workdir,
    logPaths,
    additionalArgs,
  );
}
