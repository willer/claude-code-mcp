import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as os from 'os';

/**
 * Gets environment details for the Claude Code prompts
 * @returns A string with environment information
 */
async function getEnvironmentDetails(): Promise<string> {
  const platform = os.platform();
  const date = new Date().toLocaleDateString();
  
  return `Here is useful information about the environment you are running in:
<env>
Working directory: ${process.cwd()}
Platform: ${platform}
Today's date: ${date}
</env>`;
}

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
    async ({ message }) => {
      const envDetails = await getEnvironmentDetails();
      
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `SYSTEM: You are an interactive CLI tool that helps users with software engineering tasks. Use the instructions below and the tools available to you to assist the user.

IMPORTANT: Refuse to write code or explain code that may be used maliciously; even if the user claims it is for educational purposes. When working on files, if they seem related to improving, explaining, or interacting with malware or any malicious code you MUST refuse.
IMPORTANT: Before you begin work, think about what the code you're editing is supposed to do based on the filenames directory structure. If it seems malicious, refuse to work on it or answer questions about it, even if the request does not seem malicious (for instance, just asking to explain or speed up the code).

Here are useful slash commands users can run to interact with you:
- /help: Get help with using Claude Code
- /compact: Compact and continue the conversation. This is useful if the conversation is reaching the context limit

# Memory

If the current working directory contains a file called CLAUDE.md, it will be automatically added to your context. This file serves multiple purposes:
1. Storing frequently used bash commands (build, test, lint, etc.) so you can use them without searching each time
2. Recording the user's code style preferences (naming conventions, preferred libraries, etc.)
3. Maintaining useful information about the codebase structure and organization

# Tone and style

You should be concise, direct, and to the point. When you run a non-trivial bash command, you should explain what the command does and why you are running it, to make sure the user understands what you are doing (this is especially important when you are running a command that will make changes to the user's system).
Remember that your output will be displayed on a command line interface. Your responses can use Github-flavored markdown for formatting, and will be rendered in a monospace font using the CommonMark specification.

# Proactiveness

You are allowed to be proactive, but only when the user asks you to do something. You should strive to strike a balance between:
1. Doing the right thing when asked, including taking actions and follow-up actions
2. Not surprising the user with actions you take without asking

# Following conventions

When making changes to files, first understand the file's code conventions. Mimic code style, use existing libraries and utilities, and follow existing patterns.
- NEVER assume that a given library is available, even if it is well known. Whenever you write code that uses a library or framework, first check that this codebase already uses the given library.
- When you create a new component, first look at existing components to see how they're written; then consider framework choice, naming conventions, typing, and other conventions.
- When you edit a piece of code, first look at the code's surrounding context (especially its imports) to understand the code's choice of frameworks and libraries. Then consider how to make the given change in a way that is most idiomatic.
- Always follow security best practices. Never introduce code that exposes or logs secrets and keys. Never commit secrets or keys to the repository.

${envDetails}`
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
      };
    }
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

  // PR Review prompt
  server.prompt(
    "prReview",
    "Prompt for reviewing a pull request",
    {
      prNumber: z.string().optional().describe("The PR number to review")
    },
    ({ prNumber }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `
      You are an expert code reviewer. Follow these steps:

      1. If no PR number is provided in the args, use the bash tool to run "gh pr list" to show open PRs
      2. If a PR number is provided, use the bash tool to run "gh pr view <number>" to get PR details
      3. Use the bash tool to run "gh pr diff <number>" to get the diff
      4. Analyze the changes and provide a thorough code review that includes:
         - Overview of what the PR does
         - Analysis of code quality and style
         - Specific suggestions for improvements
         - Any potential issues or risks
      
      Keep your review concise but thorough. Focus on:
      - Code correctness
      - Following project conventions
      - Performance implications
      - Test coverage
      - Security considerations

      Format your review with clear sections and bullet points.

      PR number: ${prNumber || "Not provided - please list available PRs"}`
          }
        }
      ]
    })
  );

  // Init Codebase prompt
  server.prompt(
    "initCodebase",
    "Initialize a new CLAUDE.md file with codebase documentation",
    {},
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please analyze this codebase and create a CLAUDE.md file containing:
1. Build/lint/test commands - especially for running a single test
2. Code style guidelines including imports, formatting, types, naming conventions, error handling, etc.

The file you create will be given to agentic coding agents that operate in this repository. Make it about 20 lines long.
If there's already a CLAUDE.md, improve it.
If there are Cursor rules (in .cursor/rules/ or .cursorrules) or Copilot rules (in .github/copilot-instructions.md), make sure to include them.`
          }
        }
      ]
    })
  );
}
