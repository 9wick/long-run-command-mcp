# Long Run Command MCP Server

An MCP (Model Context Protocol) server that executes predefined long-running commands and logs their output.

## Overview

This MCP server allows you to:
- Execute predefined commands through dynamically generated tools
- Each command in your configuration becomes a separate tool
- Capture stdout and stderr to separate log files
- Monitor long-running processes

## Quick Start

```bash
# Install from npm (when published)
claude mcp add long-run-command-mcp npx -- -y long-run-command-mcp --config /path/to/your/config.json
```

## Configuration

### Claude Desktop Configuration

Add the server to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "long-run-command": {
      "command": "npx",
      "args": ["-y", "long-run-command-mcp", "--config", "/path/to/your/config.json"]
    }
  }
}
```

### Command Configuration

Create a `config.json` file to define your commands:

```json
{
  "outputdir": "/var/log/mcp-commands",
  "commands": {
    "build_frontend": {
      "workdir": "/home/user/project/frontend",
      "command": "npm run build"
    },
    "test_backend": {
      "workdir": "/home/user/project/backend",
      "command": "pytest tests/"
    },
    "deploy_staging": {
      "workdir": "/home/user/project",
      "command": "./scripts/deploy.sh staging"
    },
    "npm_script": {
      "workdir": "/home/user/project",
      "command": "npm run",
      "additionalArgs": true
    }
  }
}
```

### Configuration Options

- `outputdir`: Directory where log files will be stored (supports both relative and absolute paths)
- `commands`: Object containing command configurations
  - Key: Command identifier used to execute the command
  - `workdir`: Working directory for command execution (supports both relative and absolute paths)
  - `command`: The actual command to execute
  - `additionalArgs` (optional): Boolean flag to allow passing additional arguments at runtime (default: false)

**Note on Paths:** Both `outputdir` and `workdir` support relative paths. When relative paths are used, they are resolved relative to the configuration file's location.

## How It Works

This server dynamically generates tools based on your configuration. Each command in your `config.json` becomes an individual MCP tool that Claude can use.

### Tool Generation

- **Tool Name Format:** `run_<command_key>`
- **Special Characters:** Replaced with underscores (e.g., `build:prod` → `run_build_prod`)
- **Tool Description:** Includes the command and working directory
- **Parameters:** 
  - None required for standard commands
  - `additionalArgs` (string array): Available when `additionalArgs: true` is set in the command configuration

### Tool Response Format

All generated tools return the same response structure:

```json
{
  "success": true,
  "command": "npm run build",
  "workdir": "/home/user/project/frontend",
  "outputPath": "/path/to/logs/timestamp-commandkey-output.log",
  "errorPath": "/path/to/logs/timestamp-commandkey-error.log",
  "exitCode": 0
}
```

### Example

With the configuration shown above, you would get these tools:
- `run_build_frontend` - Executes `npm run build` in `/home/user/project/frontend`
- `run_test_backend` - Executes `pytest tests/` in `/home/user/project/backend`
- `run_deploy_staging` - Executes `./scripts/deploy.sh staging` in `/home/user/project`
- `run_npm_script` - Executes `npm run` with additional arguments in `/home/user/project`

## Example Usage

Here's how to use this MCP server with Claude:

1. **View available tools:**
   When Claude connects to the server, it automatically discovers all available tools based on your configuration. Each command appears as a separate tool.

2. **Execute a command:**
   ```
   "Run the frontend build"
   ```
   Claude will use the `run_build_frontend` tool to execute the command and provide you with the log file paths.

3. **Run multiple commands:**
   ```
   "Build the frontend and then run the backend tests"
   ```
   Claude can execute `run_build_frontend` followed by `run_test_backend`.

4. **Execute commands with additional arguments:**
   ```
   "Run the npm dev script"
   ```
   Claude will use the `run_npm_script` tool with `additionalArgs: ["dev"]` to execute `npm run dev`.

5. **Check command output:**
   ```
   "Show me the output from the build"
   ```
   Claude can read the log files to show you the command results.

## Log Files

Log files are created in the configured output directory with the following format:
- stdout: `{timestamp}-{key}-output.log`
- stderr: `{timestamp}-{key}-error.log`

Where timestamp is the Unix timestamp in milliseconds.

Example:
- `/var/log/mcp-commands/1705397123-build_frontend-output.log`
- `/var/log/mcp-commands/1705397123-build_frontend-error.log`

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/9wick/long-run-command-mcp.git
cd long-run-command-mcp

# Install dependencies
npm install

# Build
npm run build
```

### Testing

```bash
# Run tests
npm test

# Type checking
npm run check:type

# Linting
npm run lint
```

### Running Locally

```bash
# Build and run with default config
npm run build
node dist/long-run-command-mcp.js

# Run with custom config
node dist/long-run-command-mcp.js --config /path/to/config.json
# or short form
node dist/long-run-command-mcp.js -c /path/to/config.json

# Development mode with custom config
npm run build && node dist/long-run-command-mcp.js --config ./config.json
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
