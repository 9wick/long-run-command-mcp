import { createWriteStream, promises as fs } from "node:fs";
import * as path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export interface LogPaths {
  outputPath: string;
  errorPath: string;
}

/**
 * キー名をファイル名として安全な文字列にサニタイズします
 * @param key - サニタイズするキー名
 * @returns サニタイズされたキー名
 */
function sanitizeKey(key: string): string {
  // パストラバーサル攻撃を防ぐため、危険な文字列を除去
  let sanitized = key
    // パス区切り文字とパストラバーサルパターンを除去
    .replace(/\.\./g, "")
    .replace(/[/\\]/g, "_")
    // 制御文字とnull文字を除去
    // biome-ignore lint/suspicious/noControlCharactersInRegex: 制御文字の除去は意図的
    .replace(/[\x00-\x1f\x7f]/g, "")
    // その他の危険な文字を除去
    .replace(/[<>:"|?*]/g, "_")
    // 連続するアンダースコアを1つに
    .replace(/_+/g, "_")
    // 先頭と末尾の空白文字とアンダースコアを除去
    .trim()
    .replace(/^_+|_+$/g, "");

  // ドットのみの文字列も除去（. や .. など）
  if (sanitized.match(/^\.+$/)) {
    sanitized = "";
  }

  // サニタイズ後に空文字列になった場合はデフォルト値を使用
  if (!sanitized) {
    sanitized = "default";
  }

  // ファイル名の長さ制限（一般的なファイルシステムの制限を考慮）
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  return sanitized;
}

export function createLogPaths(key: string, outputDir: string): LogPaths {
  const timestamp = Date.now();
  const sanitizedKey = sanitizeKey(key);

  return {
    outputPath: path.join(outputDir, `${timestamp}-${sanitizedKey}-output.log`),
    errorPath: path.join(outputDir, `${timestamp}-${sanitizedKey}-error.log`),
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
