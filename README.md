# Claude Code MCP

Claude Code MCP is an implementation of [Claude Code](https://gist.github.com/transitive-bullshit/487c9cb52c75a9701d312334ed53b20c) as a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server. This project allows you to use Claude Code's powerful software engineering capabilities through the standardized MCP interface.

## What is Claude Code?

Claude Code is Anthropic's CLI tool for software engineering tasks, powered by Claude. It provides a set of tools and capabilities that help developers with:

- Code generation and editing
- Code review and analysis
- Debugging and troubleshooting
- File system operations
- Shell command execution
- Project exploration and understanding

The original implementation is available as a JavaScript module that defines prompts and tools for interacting with Claude's API.

## What is MCP?

The Model Context Protocol (MCP) is a standardized interface for AI models that enables consistent interaction patterns across different models and providers. MCP defines:

- **Tools**: Functions that models can call to perform actions
- **Resources**: External data that models can access
- **Prompts**: Predefined conversation templates

By implementing Claude Code as an MCP server, we make its capabilities available to any MCP-compatible client, allowing for greater interoperability and flexibility.

## Features

- Full implementation of Claude Code functionality as an MCP server
- Provides tools for file operations, shell commands, and code analysis
- Exposes resources for accessing file system and environment information
- Includes prompts for general CLI interaction and code review
- Compatible with any MCP client
- TypeScript implementation with full type safety

## Installation

```bash
# Clone the repository
git clone https://github.com/auchenberg/claude-code-mcp.git
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

The server will start and listen for MCP client connections. By default, it uses standard input/output for communication, making it easy to integrate with various client transports.

### Connecting with MCP clients

Claude Code MCP can be used with any MCP-compatible client. Here are examples of how to connect using different client implementations:

#### TypeScript/JavaScript SDK

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Create a transport that connects to the Claude Code MCP server
const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"]
});

// Create a client with appropriate capabilities
const client = new Client(
  {
    name: "example-client",
    version: "1.0.0"
  },
  {
    capabilities: {
      // Request access to specific prompts, resources, and tools
      prompts: {
        generalCLI: {},
        codeReview: {},
        prReview: {},
        initCodebase: {}
      },
      resources: {
        file: {},
        directory: {},
        environment: {}
      },
      tools: {
        bash: {},
        readFile: {},
        listFiles: {},
        searchGlob: {},
        grep: {},
        think: {},
        codeReview: {},
        editFile: {}
      }
    }
  }
);

// Connect to the server
await client.connect(transport);

// Now you can use the client to call tools, access resources, and use prompts
```

#### Python SDK

```python
from mcp.client import Client
from mcp.transport.stdio import StdioTransport

# Create a transport that connects to the Claude Code MCP server
transport = StdioTransport(command="node", args=["dist/index.js"])

# Create a client with appropriate capabilities
client = Client(
    client_info={"name": "python-client", "version": "1.0.0"},
    capabilities={
        "prompts": {
            "generalCLI": {},
            "codeReview": {},
            "prReview": {},
            "initCodebase": {}
        },
        "resources": {
            "file": {},
            "directory": {},
            "environment": {}
        },
        "tools": {
            "bash": {},
            "readFile": {},
            "listFiles": {},
            "searchGlob": {},
            "grep": {},
            "think": {},
            "codeReview": {},
            "editFile": {}
        }
    }
)

# Connect to the server
client.connect(transport)

# Now you can use the client to call tools, access resources, and use prompts
```

### Common Use Cases

Here are some examples of common use cases for Claude Code MCP:

#### File Operations

```typescript
// Read a file
const fileContent = await client.callTool({
  name: "readFile",
  arguments: {
    file_path: "/path/to/file.txt"
  }
});

// List files in a directory
const files = await client.callTool({
  name: "listFiles",
  arguments: {
    path: "/path/to/directory"
  }
});

// Search for files matching a pattern
const matchingFiles = await client.callTool({
  name: "searchGlob",
  arguments: {
    pattern: "*.js",
    path: "/path/to/project"
  }
});

// Edit a file
const editResult = await client.callTool({
  name: "editFile",
  arguments: {
    file_path: "/path/to/file.txt",
    content: "New content for the file"
  }
});
```

#### Shell Commands

```typescript
// Execute a shell command
const result = await client.callTool({
  name: "bash",
  arguments: {
    command: "ls -la",
    timeout: 5000 // Optional timeout in milliseconds
  }
});

// Run a git command
const gitStatus = await client.callTool({
  name: "bash",
  arguments: {
    command: "git status"
  }
});
```

#### Code Analysis

```typescript
// Review code
const codeReview = await client.callTool({
  name: "codeReview",
  arguments: {
    code: "function example() { return null; }"
  }
});

// Search for patterns in code
const grepResult = await client.callTool({
  name: "grep",
  arguments: {
    pattern: "TODO:",
    path: "/path/to/project",
    include: "*.{js,ts}"
  }
});
```

#### Using Resources

```typescript
// Access a file through the file resource
const fileResource = await client.getResource("file:///path/to/file.txt");

// List directory contents through the directory resource
const dirResource = await client.getResource("dir:///path/to/directory");

// Get environment information
const envResource = await client.getResource("env://info");
```

#### Using Prompts

```typescript
// Use the general CLI prompt
const cliResponse = await client.usePrompt("generalCLI", {
  messages: [
    { role: "user", content: "How do I optimize this function?" }
  ]
});

// Use the code review prompt
const reviewResponse = await client.usePrompt("codeReview", {
  messages: [
    { role: "user", content: "Please review this code: function example() { return null; }" }
  ]
});
```

## Available Tools

Claude Code MCP provides the following tools:

- **bash**: Execute shell commands with security restrictions and timeout options
- **readFile**: Read files from the filesystem with options for line offsets and limits
- **listFiles**: List files and directories with detailed metadata
- **searchGlob**: Search for files matching a glob pattern
- **grep**: Search for text in files with regex pattern support
- **think**: A no-op tool for thinking through complex problems
- **codeReview**: Analyze and review code for bugs, security issues, and best practices
- **editFile**: Create or edit files with specified content

### Tool Details

#### bash

```typescript
{
  command: string;  // The shell command to execute
  timeout?: number; // Optional timeout in milliseconds (max 600000)
}
```

The bash tool includes security restrictions that prevent execution of potentially dangerous commands like `curl`, `wget`, and others.

#### readFile

```typescript
{
  file_path: string; // The absolute path to the file to read
  offset?: number;   // The line number to start reading from
  limit?: number;    // The number of lines to read
}
```

#### searchGlob

```typescript
{
  pattern: string;  // The glob pattern to match files against
  path?: string;    // The directory to search in (defaults to current working directory)
}
```

#### grep

```typescript
{
  pattern: string;   // The regular expression pattern to search for
  path?: string;     // The directory to search in (defaults to current working directory)
  include?: string;  // File pattern to include in the search (e.g. "*.js", "*.{ts,tsx}")
}
```

## Available Resources

- **file**: Access file contents (`file://{path}`)
  - Provides direct access to file contents with proper error handling
  - Returns the full text content of the specified file

- **directory**: List directory contents (`dir://{path}`)
  - Returns a JSON array of file information objects
  - Each object includes name, path, isDirectory, size, and modified date

- **environment**: Get system environment information (`env://info`)
  - Returns information about the system environment
  - Includes Node.js version, npm version, OS info, and environment variables

## Available Prompts

- **generalCLI**: General CLI prompt for Claude Code
  - Provides a comprehensive system prompt for Claude to act as a CLI tool
  - Includes guidelines for tone, style, proactiveness, and following conventions
  - Automatically includes environment details

- **codeReview**: Prompt for reviewing code
  - Specialized prompt for code review tasks
  - Analyzes code for bugs, security vulnerabilities, performance issues, and best practices

- **prReview**: Prompt for reviewing pull requests
  - Specialized prompt for PR review tasks
  - Analyzes PR changes and provides comprehensive feedback

- **initCodebase**: Initialize a new CLAUDE.md file with codebase documentation
  - Creates documentation for build/lint/test commands and code style guidelines
  - Useful for setting up a new project with Claude Code

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Run specific test suites
npm run test:tools
npm run test:resources
```

### Testing

Claude Code MCP includes comprehensive test suites for both tools and resources. The tests ensure that all functionality works correctly and handles edge cases appropriately.

```bash
# Run all tests
npm test

# Run only tools tests
npm run test:tools

# Run only resources tests
npm run test:resources
```

### Troubleshooting

#### Connection Issues

If you're having trouble connecting to the Claude Code MCP server:

1. Make sure the server is running (`npm start`)
2. Check that your client is using the correct transport configuration
3. Verify that your client is requesting the correct capabilities
4. Check for any error messages in the server logs

#### Permission Errors

When using the bash tool, you might encounter permission errors:

1. Make sure the command you're trying to run is allowed (not in the banned commands list)
2. Check that the user running the server has appropriate permissions for the command
3. For file operations, ensure the server has read/write access to the specified paths

#### Timeout Errors

For long-running commands:

1. Specify a longer timeout when calling the bash tool (max 600000ms / 10 minutes)
2. Consider breaking up complex operations into smaller steps
3. For file operations on large files, use the offset and limit parameters

#### Security Considerations

The Claude Code MCP server includes several security features:

1. Command filtering in the bash tool to prevent execution of potentially dangerous commands
2. Timeout limits to prevent resource exhaustion
3. Input validation for all tools and resources
4. Redaction of sensitive environment variables

If you need to use a command that's currently banned, consider implementing a custom tool that provides the specific functionality you need in a more controlled way.

## Architecture

Claude Code MCP is built with a modular architecture:

```
claude-code-mcp/
├── src/
│   ├── server/
│   │   ├── claude-code-server.ts  # Main server setup
│   │   ├── tools.ts               # Tool implementations
│   │   ├── prompts.ts             # Prompt definitions
│   │   └── resources.ts           # Resource implementations
│   ├── utils/
│   │   ├── bash.ts                # Shell command utilities
│   │   └── file.ts                # File system utilities
│   └── index.ts                   # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

The implementation follows these key principles:

1. **Modularity**: Each component (tools, prompts, resources) is implemented in a separate module
2. **Type Safety**: Full TypeScript type definitions for all components
3. **Error Handling**: Comprehensive error handling for all operations
4. **Security**: Security restrictions for potentially dangerous operations

## Implementation Details

### MCP Server Setup

The main server is set up in `claude-code-server.ts`:

```typescript
export async function setupClaudeCodeServer(server: McpServer): Promise<void> {
  // Set up Claude Code tools
  setupTools(server);
  
  // Set up Claude Code prompts
  setupPrompts(server);
  
  // Set up Claude Code resources
  setupResources(server);
}
```

### Tool Implementation

Tools are implemented using the MCP SDK's tool registration method:

```typescript
server.tool(
  "toolName",
  "Tool description",
  {
    // Zod schema for tool arguments
    param1: z.string().describe("Parameter description"),
    param2: z.number().optional().describe("Optional parameter description")
  },
  async ({ param1, param2 }) => {
    // Tool implementation
    return {
      content: [{ type: "text", text: "Result" }]
    };
  }
);
```

### Resource Implementation

Resources are implemented using the MCP SDK's resource registration method:

```typescript
server.resource(
  "resourceName",
  new ResourceTemplate("resource://{variable}", { list: undefined }),
  async (uri, variables) => {
    // Resource implementation
    return {
      contents: [{
        uri: uri.href,
        text: "Resource content"
      }]
    };
  }
);
```

## License

MIT

## Acknowledgements

- [Claude Code](https://gist.github.com/transitive-bullshit/487c9cb52c75a9701d312334ed53b20c) by Anthropic
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Integration with Other AI Tools

Claude Code MCP can be integrated with various AI tools and platforms to enhance their capabilities:

### VS Code Extension

You can create a VS Code extension that uses Claude Code MCP as a backend:

1. Create a VS Code extension project
2. Use the MCP client to connect to the Claude Code MCP server
3. Expose Claude Code functionality through VS Code commands and UI

Example VS Code command implementation:

```typescript
import * as vscode from 'vscode';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Register a VS Code command
vscode.commands.registerCommand('claudeCode.reviewCurrentFile', async () => {
  // Get the active text editor
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  // Get the document text
  const document = editor.document;
  const code = document.getText();

  // Connect to Claude Code MCP
  const transport = new StdioClientTransport({
    command: "node",
    args: ["path/to/claude-code-mcp/dist/index.js"]
  });

  const client = new Client(
    { name: "vscode-extension", version: "1.0.0" },
    { capabilities: { tools: { codeReview: {} } } }
  );

  await client.connect(transport);

  // Call the code review tool
  const result = await client.callTool({
    name: "codeReview",
    arguments: { code }
  });

  // Show the result in a new editor
  const reviewDoc = await vscode.workspace.openTextDocument({
    content: result.content[0].text,
    language: 'markdown'
  });
  
  await vscode.window.showTextDocument(reviewDoc);
});
```

### CI/CD Integration

Claude Code MCP can be integrated into CI/CD pipelines for automated code review:

```yaml
# GitHub Actions workflow example
name: Claude Code Review

on:
  pull_request:
    branches: [ main ]

jobs:
  code-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install Claude Code MCP
        run: |
          git clone https://github.com/auchenberg/claude-code-mcp.git
          cd claude-code-mcp
          npm install
          npm run build
      
      - name: Run Code Review
        run: |
          # Create a script to use Claude Code MCP
          cat > review.js << 'EOF'
          import { Client } from "@modelcontextprotocol/sdk/client/index.js";
          import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
          import { execSync } from 'child_process';

          async function main() {
            // Get changed files
            const changedFiles = execSync('git diff --name-only origin/main').toString().split('\n').filter(Boolean);
            
            // Connect to Claude Code MCP
            const transport = new StdioClientTransport({
              command: "node",
              args: ["./claude-code-mcp/dist/index.js"]
            });

            const client = new Client(
              { name: "github-action", version: "1.0.0" },
              { capabilities: { tools: { codeReview: {}, readFile: {} } } }
            );

            await client.connect(transport);
            
            // Review each file
            for (const file of changedFiles) {
              if (!file.endsWith('.js') && !file.endsWith('.ts')) continue;
              
              const content = await client.callTool({
                name: "readFile",
                arguments: { file_path: file }
              });
              
              const review = await client.callTool({
                name: "codeReview",
                arguments: { code: content.content[0].text }
              });
              
              console.log(`## Review for ${file}\n\n${review.content[0].text}\n\n`);
            }
          }

          main().catch(console.error);
          EOF
          
          node review.js >> $GITHUB_STEP_SUMMARY
```

## Disclaimer

This project is not officially affiliated with Anthropic. Claude Code is a product of Anthropic, and this project is an independent implementation of Claude Code as an MCP server.
