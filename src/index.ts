#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupClaudeCodeServer } from "./server/claude-code-server.js";

async function main() {
  // Create an MCP server
  const server = new McpServer({
    name: "Claude Code MCP",
    version: "1.0.0"
  });

  // Set up Claude Code functionality
  await setupClaudeCodeServer(server);

  // Start receiving messages on stdin and sending messages on stdout
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Claude Code MCP server started");
}

main().catch((error) => {
  console.error("Error starting Claude Code MCP server:", error);
  process.exit(1);
});
