# Claude Code MCP

Claude Code MCP is an implementation of [Claude Code](https://gist.github.com/transitive-bullshit/487c9cb52c75a9701d312334ed53b20c) as a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server. This project allows you to use Claude Code's powerful software engineering capabilities through the standardized MCP interface.

## Features

- Full implementation of Claude Code functionality as an MCP server
- Provides tools for file operations, shell commands, and code analysis
- Exposes resources for accessing file system and environment information
- Includes prompts for general CLI interaction and code review

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-code-mcp.git
cd claude-code-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Running as a standalone server

```bash
# Start the server
npm start
```

### Using with MCP clients

Claude Code MCP can be used with any MCP client. Here's an example of how to connect to it using the MCP TypeScript SDK:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"]
});

const client = new Client(
  {
    name: "example-client",
    version: "1.0.0"
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {}
    }
  }
);

await client.connect(transport);

// Use Claude Code through MCP
const result = await client.callTool({
  name: "bash",
  arguments: {
    command: "ls -la"
  }
});

console.log(result);
```

## Available Tools

Claude Code MCP provides the following tools:

- **bash**: Execute shell commands
- **readFile**: Read files from the filesystem
- **listFiles**: List files and directories
- **searchFiles**: Search for files matching a pattern
- **grep**: Search for text in files

## Available Resources

- **file**: Access file contents (`file://{path}`)
- **directory**: List directory contents (`dir://{path}`)
- **environment**: Get system environment information (`env://info`)

## Available Prompts

- **generalCLI**: General CLI prompt for Claude Code
- **codeReview**: Prompt for reviewing code

## Development

```bash
# Run in development mode with auto-reload
npm run dev
```

## License

MIT

## Acknowledgements

- [Claude Code](https://gist.github.com/transitive-bullshit/487c9cb52c75a9701d312334ed53b20c) by Anthropic
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
