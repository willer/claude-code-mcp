import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeCommand } from "../utils/bash.js";

/**
 * Sets up Claude Code tools on the provided MCP server
 * @param server The MCP server instance to configure
 */
export function setupTools(server: McpServer): void {
  // Bash Tool - Allows executing shell commands
  server.tool(
    "bash",
    "Execute a shell command",
    {
      command: z.string().describe("The shell command to execute")
    },
    async ({ command }) => {
      try {
        const result = await executeCommand(command);
        return {
          content: [{ type: "text", text: result }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: error instanceof Error ? error.message : String(error)
          }],
          isError: true
        };
      }
    }
  );

  // File Read Tool - Allows reading files from the filesystem
  server.tool(
    "readFile",
    "Read a file from the local filesystem",
    {
      file_path: z.string().describe("The absolute path to the file to read"),
      offset: z.number().optional().describe("The line number to start reading from"),
      limit: z.number().optional().describe("The number of lines to read")
    },
    async ({ file_path, offset, limit }) => {
      try {
        // Implementation will be added in the utils/file.js module
        const command = `cat ${file_path}${offset ? ` | tail -n +${offset}` : ''}${limit ? ` | head -n ${limit}` : ''}`;
        const result = await executeCommand(command);
        return {
          content: [{ type: "text", text: result }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: error instanceof Error ? error.message : String(error)
          }],
          isError: true
        };
      }
    }
  );

  // List Files Tool - Lists files and directories in a given path
  server.tool(
    "listFiles",
    "Lists files and directories in a given path",
    {
      path: z.string().describe("The absolute path to the directory to list")
    },
    async ({ path }) => {
      try {
        const result = await executeCommand(`ls -la ${path}`);
        return {
          content: [{ type: "text", text: result }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: error instanceof Error ? error.message : String(error)
          }],
          isError: true
        };
      }
    }
  );

  // Search Files Tool - Search for files matching a pattern
  server.tool(
    "searchFiles",
    "Search for files matching a pattern",
    {
      path: z.string().describe("The directory to search in"),
      pattern: z.string().describe("The glob pattern to search for")
    },
    async ({ path, pattern }) => {
      try {
        const result = await executeCommand(`find ${path} -name "${pattern}"`);
        return {
          content: [{ type: "text", text: result }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: error instanceof Error ? error.message : String(error)
          }],
          isError: true
        };
      }
    }
  );

  // Grep Tool - Search for text in files
  server.tool(
    "grep",
    "Search for text in files",
    {
      pattern: z.string().describe("The pattern to search for"),
      path: z.string().describe("The file or directory to search in")
    },
    async ({ pattern, path }) => {
      try {
        const result = await executeCommand(`grep -r "${pattern}" ${path}`);
        return {
          content: [{ type: "text", text: result }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: error instanceof Error ? error.message : String(error)
          }],
          isError: true
        };
      }
    }
  );
}
