# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
npm run check        # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm test             # Run all tests
npm run lint         # Format and fix code with Biome
npm run check:lint   # Check code style without fixing
npm run check:type   # Type check without building
```

### Testing
```bash
npm test                           # Run all tests
npx vitest run src/path/to/test.ts # Run a specific test file
npx vitest watch                   # Run tests in watch mode
```

## Architecture

This is an MCP (Model Context Protocol) server that manages and executes long-running commands. The codebase follows a layered architecture:

1. **Server Layer** (`src/server.ts`): MCP server implementation that handles protocol communication and request routing
2. **Executor Layer** (`src/executor/CommandExecutor.ts`): Manages command execution, process lifecycle, and output streaming
3. **Config Layer** (`src/config/ConfigManager.ts`): Handles loading and validation of command configurations
4. **Logger Layer** (`src/logger/LogWriter.ts`): Manages separate stdout/stderr log files for each command execution
5. **Types** (`src/types/long-run-command-mcp.ts`): Shared type definitions using Zod schemas

### Key Design Patterns
- **Dependency Injection**: Classes receive dependencies through constructor parameters
- **Single Responsibility**: Each class has a focused purpose (command execution, logging, config management)
- **Schema Validation**: Zod is used for runtime validation of configurations and tool arguments
- **Error Handling**: Consistent error responses through MCP protocol

### Configuration
Commands are defined in `config.json`:
```json
{
  "commands": {
    "command-key": {
      "command": "executable",
      "workdir": "/working/directory"
    }
  }
}
```

The server validates this configuration on startup and provides tools to execute these predefined commands.
