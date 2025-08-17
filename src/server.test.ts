import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandExecutionServer } from "./server";

describe("CommandExecutionServer", () => {
  describe("constructor", () => {
    it("should create an instance", () => {
      const server = new CommandExecutionServer("./config.json");
      expect(server).toBeInstanceOf(CommandExecutionServer);
    });
  });

  describe("start", () => {
    let server: CommandExecutionServer;

    beforeEach(() => {
      server = new CommandExecutionServer("./config.json");
    });

    it("should load config and register tools dynamically", async () => {
      // ConfigManagerのloadConfigをモック
      const configManager = (server as any).configManager;
      const loadConfigSpy = vi
        .spyOn(configManager, "loadConfig")
        .mockResolvedValue(undefined);

      // getAvailableKeysとgetCommandをモック
      vi.spyOn(configManager, "getAvailableKeys").mockReturnValue([
        "test_command",
        "build",
      ]);
      vi.spyOn(configManager, "getCommand")
        .mockReturnValueOnce({ command: "npm test", workdir: "/test" })
        .mockReturnValueOnce({ command: "npm run build", workdir: "/build" });

      // transport.startをモック
      const transport = (server as any).transport;
      vi.spyOn(transport, "start").mockResolvedValue(undefined);

      // mcpServer.toolをモック
      const mcpServer = (server as any).mcpServer;
      const toolSpy = vi.spyOn(mcpServer, "tool");

      await server.start();

      // 設定ファイルが読み込まれたことを確認
      expect(loadConfigSpy).toHaveBeenCalledWith("./config.json");

      // 各コマンドに対してツールが登録されたことを確認
      expect(toolSpy).toHaveBeenCalledWith(
        "run_test_command",
        "Execute test_command command: npm test (workdir: /test)",
        {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        expect.any(Function),
      );
      expect(toolSpy).toHaveBeenCalledWith(
        "run_build",
        "Execute build command: npm run build (workdir: /build)",
        {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        expect.any(Function),
      );
    });

    it("should sanitize tool names with special characters", async () => {
      const configManager = (server as any).configManager;
      vi.spyOn(configManager, "loadConfig").mockResolvedValue(undefined);
      vi.spyOn(configManager, "getAvailableKeys").mockReturnValue([
        "test:command",
        "build/deploy",
      ]);
      vi.spyOn(configManager, "getCommand")
        .mockReturnValueOnce({ command: "npm test", workdir: "/test" })
        .mockReturnValueOnce({ command: "npm deploy", workdir: "/deploy" });

      const transport = (server as any).transport;
      vi.spyOn(transport, "start").mockResolvedValue(undefined);

      const mcpServer = (server as any).mcpServer;
      const toolSpy = vi.spyOn(mcpServer, "tool");

      await server.start();

      expect(toolSpy).toHaveBeenCalledWith(
        "run_test_command",
        expect.any(String),
        expect.any(Object),
        expect.any(Function),
      );
      expect(toolSpy).toHaveBeenCalledWith(
        "run_build_deploy",
        expect.any(String),
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("tool handler returns success JSON", async () => {
      const configManager = (server as any).configManager;
      vi.spyOn(configManager, "loadConfig").mockResolvedValue(undefined);
      vi.spyOn(configManager, "getAvailableKeys").mockReturnValue(["build"]);
      vi.spyOn(configManager, "getCommand").mockReturnValue({
        command: "npm run build",
        workdir: "/build",
      });

      const transport = (server as any).transport;
      vi.spyOn(transport, "start").mockResolvedValue(undefined);

      const executor = (server as any).executor;
      vi.spyOn(executor, "execute").mockResolvedValue({
        outputPath: "/tmp/out.log",
        errorPath: "/tmp/err.log",
        exitCode: 0,
      });

      const mcpServer = (server as any).mcpServer;
      const toolSpy = vi.spyOn(mcpServer, "tool");

      await server.start();

      const handler = toolSpy.mock.calls[0][3] as () => Promise<any>;
      const result = await handler();
      const text = (result.content[0] as any).text;
      const parsed = JSON.parse(text);
      expect(parsed).toEqual({
        success: true,
        outputPath: "/tmp/out.log",
        errorPath: "/tmp/err.log",
        exitCode: 0,
      });
    });

    it("tool handler returns error JSON", async () => {
      const configManager = (server as any).configManager;
      vi.spyOn(configManager, "loadConfig").mockResolvedValue(undefined);
      vi.spyOn(configManager, "getAvailableKeys").mockReturnValue(["build"]);
      vi.spyOn(configManager, "getCommand").mockReturnValue({
        command: "npm run build",
        workdir: "/build",
      });

      const transport = (server as any).transport;
      vi.spyOn(transport, "start").mockResolvedValue(undefined);

      const executor = (server as any).executor;
      vi.spyOn(executor, "execute").mockRejectedValue(new Error("boom"));

      const mcpServer = (server as any).mcpServer;
      const toolSpy = vi.spyOn(mcpServer, "tool");

      await server.start();

      const handler = toolSpy.mock.calls[0][3] as () => Promise<any>;
      const result = await handler();
      const text = (result.content[0] as any).text;
      const parsed = JSON.parse(text);
      expect(parsed).toEqual({
        success: false,
        error: "boom",
      });
    });
  });
});
