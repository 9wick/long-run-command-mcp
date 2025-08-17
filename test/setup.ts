import dotenv from "dotenv";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

// テスト環境用の環境変数を設定
dotenv.config({ path: ".env.test" });

// グローバルなセットアップ
beforeAll(() => {
  console.log("Starting test suite...");
});

// 各テスト後のクリーンアップ
afterEach(() => {
  // モックをリセット
  vi.clearAllMocks();
});

// グローバルなティアダウン
afterAll(() => {
  console.log("Test suite completed.");
});
