import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as ConfigManager from "./config/ConfigManager.ts";
import * as CommandExecutor from "./executor/CommandExecutor.ts";
import { startServer } from "./server.ts";

vi.mock("@modelcontextprotocol/sdk/server/mcp.js");
vi.mock("@modelcontextprotocol/sdk/server/stdio.js");
vi.mock("./config/ConfigManager.ts");
vi.mock("./executor/CommandExecutor.ts");

describe("startServer", () => {
  let mockMcpServer: any;
  let mockTransport: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMcpServer = {
      tool: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    };

    mockTransport = {
      start: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(McpServer).mockImplementation(() => mockMcpServer);
    vi.mocked(StdioServerTransport).mockImplementation(() => mockTransport);
  });

  it("should load config and register tools dynamically", async () => {
    const mockConfig = {
      outputdir: "./output",
      commands: {
        test_command: { command: "npm test", workdir: "/test" },
        build: { command: "npm run build", workdir: "/build" },
      },
    };

    vi.mocked(ConfigManager.loadConfig).mockResolvedValue(mockConfig);
    vi.mocked(ConfigManager.getAvailableKeys).mockReturnValue([
      "test_command",
      "build",
    ]);
    vi.mocked(ConfigManager.getCommand)
      .mockReturnValueOnce({ command: "npm test", workdir: "/test" })
      .mockReturnValueOnce({ command: "npm run build", workdir: "/build" });

    const stopServer = await startServer("./config.json");

    // 設定ファイルが読み込まれたことを確認
    expect(ConfigManager.loadConfig).toHaveBeenCalledWith("./config.json");

    // 各コマンドに対してツールが登録されたことを確認
    expect(mockMcpServer.tool).toHaveBeenCalledWith(
      "run_test_command",
      "Execute npm test (workdir: /test)",
      expect.any(Function),
    );
    expect(mockMcpServer.tool).toHaveBeenCalledWith(
      "run_build",
      "Execute npm run build (workdir: /build)",
      expect.any(Function),
    );

    // サーバーが接続されたことを確認
    expect(mockMcpServer.connect).toHaveBeenCalledWith(mockTransport);

    // stopServer関数が返されたことを確認
    expect(typeof stopServer).toBe("function");
  });

  it("should sanitize tool names with special characters", async () => {
    const mockConfig = {
      outputdir: "./output",
      commands: {
        "test:command": { command: "npm test", workdir: "/test" },
        "build/deploy": { command: "npm deploy", workdir: "/deploy" },
      },
    };

    vi.mocked(ConfigManager.loadConfig).mockResolvedValue(mockConfig);
    vi.mocked(ConfigManager.getAvailableKeys).mockReturnValue([
      "test:command",
      "build/deploy",
    ]);
    vi.mocked(ConfigManager.getCommand)
      .mockReturnValueOnce({ command: "npm test", workdir: "/test" })
      .mockReturnValueOnce({ command: "npm deploy", workdir: "/deploy" });

    await startServer("./config.json");

    expect(mockMcpServer.tool).toHaveBeenCalledWith(
      "run_test_command",
      expect.any(String),
      expect.any(Function),
    );
    expect(mockMcpServer.tool).toHaveBeenCalledWith(
      "run_build_deploy",
      expect.any(String),
      expect.any(Function),
    );
  });

  it("tool handler returns success JSON", async () => {
    const mockConfig = {
      outputdir: "./output",
      commands: {
        build: { command: "npm run build", workdir: "/build" },
      },
    };

    vi.mocked(ConfigManager.loadConfig).mockResolvedValue(mockConfig);
    vi.mocked(ConfigManager.getAvailableKeys).mockReturnValue(["build"]);
    vi.mocked(ConfigManager.getCommand).mockReturnValue({
      command: "npm run build",
      workdir: "/build",
    });
    vi.mocked(CommandExecutor.execute).mockResolvedValue({
      outputPath: "/tmp/out.log",
      errorPath: "/tmp/err.log",
      exitCode: 0,
      executionTimeMs: 1234,
    });

    await startServer("./config.json");

    const handler = mockMcpServer.tool.mock.calls[0][2] as () => Promise<any>;
    const result = await handler({});
    const text = (result.content[0] as any).text;
    const parsed = JSON.parse(text);
    expect(parsed).toEqual({
      success: true,
      command: "npm run build",
      workdir: "/build",
      outputPath: "/tmp/out.log",
      errorPath: "/tmp/err.log",
      exitCode: 0,
      executionTimeMs: 1234,
    });
  });

  it("tool handler returns error JSON", async () => {
    const mockConfig = {
      outputdir: "./output",
      commands: {
        build: { command: "npm run build", workdir: "/build" },
      },
    };

    vi.mocked(ConfigManager.loadConfig).mockResolvedValue(mockConfig);
    vi.mocked(ConfigManager.getAvailableKeys).mockReturnValue(["build"]);
    vi.mocked(ConfigManager.getCommand).mockReturnValue({
      command: "npm run build",
      workdir: "/build",
    });
    vi.mocked(CommandExecutor.execute).mockRejectedValue(new Error("boom"));

    await startServer("./config.json");

    const handler = mockMcpServer.tool.mock.calls[0][2] as () => Promise<any>;
    const result = await handler({});
    const text = (result.content[0] as any).text;
    const parsed = JSON.parse(text);
    expect(parsed).toEqual({
      success: false,
      error: "boom",
    });
  });

  it("stopServer should close the MCP server", async () => {
    const mockConfig = {
      outputdir: "./output",
      commands: {},
    };

    vi.mocked(ConfigManager.loadConfig).mockResolvedValue(mockConfig);
    vi.mocked(ConfigManager.getAvailableKeys).mockReturnValue([]);

    const stopServer = await startServer("./config.json");
    await stopServer();

    expect(mockMcpServer.close).toHaveBeenCalled();
  });
});
