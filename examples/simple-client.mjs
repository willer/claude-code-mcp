/**
 * Simple MCP Client Example
 * 
 * This example demonstrates how to create a basic MCP client that connects to the
 * Claude Code MCP server and uses simple tools like bash and readFile.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Claude Code MCP server
const serverPath = path.join(__dirname, '..', 'dist', 'index.js');

async function main() {
  try {
    console.log('Starting Simple MCP Client Example...');
    
    // Create a transport that connects to the Claude Code MCP server
    const transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath]
    });
    
    // Create a client with basic capabilities
    const client = new Client(
      {
        name: 'simple-example-client',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {
            bash: {},
            readFile: {}
          }
        }
      }
    );
    
    console.log('Connecting to Claude Code MCP server...');
    await client.connect(transport);
    console.log('Connected successfully!');
    
    // Example 1: Execute a simple bash command
    console.log('\nExample 1: Running a bash command (ls -la)');
    const lsResult = await client.callTool({
      name: 'bash',
      arguments: {
        command: 'ls -la'
      }
    });
    
    console.log('Bash command result:');
    console.log(lsResult.content[0].text);
    
    // Example 2: Read a file
    console.log('\nExample 2: Reading a file (package.json)');
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    
    const readResult = await client.callTool({
      name: 'readFile',
      arguments: {
        file_path: packageJsonPath
      }
    });
    
    console.log('File content:');
    console.log(readResult.content[0].text);
    
    // Example 3: Handle errors gracefully
    console.log('\nExample 3: Handling errors (trying to read a non-existent file)');
    try {
      const nonExistentResult = await client.callTool({
        name: 'readFile',
        arguments: {
          file_path: '/path/to/nonexistent/file.txt'
        }
      });
      
      console.log('Result:', nonExistentResult);
    } catch (error) {
      console.error('Error caught:', error.message);
    }
    
    console.log('\nSimple MCP Client Example completed successfully!');
  } catch (error) {
    console.error('Error in Simple MCP Client Example:', error);
  }
}

// Run the main function
main().catch(console.error);
