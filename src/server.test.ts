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
        {},
        expect.any(Function),
      );
      expect(toolSpy).toHaveBeenCalledWith(
        "run_build",
        "Execute build command: npm run build (workdir: /build)",
        {},
        expect.any(Function),
      );
    });
  });
});
