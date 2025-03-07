import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { setupTools } from "./tools.js";
import { setupPrompts } from "./prompts.js";
import { setupResources } from "./resources.js";

/**
 * Sets up the Claude Code functionality on the provided MCP server
 * @param server The MCP server instance to configure
 */
export async function setupClaudeCodeServer(server: McpServer): Promise<void> {
  // Set up Claude Code tools
  setupTools(server);
  
  // Set up Claude Code prompts
  setupPrompts(server);
  
  // Set up Claude Code resources
  setupResources(server);
}
