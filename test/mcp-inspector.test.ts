import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { describe, it, expect, afterEach } from "vitest";

describe("MCP Inspector CLI Schema Test", () => {
  let inspectorProcess: ChildProcess;

  afterEach(() => {
    if (inspectorProcess) {
      inspectorProcess.kill();
    }
  });

  it("should expose correct schema for tools with additionalArgs", async () => {
    const configPath = join(__dirname, "fixtures", "test-config.json");
    const serverPath = join(__dirname, "..", "src", "long-run-command-mcp.ts");

    return new Promise<void>((resolve, reject) => {
      let output = "";

      const args = [
        "@modelcontextprotocol/inspector",
        "--cli",
        "npx",
        "tsx",
        serverPath,
        "-c",
        configPath,
        "--method",
        "tools/list"
      ];
      console.log("Running MCP Inspector with npx " + args.join(" "));

      // Run MCP Inspector in CLI mode with tsx
      inspectorProcess = spawn("npx", args, {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: join(__dirname, "..", "..")
      });

      inspectorProcess.stdout?.on("data", (data) => {
        output += data.toString();
      });

      inspectorProcess.stderr?.on("data", (data) => {
        console.error("Inspector stderr:", data.toString());
      });

      inspectorProcess.on("error", reject);

      inspectorProcess.on("close", (code) => {
        console.log("Process exited with code:", code);
        console.log("Output received:", output);

        if (code !== 0) {
          reject(new Error(`Inspector exited with code ${code}`));
          return;
        }

        // Parse the output
        try {
          const toolsData = JSON.parse(output);
          console.log("Tools response:", JSON.stringify(toolsData, null, 2));

          const tools = toolsData.tools || toolsData || [];

          // Check echo_with_args tool
          const echoTool = tools.find((t: any) => t.name === "run_echo_with_args");
          expect(echoTool).toBeDefined();
          expect(echoTool.description).toContain("supports additional arguments");
          expect(echoTool.inputSchema.type).toBe("object");
          expect(echoTool.inputSchema.properties.args).toBeDefined();
          expect(echoTool.inputSchema.properties.args.type).toBe("array");
          expect(echoTool.inputSchema.properties.args.items).toEqual({ type: "string" });
          expect(echoTool.inputSchema.properties.args.description).toBe("Additional arguments to pass to the command");

          // Check ls_no_args tool
          const lsTool = tools.find((t: any) => t.name === "run_ls_no_args");
          expect(lsTool).toBeDefined();
          expect(lsTool.description).not.toContain("supports additional arguments");
          expect(lsTool.inputSchema.type).toBe("object");
          expect(lsTool.inputSchema.properties).toEqual({});

          resolve();
        } catch (e) {
          console.error("Failed to parse output:", e);
          reject(new Error("Failed to parse tools response"));
        }
      });
    });
  }, 10000);
});
