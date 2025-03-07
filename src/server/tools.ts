import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeCommand } from "../utils/bash.js"; // Using .js extension for ESM compatibility
import { readFile, listFiles, searchGlob, grepSearch, writeFile } from "../utils/file.js";

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
      command: z.string().describe("The shell command to execute"),
      timeout: z.number().optional().describe("Optional timeout in milliseconds (max 600000)")
    },
    async ({ command, timeout }) => {
      try {
        // Check for banned commands
        const bannedCommands = [
          'alias', 'curl', 'curlie', 'wget', 'axel', 'aria2c', 'nc', 'telnet',
          'lynx', 'w3m', 'links', 'httpie', 'xh', 'http-prompt', 'chrome', 'firefox', 'safari'
        ];
        
        const commandParts = command.split(' ');
        if (bannedCommands.includes(commandParts[0])) {
          return {
            content: [{ 
              type: "text", 
              text: `Error: The command '${commandParts[0]}' is not allowed for security reasons.`
            }],
            isError: true
          };
        }
        
        const result = await executeCommand(command, timeout);
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
        const content = await readFile(file_path, offset, limit);
        return {
          content: [{ type: "text", text: content }]
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
        const files = await listFiles(path);
        return {
          content: [{ type: "text", text: JSON.stringify(files, null, 2) }]
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

  // Search Glob Tool - Search for files matching a pattern
  server.tool(
    "searchGlob",
    "Search for files matching a pattern",
    {
      pattern: z.string().describe("The glob pattern to match files against"),
      path: z.string().optional().describe("The directory to search in. Defaults to the current working directory.")
    },
    async ({ pattern, path }) => {
      try {
        const results = await searchGlob(pattern, path);
        return {
          content: [{ type: "text", text: results.join('\n') }]
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
      pattern: z.string().describe("The regular expression pattern to search for in file contents"),
      path: z.string().optional().describe("The directory to search in. Defaults to the current working directory."),
      include: z.string().optional().describe("File pattern to include in the search (e.g. \"*.js\", \"*.{ts,tsx}\")")
    },
    async ({ pattern, path, include }) => {
      try {
        const results = await grepSearch(pattern, path, include);
        return {
          content: [{ type: "text", text: results }]
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

  // Think Tool - No-op tool for thinking/reasoning
  server.tool(
    "think",
    "A tool for thinking through complex problems",
    {
      thought: z.string().describe("Your thoughts")
    },
    async ({ thought }) => {
      return {
        content: [{ 
          type: "text", 
          text: `Thought process: ${thought}`
        }]
      };
    }
  );

  // Code Review Tool - Analyze and review code
  server.tool(
    "codeReview",
    "Review code for bugs, security issues, and best practices",
    {
      code: z.string().describe("The code to review")
    },
    async ({ code }) => {
      try {
        // In a real implementation, this would call an LLM to review the code
        // For now, we'll just return a placeholder message
        return {
          content: [{ 
            type: "text", 
            text: "Code review functionality will be handled by the LLM through prompts."
          }]
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

  // File Edit Tool - Create or edit files
  server.tool(
    "editFile",
    "Create or edit a file",
    {
      file_path: z.string().describe("The absolute path to the file to edit"),
      content: z.string().describe("The new content for the file")
    },
    async ({ file_path, content }) => {
      try {
        await writeFile(file_path, content);
        return {
          content: [{ 
            type: "text", 
            text: `File ${file_path} has been updated.`
          }]
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
