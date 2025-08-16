# Long Run Command MCP Server

An MCP (Model Context Protocol) server that executes predefined long-running commands and logs their output.

## Overview

This MCP server allows you to:
- Execute predefined commands using simple key identifiers
- Capture stdout and stderr to separate log files
- Monitor long-running processes
- List available commands

## Quick Start

```bash
# Install from npm (when published)
claude mcp add long-run-command-mcp npx -- -y long-run-command-mcp

# Or install directly from GitHub
claude mcp add long-run-command-mcp npx -- -y 9wick/long-run-command-mcp
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
      "args": ["-y", "long-run-command-mcp"],
      "env": {
        "CONFIG_PATH": "/path/to/your/config.json"
      }
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
    }
  }
}
```

### Configuration Options

- `outputdir`: Directory where log files will be stored (absolute path recommended)
- `commands`: Object containing command configurations
  - Key: Command identifier used to execute the command
  - `workdir`: Working directory for command execution (absolute path)
  - `command`: The actual command to execute

## Available Tools

### execute_command

Executes a predefined command by its key.

**Parameters:**
- `key` (string): The command key defined in config.json

**Returns:**
```json
{
  "success": true,
  "outputPath": "/var/log/mcp-commands/1705397123-build_frontend-output.log",
  "errorPath": "/var/log/mcp-commands/1705397123-build_frontend-error.log",
  "exitCode": 0
}
```

### list_commands

Lists all available command keys.

**Returns:**
```json
{
  "availableCommands": ["build_frontend", "test_backend", "deploy_staging"]
}
```

## Example Usage

Here's how to use this MCP server with Claude:

1. **List available commands:**
   ```
   "I need to see what commands are available"
   ```
   Claude will use `list_commands` to show you all configured commands.

2. **Execute a command:**
   ```
   "Run the build_frontend command"
   ```
   Claude will execute the command and provide you with the log file paths.

3. **Check command output:**
   ```
   "Show me the output from the build_frontend command"
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
CONFIG_PATH=./config.json node dist/index.js

# Or use the development server
CONFIG_PATH=./config.json npm run check
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT