import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeCommand, CommandExecutionError } from "../utils/bash.js"; // Using .js extension for ESM compatibility
import { readFile, listFiles, searchGlob, grepSearch, writeFile, FileSystemError } from "../utils/file.js";

/**
 * Sets up Claude Code tools on the provided MCP server
 * @param server The MCP server instance to configure
 */
export function setupTools(server: McpServer): void {
  // Bash Tool - Allows executing shell commands with security restrictions
  server.tool(
    "bash",
    "Execute a shell command with security restrictions and resource limits",
    {
      command: z.string().describe("The shell command to execute"),
      timeout: z.number().optional().describe("Optional timeout in milliseconds (max 600000)"),
      max_output: z.number().optional().describe("Maximum output size in bytes (max 10485760)"),
      allow_network: z.boolean().optional().describe("Whether to allow network access (default: false)")
    },
    async ({ command, timeout, max_output, allow_network }) => {
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
        // Comprehensive list of potentially dangerous commands
        const bannedCommands = [
          // Network tools
          'curl', 'curlie', 'wget', 'axel', 'aria2c', 'nc', 'netcat', 'ncat', 'telnet', 
          'nmap', 'wireshark', 'tcpdump', 'iptables', 'ip6tables', 'ufw', 'firewall-cmd',
          
          // Web browsers and HTTP clients
          'lynx', 'w3m', 'links', 'httpie', 'xh', 'http-prompt', 'chrome', 'chromium',
          'firefox', 'safari', 'opera', 'brave', 'edge',
          
          // Remote access
          'ssh', 'scp', 'sftp', 'ftp', 'rsync', 'rcp', 'rdp', 'rdesktop', 'vnc', 'teamviewer',
          
          // System modification
          'sudo', 'su', 'doas', 'chown', 'chmod', 'chgrp', 'chroot', 'mount', 'umount',
          'mkfs', 'fdisk', 'parted', 'dd', 'mkswap', 'swapon', 'swapoff',
          
          // Process control
          'kill', 'killall', 'pkill', 'reboot', 'shutdown', 'halt', 'poweroff', 'systemctl',
          'service', 'init', 'crontab', 'at',
          
          // Shell and environment
          'alias', 'export', 'source', 'eval', 'exec', 'env', 'setenv', 'unset',
          
          // Package management
          'apt', 'apt-get', 'aptitude', 'dpkg', 'yum', 'dnf', 'rpm', 'pacman', 'brew',
          'pip', 'pip3', 'npm', 'yarn', 'gem', 'cargo',
          
          // User management
          'useradd', 'userdel', 'usermod', 'groupadd', 'groupdel', 'groupmod', 'passwd',
          
          // Potentially dangerous utilities
          'nohup', 'screen', 'tmux', 'bg', 'fg', 'nice', 'ionice', 'chrt', 'timeout',
          
          // File deletion/modification
          'shred', 'wipe', 'srm', 'rm -rf', 'mkfifo'
        ];
        
        // Extract the base command and check against banned list
        const commandParts = command.split(' ');
        const baseCommand = commandParts[0];
        
        // Check for banned commands (exact match)
        if (bannedCommands.includes(baseCommand)) {
          return {
            content: [{ 
              type: "text", 
              text: `Error: The command '${baseCommand}' is not allowed for security reasons.`
            }],
            isError: true
          };
        }
        
        // Check for banned commands with arguments (partial match)
        for (const bannedCmd of bannedCommands) {
          // Check if the command starts with a banned command followed by a space or end of string
          if (command.match(new RegExp(`^${bannedCmd}(\\s|$)`))) {
            return {
              content: [{ 
                type: "text", 
                text: `Error: The command '${bannedCmd}' is not allowed for security reasons.`
              }],
              isError: true
            };
          }
        }
        
        // Check for command injection attempts and other dangerous patterns
        const dangerousPatterns = [
          // Shell command separators and operators
          /[;&|]/, // Command separators and pipes
          /`.*`/,  // Backtick command substitution
          /\$\(.*\)/, // Command substitution
          />\s*\S+/, // Output redirection
          /<\s*\S+/, // Input redirection
          /2>\s*\S+/, // Error redirection
          
          // Potentially dangerous shell expansions
          /\$\{.*\}/, // Parameter expansion
          /\$[a-zA-Z0-9_]+/, // Variable expansion
          
          // Wildcards that could lead to unexpected behavior
          /\s\*\s/, // Standalone asterisk
          
          // Potentially dangerous flags
          /-[a-z]*r[a-z]*\s/, // Recursive flag (like rm -r)
          /-[a-z]*f[a-z]*\s/, // Force flag (like rm -f)
          
          // Specific dangerous command patterns
          /rm\s+(-[a-z]*[fr][a-z]*\s+)*\//, // rm with path starting with /
          /dd\s+.*if=.*of=/, // dd with if and of parameters
          /wget\s+.*-O\s+/, // wget with output file
          /curl\s+.*-o\s+/ // curl with output file
        ];
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(command)) {
            return {
              content: [{ 
                type: "text", 
                text: `Error: Potentially dangerous command pattern detected: "${pattern.toString()}". Please use simple commands without shell operators, redirections, or dangerous flags.`
              }],
              isError: true
            };
          }
        }
        
        // Check command length to prevent very long commands
        const MAX_COMMAND_LENGTH = 500;
        if (command.length > MAX_COMMAND_LENGTH) {
          return {
            content: [{ 
              type: "text", 
              text: `Error: Command is too long (${command.length} characters). Maximum allowed length is ${MAX_COMMAND_LENGTH} characters.`
            }],
            isError: true
          };
        }
        
        // Validate and apply timeout limits
        const MAX_TIMEOUT = 600000; // 10 minutes
        const DEFAULT_TIMEOUT = 60000; // 1 minute
        const validatedTimeout = timeout ? Math.min(timeout, MAX_TIMEOUT) : DEFAULT_TIMEOUT;
        
        // Validate and apply output size limits
        const MAX_OUTPUT_SIZE = 10485760; // 10 MB
        const DEFAULT_OUTPUT_SIZE = 1048576; // 1 MB
        const validatedMaxOutput = max_output ? Math.min(max_output, MAX_OUTPUT_SIZE) : DEFAULT_OUTPUT_SIZE;
        
        // Apply network access restrictions if needed
        if (allow_network !== true) {
          // If network access is not explicitly allowed, check for network-related commands
          const networkCommands = ['ping', 'traceroute', 'dig', 'nslookup', 'host', 'whois', 'netstat', 'ss', 'ifconfig', 'ip'];
          
          for (const netCmd of networkCommands) {
            if (command.match(new RegExp(`^${netCmd}(\\s|$)`))) {
              return {
                content: [{ 
                  type: "text", 
                  text: `Error: Network command '${netCmd}' requires 'allow_network: true' parameter.`
                }],
                isError: true
              };
            }
          }
        }
        
        // Execute the command with the validated parameters
        try {
          // Pass both timeout and maxOutput to executeCommand
          const result = await executeCommand(command, validatedTimeout, validatedMaxOutput);
          return {
            content: [{ type: "text", text: result }]
          };
        } catch (error) {
          // Handle timeout errors specifically
          if (error instanceof Error && error.message.includes('timeout')) {
            return {
              content: [{ 
                type: "text", 
                text: `Command timed out after ${validatedTimeout}ms. Consider increasing the timeout parameter or breaking the command into smaller parts.`
              }],
              isError: true
            };
          }
          
          // Let the catch block below handle other errors
          throw error;
        }
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
        
        // Handle Error objects
        if (error instanceof Error) {
          return {
            content: [{ 
              type: "text", 
              text: `Command execution error: ${error.message}`
            }],
            isError: true
          };
        }
        
        // Handle Error objects
        if (error instanceof Error) {
          return {
            content: [{ 
              type: "text", 
              text: `Error executing command: ${error.message}`
            }],
            isError: true
          };
        }
        
        // Generic error handling for unknown error types
        return {
          content: [{ 
            type: "text", 
            text: `Error executing command: ${String(error)}`
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
        
        // Handle Error objects
        if (error instanceof Error) {
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
        
        // Handle Error objects
        if (error instanceof Error) {
          return {
            content: [{ 
              type: "text", 
              text: `Error searching for files: ${error.message}`
            }],
            isError: true
          };
        }
        
        // Generic error handling for unknown error types
        return {
          content: [{ 
            type: "text", 
            text: `Error searching for files: ${String(error)}`
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
        
        // Handle Error objects
        if (error instanceof Error) {
          return {
            content: [{ 
              type: "text", 
              text: `Command execution error: ${error.message}`
            }],
            isError: true
          };
        }
        
        // Handle Error objects
        if (error instanceof Error) {
          return {
            content: [{ 
              type: "text", 
              text: `Error searching for text: ${error.message}`
            }],
            isError: true
          };
        }
        
        // Generic error handling for unknown error types
        return {
          content: [{ 
            type: "text", 
            text: `Error searching for text: ${String(error)}`
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
        // Handle Error objects
        if (error instanceof Error) {
          return {
            content: [{ 
              type: "text", 
              text: `Error processing thought: ${error.message}`
            }],
            isError: true
          };
        }
        
        // Generic error handling for unknown error types
        return {
          content: [{ 
            type: "text", 
            text: `Error processing thought: ${String(error)}`
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
        // Handle Error objects
        if (error instanceof Error) {
          return {
            content: [{ 
              type: "text", 
              text: `Error reviewing code: ${error.message}`
            }],
            isError: true
          };
        }
        
        // Generic error handling for unknown error types
        return {
          content: [{ 
            type: "text", 
            text: `Error reviewing code: ${String(error)}`
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
