#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Start the MCP server process
const server = spawn('node', [path.join(__dirname, 'dist/index.js')], {
  stdio: ['pipe', 'pipe', process.stderr]
});

console.log('Starting MCP server test...');

// Simple test message following MCP protocol
const testMessage = {
  jsonrpc: '2.0',
  id: '1',
  method: 'hello',
  params: {
    client: {
      name: 'test-client',
      version: '1.0.0'
    },
    capabilities: {
      prompts: {},
      resources: {},
      tools: {}
    }
  }
};

// Send the message to the server
server.stdin.write(JSON.stringify(testMessage) + '\n');

// Handle server response
let responseData = '';
server.stdout.on('data', (data) => {
  const chunk = data.toString();
  console.log('Received chunk:', chunk);
  responseData += chunk;
  
  if (responseData.includes('\n')) {
    const messages = responseData.split('\n').filter(Boolean);
    responseData = '';
    
    for (const message of messages) {
      try {
        // Try to parse the response as JSON
        const response = JSON.parse(message);
        console.log('Server response:', JSON.stringify(response, null, 2));
        
        // Test a tool call if hello was successful
        if (response.result && response.id === '1') {
          console.log('Hello successful, testing tool call...');
          
          const toolCallMessage = {
            jsonrpc: '2.0',
            id: '2',
            method: 'callTool',
            params: {
              name: 'bash',
              arguments: {
                command: 'ls -la'
              }
            }
          };
          
          server.stdin.write(JSON.stringify(toolCallMessage) + '\n');
        } else if (response.id === '2') {
          console.log('Tool call test completed.');
          server.kill();
          process.exit(0);
        }
      } catch (error) {
        console.log('Error parsing JSON:', error.message);
        console.log('Problematic message:', message);
      }
    }
  }
});

// Handle server exit
server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Handle errors
server.on('error', (error) => {
  console.error('Error:', error);
});

// Exit after 10 seconds if no response
setTimeout(() => {
  console.log('Timeout: No complete response received within 10 seconds');
  server.kill();
  process.exit(1);
}, 10000);
