import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeCommand, CommandExecutionError } from "../utils/bash.js"; // Using .js extension for ESM compatibility
import { readFile, listFiles, searchGlob, grepSearch, writeFile, FileSystemError } from "../utils/file.js";

/**
 * Sets up Claude Code tools on the provided MCP server
 * @param server The MCP server instance to configure
 */
export function setupTools(server: McpServer): void {
  // Bash Tool - Allows executing shell commands
  server.tool(
    "bash",
    "Execute a shell command with security restrictions",
    {
      command: z.string().describe("The shell command to execute"),
      timeout: z.number().optional().describe("Optional timeout in milliseconds (max 600000)")
    },
    async ({ command, timeout }) => {
      try {
        // Validate input
        if (!command || command.trim() === '') {
          return {
            content: [{ 
              type: "text", 
              text: "Error: Command cannot be empty"
            }],
            isError: true
          };
        }

        // Check for banned commands and command injection attempts
        const bannedCommands = [
          'alias', 'curl', 'curlie', 'wget', 'axel', 'aria2c', 'nc', 'telnet',
          'lynx', 'w3m', 'links', 'httpie', 'xh', 'http-prompt', 'chrome', 'firefox', 'safari',
          'ssh', 'scp', 'sftp', 'ftp', 'rsync', 'nmap', 'netcat', 'ncat'
        ];
        
        const commandParts = command.split(' ');
        const baseCommand = commandParts[0];
        
        // Check for banned commands
        if (bannedCommands.includes(baseCommand)) {
          return {
            content: [{ 
              type: "text", 
              text: `Error: The command '${baseCommand}' is not allowed for security reasons.`
            }],
            isError: true
          };
        }
        
        // Check for command injection attempts
        const dangerousPatterns = [
          /[;&|]/, // Shell command separators
          /`.*`/,  // Backtick command substitution
          /\$\(.*\)/ // Command substitution
        ];
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(command)) {
            return {
              content: [{ 
                type: "text", 
                text: `Error: Potentially dangerous command pattern detected. Please use simple commands without shell operators.`
              }],
              isError: true
            };
          }
        }
        
        // Execute the command with the validated timeout
        const result = await executeCommand(command, timeout);
        return {
          content: [{ type: "text", text: result }]
        };
      } catch (error) {
        // Handle specific error types
        if (error instanceof CommandExecutionError) {
          return {
            content: [{ 
              type: "text", 
              text: `Command execution error: ${error.message}`
            }],
            isError: true
          };
        }
        
        // Generic error handling
        return {
          content: [{ 
            type: "text", 
            text: `Error executing command: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // File Read Tool - Allows reading files from the filesystem
  server.tool(
    "readFile",
    "Read a file from the local filesystem with line offset and limit options",
    {
      file_path: z.string().describe("The absolute path to the file to read"),
      offset: z.number().optional().describe("The line number to start reading from (1-based)"),
      limit: z.number().optional().describe("The number of lines to read")
    },
    async ({ file_path, offset, limit }) => {
      try {
        // Validate input
        if (!file_path || file_path.trim() === '') {
          return {
            content: [{ 
              type: "text", 
              text: "Error: File path cannot be empty"
            }],
            isError: true
          };
        }
        
        // Validate offset and limit if provided
        if (offset !== undefined && offset < 1) {
          return {
            content: [{ 
              type: "text", 
              text: "Error: Offset must be at least 1 (line numbers are 1-based)"
            }],
            isError: true
          };
        }
        
        if (limit !== undefined && limit < 1) {
          return {
            content: [{ 
              type: "text", 
              text: "Error: Limit must be at least 1"
            }],
            isError: true
          };
        }
        
        const content = await readFile(file_path, offset, limit);
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        // Handle specific error types
        if (error instanceof FileSystemError) {
          return {
            content: [{ 
              type: "text", 
              text: `File system error (${error.operation}): ${error.message}`
            }],
            isError: true
          };
        }
        
        // Generic error handling
        return {
          content: [{ 
            type: "text", 
            text: `Error reading file: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // List Files Tool - Lists files and directories in a given path
  server.tool(
    "listFiles",
    "Lists files and directories in a given path with detailed metadata",
    {
      path: z.string().describe("The absolute path to the directory to list")
    },
    async ({ path }) => {
      try {
        // Validate input
        if (!path || path.trim() === '') {
          return {
            content: [{ 
              type: "text", 
              text: "Error: Directory path cannot be empty"
            }],
            isError: true
          };
        }
        
        const files = await listFiles(path);
        return {
          content: [{ type: "text", text: JSON.stringify(files, null, 2) }]
        };
      } catch (error) {
        // Handle specific error types
        if (error instanceof FileSystemError) {
          return {
            content: [{ 
              type: "text", 
              text: `File system error (${error.operation}): ${error.message}`
            }],
            isError: true
          };
        }
        
        // Generic error handling
        return {
          content: [{ 
            type: "text", 
            text: `Error listing files: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Search Glob Tool - Search for files matching a pattern
  server.tool(
    "searchGlob",
    "Search for files matching a glob pattern",
    {
      pattern: z.string().describe("The glob pattern to match files against"),
      path: z.string().optional().describe("The directory to search in. Defaults to the current working directory.")
    },
    async ({ pattern, path }) => {
      try {
        // Validate input
        if (!pattern || pattern.trim() === '') {
          return {
            content: [{ 
              type: "text", 
              text: "Error: Search pattern cannot be empty"
            }],
            isError: true
          };
        }
        
        const results = await searchGlob(pattern, path);
        
        // Handle empty results
        if (results.length === 0) {
          return {
            content: [{ 
              type: "text", 
              text: `No files found matching pattern: ${pattern}${path ? ` in ${path}` : ''}`
            }]
          };
        }
        
        return {
          content: [{ type: "text", text: results.join('\n') }]
        };
      } catch (error) {
        // Handle specific error types
        if (error instanceof CommandExecutionError) {
          return {
            content: [{ 
              type: "text", 
              text: `Command execution error: ${error.message}`
            }],
            isError: true
          };
        }
        
        if (error instanceof FileSystemError) {
          return {
            content: [{ 
              type: "text", 
              text: `File system error (${error.operation}): ${error.message}`
            }],
            isError: true
          };
        }
        
        // Generic error handling
        return {
          content: [{ 
            type: "text", 
            text: `Error searching for files: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // Grep Tool - Search for text in files
  server.tool(
    "grep",
    "Search for text in files with regex pattern support",
    {
      pattern: z.string().describe("The regular expression pattern to search for in file contents"),
      path: z.string().optional().describe("The directory to search in. Defaults to the current working directory."),
      include: z.string().optional().describe("File pattern to include in the search (e.g. \"*.js\", \"*.{ts,tsx}\")")
    },
    async ({ pattern, path, include }) => {
      try {
        // Validate input
        if (!pattern || pattern.trim() === '') {
          return {
            content: [{ 
              type: "text", 
              text: "Error: Search pattern cannot be empty"
            }],
            isError: true
          };
        }
        
        // Validate regex pattern
        try {
          new RegExp(pattern);
        } catch (e) {
          return {
            content: [{ 
              type: "text", 
              text: `Error: Invalid regular expression pattern: ${e instanceof Error ? e.message : String(e)}`
            }],
            isError: true
          };
        }
        
        const results = await grepSearch(pattern, path, include);
        return {
          content: [{ type: "text", text: results }]
        };
      } catch (error) {
        // Handle specific error types
        if (error instanceof CommandExecutionError) {
          return {
            content: [{ 
              type: "text", 
              text: `Command execution error: ${error.message}`
            }],
            isError: true
          };
        }
        
        // Generic error handling
        return {
          content: [{ 
            type: "text", 
            text: `Error searching for text: ${error instanceof Error ? error.message : String(error)}`
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
      try {
        // Validate input
        if (!thought || thought.trim() === '') {
          return {
            content: [{ 
              type: "text", 
              text: "Error: Thought cannot be empty"
            }],
            isError: true
          };
        }
        
        return {
          content: [{ 
            type: "text", 
            text: `Thought process: ${thought}`
          }]
        };
      } catch (error) {
        // Generic error handling
        return {
          content: [{ 
            type: "text", 
            text: `Error processing thought: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
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
        // Validate input
        if (!code || code.trim() === '') {
          return {
            content: [{ 
              type: "text", 
              text: "Error: Code cannot be empty"
            }],
            isError: true
          };
        }
        
        // In a real implementation, this would call an LLM to review the code
        // For now, we'll just return a placeholder message
        return {
          content: [{ 
            type: "text", 
            text: "Code review functionality will be handled by the LLM through prompts."
          }]
        };
      } catch (error) {
        // Generic error handling
        return {
          content: [{ 
            type: "text", 
            text: `Error reviewing code: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // File Edit Tool - Create or edit files
  server.tool(
    "editFile",
    "Create or edit a file with specified content",
    {
      file_path: z.string().describe("The absolute path to the file to edit"),
      content: z.string().describe("The new content for the file")
    },
    async ({ file_path, content }) => {
      try {
        // Validate input
        if (!file_path || file_path.trim() === '') {
          return {
            content: [{ 
              type: "text", 
              text: "Error: File path cannot be empty"
            }],
            isError: true
          };
        }
        
        // Content can be empty (to create an empty file)
        if (content === undefined) {
          return {
            content: [{ 
              type: "text", 
              text: "Error: Content must be provided (can be empty string)"
            }],
            isError: true
          };
        }
        
        await writeFile(file_path, content);
        return {
          content: [{ 
            type: "text", 
            text: `File ${file_path} has been updated.`
          }]
        };
      } catch (error) {
        // Handle specific error types
        if (error instanceof FileSystemError) {
          return {
            content: [{ 
              type: "text", 
              text: `File system error (${error.operation}): ${error.message}`
            }],
            isError: true
          };
        }
        
        // Generic error handling
        return {
          content: [{ 
            type: "text", 
            text: `Error editing file: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}
