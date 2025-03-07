#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Starting MCP client test...');
  
  // Create a transport that communicates with the server process
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.join(__dirname, 'dist/index.js')]
  });
  
  // Create an MCP client
  const client = new Client(
    {
      name: "test-client",
      version: "1.0.0"
    },
    {
      capabilities: {
        prompts: {},
        resources: {},
        tools: {}
      }
    }
  );
  
  try {
    // Connect to the server
    console.log('Connecting to server...');
    await client.connect(transport);
    console.log('Connected to server successfully!');
    
    // Test the bash tool
    console.log('Testing bash tool...');
    const result = await client.callTool({
      name: "bash",
      arguments: {
        command: "ls -la"
      }
    });
    
    console.log('Bash tool result:', JSON.stringify(result, null, 2));
    
    // Test the readFile tool
    console.log('Testing readFile tool...');
    const fileResult = await client.callTool({
      name: "readFile",
      arguments: {
        file_path: path.join(__dirname, 'package.json')
      }
    });
    
    console.log('ReadFile tool result:', JSON.stringify(fileResult, null, 2));
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Disconnect
    await transport.close();
  }
}

main().catch(console.error);
