import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import { readFileSync } from "node:fs";
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

  it("should execute tool with additional arguments", async () => {
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
        "tools/call",
        "--tool-name",
        "run_echo_with_args",
        "--tool-arg",
        "args=[\"hello\",\"world\",\"test\"]"
      ];
      console.log("Running tool call with npx " + args.join(" "));

      // Run MCP Inspector to call the tool
      inspectorProcess = spawn("npx", args, {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: join(__dirname, "..")
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
          const result = JSON.parse(output);
          console.log("Tool call result:", JSON.stringify(result, null, 2));

          // Check the result
          expect(result).toBeDefined();
          expect(result.content).toBeDefined();
          expect(Array.isArray(result.content)).toBe(true);
          
          // Parse the text content
          const textContent = result.content[0];
          expect(textContent.type).toBe("text");
          const executionResult = JSON.parse(textContent.text);
          
          expect(executionResult.success).toBe(true);
          expect(executionResult.command).toBe('echo "hello" "world" "test"');
          expect(executionResult.outputPath).toBeDefined();
          expect(executionResult.errorPath).toBeDefined();
          expect(executionResult.exitCode).toBe(0);
          expect(executionResult.executionTimeMs).toBeDefined();
          expect(typeof executionResult.executionTimeMs).toBe('number');
          expect(executionResult.executionTimeMs).toBeGreaterThan(0);

          // Check the actual output content
          const stdout = readFileSync(executionResult.outputPath, 'utf-8');
          expect(stdout).toContain('hello');
          expect(stdout).toContain('world');
          expect(stdout).toContain('test');

          resolve();
        } catch (e) {
          console.error("Failed to parse output:", e);
          reject(new Error("Failed to parse tool call result"));
        }
      });
    });
  }, 10000);

  it("should execute tool without additional arguments", async () => {
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
        "tools/call",
        "--tool-name",
        "run_ls_no_args"
      ];
      console.log("Running tool call without args with npx " + args.join(" "));

      // Run MCP Inspector to call the tool
      inspectorProcess = spawn("npx", args, {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: join(__dirname, "..")
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
          const result = JSON.parse(output);
          console.log("Tool call result:", JSON.stringify(result, null, 2));

          // Check the result
          expect(result).toBeDefined();
          expect(result.content).toBeDefined();
          expect(Array.isArray(result.content)).toBe(true);
          
          // Parse the text content
          const textContent = result.content[0];
          expect(textContent.type).toBe("text");
          const executionResult = JSON.parse(textContent.text);
          
          expect(executionResult.success).toBe(true);
          expect(executionResult.command).toBe("ls");
          expect(executionResult.outputPath).toBeDefined();
          expect(executionResult.errorPath).toBeDefined();
          expect(executionResult.exitCode).toBe(0);
          expect(executionResult.executionTimeMs).toBeDefined();
          expect(typeof executionResult.executionTimeMs).toBe('number');
          expect(executionResult.executionTimeMs).toBeGreaterThan(0);

          // Check the actual output content
          const stdout = readFileSync(executionResult.outputPath, 'utf-8');
          // ls should output at least something (current directory contents)
          expect(stdout.length).toBeGreaterThan(0);
          // Check that ls output contains the test-config.json file
          expect(stdout).toContain('test-config.json');

          resolve();
        } catch (e) {
          console.error("Failed to parse output:", e);
          reject(new Error("Failed to parse tool call result"));
        }
      });
    });
  }, 10000);
});
