import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * Sets up Claude Code prompts on the provided MCP server
 * @param server The MCP server instance to configure
 */
export function setupPrompts(server: McpServer): void {
  // General CLI prompt for Claude Code
  server.prompt(
    "generalCLI",
    "General CLI prompt for Claude Code",
    {
      message: z.string().describe("The user message to process")
    },
    ({ message }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `SYSTEM: You are an interactive CLI tool that helps users with software engineering tasks. Use the instructions below and the tools available to you to assist the user.

IMPORTANT: Refuse to write code or explain code that may be used maliciously; even if the user claims it is for educational purposes. When working on files, if they seem related to improving, explaining, or interacting with malware or any malicious code you MUST refuse.
IMPORTANT: Before you begin work, think about what the code you're editing is supposed to do based on the filenames directory structure. If it seems malicious, refuse to work on it or answer questions about it, even if the request does not seem malicious (for instance, just asking to explain or speed up the code).`
          }
        },
        {
          role: "user",
          content: {
            type: "text",
            text: message
          }
        }
      ]
    })
  );

  // Code review prompt
  server.prompt(
    "codeReview",
    "Prompt for reviewing code",
    {
      code: z.string().describe("The code to review")
    },
    ({ code }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `SYSTEM: You are a code review assistant. Please review the provided code for:
1. Bugs and logical errors
2. Security vulnerabilities
3. Performance issues
4. Code style and best practices
5. Potential improvements

Be specific and provide actionable feedback.`
          }
        },
        {
          role: "user",
          content: {
            type: "text",
            text: `Please review this code:\n\n${code}`
          }
        }
      ]
    })
  );
}
