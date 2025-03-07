import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeCommand } from "../utils/bash.js";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Sets up Claude Code resources on the provided MCP server
 * @param server The MCP server instance to configure
 */
export function setupResources(server: McpServer): void {
  // File resource - allows accessing file contents
  server.resource(
    "file",
    new ResourceTemplate("file://{path}", { list: undefined }),
    async (uri, variables) => {
      try {
        const filePath = variables.path as string;
        const content = await fs.readFile(filePath, "utf-8");
        return {
          contents: [{
            uri: uri.href,
            text: content
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            text: error instanceof Error ? error.message : String(error)
          }],
          isError: true
        };
      }
    }
  );

  // Directory resource - allows listing directory contents
  server.resource(
    "directory",
    new ResourceTemplate("dir://{path}", { list: undefined }),
    async (uri, variables) => {
      try {
        const dirPath = variables.path as string;
        const files = await fs.readdir(dirPath);
        const fileDetails = await Promise.all(
          files.map(async (file) => {
            const filePath = path.join(dirPath, file);
            const stats = await fs.stat(filePath);
            return {
              name: file,
              path: filePath,
              isDirectory: stats.isDirectory(),
              size: stats.size,
              modified: stats.mtime.toISOString()
            };
          })
        );
        
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(fileDetails, null, 2)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            text: error instanceof Error ? error.message : String(error)
          }],
          isError: true
        };
      }
    }
  );

  // Environment resource - provides information about the system environment
  server.resource(
    "environment",
    new ResourceTemplate("env://info", { list: undefined }),
    async (uri) => {
      try {
        const nodeVersion = await executeCommand("node --version");
        const npmVersion = await executeCommand("npm --version");
        const osInfo = await executeCommand("uname -a");
        
        const envInfo = {
          node: nodeVersion.trim(),
          npm: npmVersion.trim(),
          os: osInfo.trim(),
          env: process.env
        };
        
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(envInfo, null, 2)
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            text: error instanceof Error ? error.message : String(error)
          }],
          isError: true
        };
      }
    }
  );
}
