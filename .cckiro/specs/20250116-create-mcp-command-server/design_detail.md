# MCPコマンド実行サーバー 詳細設計書

## 概要

本設計書は、MCPコマンド実行サーバーの詳細設計を定義します。@modelcontextprotocol/sdk を使用し、事前定義されたコマンドをキー指定で実行する機能を実装します。

## ファイル構成

```
src/
├── index.ts                 # エントリーポイント
├── server.ts               # MCPサーバー実装
├── types/
│   └── index.ts            # 型定義
├── config/
│   └── ConfigManager.ts    # 設定管理
├── executor/
│   └── CommandExecutor.ts  # コマンド実行
└── logger/
    └── LogWriter.ts        # ログ出力
```

## 各レイヤー・クラスの詳細設計

### 1. エントリーポイント (src/index.ts)

**責務**: サーバーの起動とシャットダウン管理

```typescript
// 副作用: あり（プロセス起動）
async function main(): Promise<void> {
  const configPath = process.env.CONFIG_PATH || './config.json';
  const server = new CommandExecutionServer(configPath);
  
  await server.start();
  
  // グレースフルシャットダウン
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });
}
```

### 2. 型定義 (src/types/index.ts)

**責務**: 共通型定義

```typescript
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
```

### 3. MCPサーバー実装 (src/server.ts)

**責務**: MCPプロトコルの実装とツール登録

```typescript
import { McpServer } from '@modelcontextprotocol/sdk';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/transport/stdio.js';
import { z } from 'zod';

export class CommandExecutionServer {
  private server: McpServer;
  private configManager: ConfigManager;
  private executor: CommandExecutor;
  private transport: StdioServerTransport;
  
  constructor(configPath: string) {
    this.server = new McpServer({
      name: 'long-run-command-mcp',
      version: '1.0.0'
    });
    this.configManager = new ConfigManager();
    this.executor = new CommandExecutor(this.configManager);
    this.transport = new StdioServerTransport();
  }
  
  // 副作用: あり（サーバー起動、設定ファイル読み込み）
  async start(): Promise<void> {
    await this.configManager.loadConfig(this.configPath);
    
    // ツール登録
    this.server.registerTool(
      'execute_command',
      {
        title: 'Execute Command',
        description: 'Execute a predefined command by key',
        inputSchema: {
          key: z.string().describe('Command key to execute')
        }
      },
      async ({ key }: { key: string }): Promise<{ content: Array<{ type: string; text: string }> }> => {
        try {
          const result = await this.executor.execute({ key });
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                outputPath: result.outputPath,
                errorPath: result.errorPath,
                exitCode: result.exitCode
              }, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text', 
              text: JSON.stringify({
                success: false,
                error: error.message
              }, null, 2)
            }]
          };
        }
      }
    );
    
    // 利用可能なコマンド一覧を返すツール
    this.server.registerTool(
      'list_commands',
      {
        title: 'List Available Commands',
        description: 'List all available command keys',
        inputSchema: {}
      },
      async (): Promise<{ content: Array<{ type: string; text: string }> }> => {
        const commands = this.configManager.getAvailableKeys();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              availableCommands: commands
            }, null, 2)
          }]
        };
      }
    );
    
    await this.server.start(this.transport);
  }
  
  // 副作用: あり（サーバー停止）
  async stop(): Promise<void> {
    await this.transport.close();
  }
}
```

### 4. 設定管理 (src/config/ConfigManager.ts)

**責務**: 設定ファイルの読み込みと管理

```typescript
import { promises as fs } from 'fs';
import * as path from 'path';
import { Config, CommandConfig } from '../types';

export class ConfigManager {
  private config: Config | null = null;
  
  // 副作用: あり（ファイル読み込み）
  async loadConfig(configPath: string): Promise<void> {
    const absolutePath = path.resolve(configPath);
    
    try {
      const content = await fs.readFile(absolutePath, 'utf-8');
      const parsedConfig = JSON.parse(content);
      
      // バリデーション
      this.validateConfig(parsedConfig);
      this.config = parsedConfig;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Config file not found: ${absolutePath}`);
      }
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in config file: ${error.message}`);
      }
      throw error;
    }
  }
  
  // 副作用: なし
  private validateConfig(config: any): void {
    if (!config.outputdir || typeof config.outputdir !== 'string') {
      throw new Error('Config validation error: outputdir is required and must be a string');
    }
    
    if (!config.commands || typeof config.commands !== 'object') {
      throw new Error('Config validation error: commands is required and must be an object');
    }
    
    for (const [key, command] of Object.entries(config.commands)) {
      if (!command.workdir || typeof command.workdir !== 'string') {
        throw new Error(`Config validation error: commands.${key}.workdir is required and must be a string`);
      }
      if (!command.command || typeof command.command !== 'string') {
        throw new Error(`Config validation error: commands.${key}.command is required and must be a string`);
      }
    }
  }
  
  // 副作用: なし
  getCommand(key: string): CommandConfig {
    if (!this.config) {
      throw new Error('Config not loaded');
    }
    
    const command = this.config.commands[key];
    if (!command) {
      throw new Error(`Command not found: ${key}`);
    }
    
    return command;
  }
  
  // 副作用: なし
  getOutputDir(): string {
    if (!this.config) {
      throw new Error('Config not loaded');
    }
    return this.config.outputdir;
  }
  
  // 副作用: なし
  getAvailableKeys(): string[] {
    if (!this.config) {
      throw new Error('Config not loaded');
    }
    return Object.keys(this.config.commands);
  }
}
```

