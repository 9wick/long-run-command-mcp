// 副作用: なし
export interface Config {
  outputdir: string;
  commands: Record<string, CommandConfig>;
}

export interface CommandConfig {
  workdir: string;
  command: string;
}

export interface ExecutionRequest {
  key: string;
}

export interface ExecutionResult {
  outputPath: string;
  errorPath: string;
  exitCode: number;
}

export interface LogPaths {
  outputPath: string;
  errorPath: string;
}
