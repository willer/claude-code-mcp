import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { executeCommand, CommandExecutionError } from "../utils/bash.js";
import { readFile, listFiles, FileSystemError } from "../utils/file.js";
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
        // Validate input
        if (!variables.path) {
          return {
            contents: [{
              uri: uri.href,
              text: "Error: File path is required"
            }],
            isError: true
          };
        }
        
        const filePath = variables.path as string;
        
        // Use the improved readFile utility function
        const content = await readFile(filePath);
        
        return {
          contents: [{
            uri: uri.href,
            text: content
          }]
        };
      } catch (error) {
        // Handle specific error types
        if (error instanceof FileSystemError) {
          return {
            contents: [{
              uri: uri.href,
              text: `File system error (${error.operation}): ${error.message}`
            }],
            isError: true
          };
        }
        
        // Generic error handling
        return {
          contents: [{
            uri: uri.href,
            text: `Error accessing file: ${error instanceof Error ? error.message : String(error)}`
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
        // Validate input
        if (!variables.path) {
          return {
            contents: [{
              uri: uri.href,
              text: "Error: Directory path is required"
            }],
            isError: true
          };
        }
        
        const dirPath = variables.path as string;
        
        // Use the improved listFiles utility function
        const fileDetails = await listFiles(dirPath);
        
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(fileDetails, null, 2)
          }]
        };
      } catch (error) {
        // Handle specific error types
        if (error instanceof FileSystemError) {
          return {
            contents: [{
              uri: uri.href,
              text: `File system error (${error.operation}): ${error.message}`
            }],
            isError: true
          };
        }
        
        // Generic error handling
        return {
          contents: [{
            uri: uri.href,
            text: `Error listing directory: ${error instanceof Error ? error.message : String(error)}`
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
        // Use a try/catch block for each command to handle individual failures
        let nodeVersion = "unknown";
        let npmVersion = "unknown";
        let osInfo = "unknown";
        
        try {
          nodeVersion = (await executeCommand("node --version")).trim();
        } catch (error) {
          console.warn("Failed to get Node.js version:", error);
        }
        
        try {
          npmVersion = (await executeCommand("npm --version")).trim();
        } catch (error) {
          console.warn("Failed to get npm version:", error);
        }
        
        try {
          osInfo = (await executeCommand("uname -a")).trim();
        } catch (error) {
          console.warn("Failed to get OS info:", error);
          // Fallback to Node.js os module
          try {
            const os = await import('os');
            osInfo = `${os.type()} ${os.release()} ${os.arch()}`;
          } catch (osError) {
            console.warn("Failed to get OS info from os module:", osError);
          }
        }
        
        // Filter sensitive environment variables
        const filteredEnv: Record<string, string> = {};
        const sensitiveKeys = ['TOKEN', 'KEY', 'SECRET', 'PASSWORD', 'CREDENTIAL', 'AUTH'];
        
        for (const [key, value] of Object.entries(process.env)) {
          if (value && !sensitiveKeys.some(sensitive => key.toUpperCase().includes(sensitive))) {
            filteredEnv[key] = value;
          } else if (value) {
            filteredEnv[key] = '[REDACTED]';
          }
        }
        
        const envInfo = {
          node: nodeVersion,
          npm: npmVersion,
          os: osInfo,
          env: filteredEnv
        };
        
        return {
          contents: [{
            uri: uri.href,
            text: JSON.stringify(envInfo, null, 2)
          }]
        };
      } catch (error) {
        // Handle specific error types
        if (error instanceof CommandExecutionError) {
          return {
            contents: [{
              uri: uri.href,
              text: `Command execution error: ${error.message}`
            }],
            isError: true
          };
        }
        
        // Generic error handling
        return {
          contents: [{
            uri: uri.href,
            text: `Error retrieving environment info: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}
