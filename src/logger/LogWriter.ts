import { createWriteStream, promises as fs } from "node:fs";
import * as path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { LogPaths } from "../types";

export function createLogPaths(key: string, outputDir: string): LogPaths {
  const timestamp = Date.now();

  return {
    outputPath: path.join(outputDir, `${timestamp}-${key}-output.log`),
    errorPath: path.join(outputDir, `${timestamp}-${key}-error.log`),
  };
}

export async function writeStreams(
  stdout: Readable,
  stderr: Readable,
  paths: LogPaths,
): Promise<void> {
  const outputDir = path.dirname(paths.outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  const outputWrite = createWriteStream(paths.outputPath);
  const errorWrite = createWriteStream(paths.errorPath);

  await Promise.all([
    pipeline(stdout, outputWrite),
    pipeline(stderr, errorWrite),
  ]);
}