### 5. コマンド実行 (src/executor/CommandExecutor.ts)

**責務**: コマンドの実行とプロセス管理

```typescript
import { spawn } from 'child_process';
import * as path from 'path';
import { promises as fs } from 'fs';
import { ExecutionRequest, ExecutionResult } from '../types';
import { ConfigManager } from '../config/ConfigManager';
import { LogWriter } from '../logger/LogWriter';

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
      const [cmd, ...args] = command.command.split(' ');
      
      const childProcess = spawn(cmd, args, {
        cwd: absoluteWorkdir,
        shell: true
      });
      
      // ストリームをログファイルに書き込み
      this.logWriter.writeStreams(
        childProcess.stdout,
        childProcess.stderr,
        logPaths
      ).catch(reject);
      
      childProcess.on('error', (error) => {
        reject(new Error(`Command execution failed: ${error.message}`));
      });
      
      childProcess.on('exit', (code) => {
        resolve({
          outputPath: logPaths.outputPath,
          errorPath: logPaths.errorPath,
          exitCode: code || 0
        });
      });
    });
  }
}
```

### 6. ログ出力 (src/logger/LogWriter.ts)

**責務**: ログファイルの作成と管理

```typescript
import { promises as fs } from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { LogPaths } from '../types';
import { ConfigManager } from '../config/ConfigManager';

export class LogWriter {
  constructor(private configManager: ConfigManager) {}
  
  // 副作用: なし
  createLogPaths(key: string): LogPaths {
    const outputDir = this.configManager.getOutputDir();
    const timestamp = Date.now();
    
    return {
      outputPath: path.join(outputDir, `${timestamp}-${key}-output.log`),
      errorPath: path.join(outputDir, `${timestamp}-${key}-error.log`)
    };
  }
  
  // 副作用: あり（ファイル書き込み）
  async writeStreams(
    stdout: Readable,
    stderr: Readable,
    paths: LogPaths
  ): Promise<void> {
    // 出力ディレクトリの作成
    const outputDir = path.dirname(paths.outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    
    // ストリームをファイルに書き込み
    const outputWrite = createWriteStream(paths.outputPath);
    const errorWrite = createWriteStream(paths.errorPath);
    
    await Promise.all([
      pipeline(stdout, outputWrite),
      pipeline(stderr, errorWrite)
    ]);
  }
}
```

## テスト設計

### Unit Tests

#### ConfigManager テスト (src/config/ConfigManager.test.ts)
- ✅ 正常な設定ファイルの読み込み
- ✅ 存在しないファイルのエラーハンドリング
- ✅ 不正なJSONのエラーハンドリング
- ✅ 必須フィールド欠落時のバリデーションエラー
- ✅ getCommand で存在するキーを取得
- ✅ getCommand で存在しないキーのエラー
- ✅ getAvailableKeys でキー一覧取得

#### LogWriter テスト (src/logger/LogWriter.test.ts)
- ✅ createLogPaths で正しいパス生成
- ✅ タイムスタンプの一意性
- ✅ writeStreams でディレクトリ作成
- ✅ ストリームの正常書き込み

#### CommandExecutor テスト (src/executor/CommandExecutor.test.ts)
- ✅ 正常なコマンド実行
- ✅ 存在しない作業ディレクトリのエラー
- ✅ コマンド実行失敗時のエラーハンドリング
- ✅ 終了コードの正しい取得

### Integration Tests

#### MCP Server テスト (src/server.test.ts)
- ✅ execute_command ツールの正常実行
- ✅ list_commands ツールでコマンド一覧取得
- ✅ 存在しないキーでのエラーレスポンス
- ✅ MCPプロトコル準拠の確認

### E2E Tests

#### 実環境テスト (test/e2e/server.e2e.test.ts)
- ✅ 実際のMCPクライアントからの接続
- ✅ 複数コマンドの連続実行
- ✅ ログファイルの実際の出力確認
- ✅ 長時間実行コマンドの処理

## エラーハンドリング戦略

1. **設定エラー**: 起動時に検出し、詳細なエラーメッセージで終了
2. **実行時エラー**: MCPレスポンスにエラー情報を含めて返却
3. **システムエラー**: ログに記録し、可能な限り継続動作

---

この詳細設計ファイルに問題がないか確認してください。修正が必要な点があればお知らせください。