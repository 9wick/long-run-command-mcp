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

    it("should load config and connect to transport", async () => {
      // ConfigManagerのloadConfigをモック
      const configManager = (server as any).configManager;
      const loadConfigSpy = vi
        .spyOn(configManager, "loadConfig")
        .mockResolvedValue(undefined);

      // transport.startをモック
      const transport = (server as any).transport;
      vi.spyOn(transport, "start").mockResolvedValue(undefined);

      await server.start();

      // 設定ファイルが読み込まれたことを確認
      expect(loadConfigSpy).toHaveBeenCalledWith("./config.json");

      // mcpServerが存在することを確認
      const mcpServer = (server as any).mcpServer;
      expect(mcpServer).toBeDefined();
    });
  });
});
