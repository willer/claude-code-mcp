/**
 * Advanced MCP Client Example
 * 
 * This example demonstrates how to create a more complex MCP client that uses
 * multiple tools and resources from the Claude Code MCP server.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the Claude Code MCP server
const serverPath = path.join(__dirname, '..', 'dist', 'index.js');

async function main() {
  try {
    console.log('Starting Advanced MCP Client Example...');
    
    // Create a transport that connects to the Claude Code MCP server
    const transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath]
    });
    
    // Create a client with advanced capabilities
    const client = new Client(
      {
        name: 'advanced-example-client',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {
            bash: {},
            readFile: {},
            listFiles: {},
            searchGlob: {},
            grep: {},
            editFile: {}
          },
          resources: {
            file: {},
            directory: {},
            environment: {}
          }
        }
      }
    );
    
    console.log('Connecting to Claude Code MCP server...');
    await client.connect(transport);
    console.log('Connected successfully!');
    
    // Example 1: Use multiple tools together for a workflow
    console.log('\nExample 1: Project exploration workflow');
    
    // Step 1: List files in the project root
    console.log('Step 1: Listing files in the project root');
    const projectRoot = path.join(__dirname, '..');
    
    const listResult = await client.callTool({
      name: 'listFiles',
      arguments: {
        path: projectRoot
      }
    });
    
    const files = JSON.parse(listResult.content[0].text);
    console.log(`Found ${files.length} files/directories in the project root`);
    
    // Step 2: Search for TypeScript files
    console.log('\nStep 2: Searching for TypeScript files');
    const searchResult = await client.callTool({
      name: 'searchGlob',
      arguments: {
        pattern: '*.ts',
        path: path.join(projectRoot, 'src')
      }
    });
    
    console.log('TypeScript files found:');
    console.log(searchResult.content[0].text);
    
    // Step 3: Search for specific code patterns
    console.log('\nStep 3: Searching for specific code patterns');
    const grepResult = await client.callTool({
      name: 'grep',
      arguments: {
        pattern: 'McpServer',
        path: path.join(projectRoot, 'src'),
        include: '*.ts'
      }
    });
    
    console.log('Search results for "McpServer":');
    console.log(grepResult.content[0].text);
    
    // Example 2: Using resources
    console.log('\nExample 2: Using resources');
    
    // Step 1: Access a file through the file resource
    console.log('Step 1: Accessing a file through the file resource');
    const packageJsonPath = path.join(projectRoot, 'package.json');
    
    const fileResource = await client.getResource(`file://${packageJsonPath}`);
    console.log('File resource content:');
    console.log(fileResource.contents[0].text.substring(0, 200) + '...');
    
    // Step 2: List directory contents through the directory resource
    console.log('\nStep 2: Listing directory contents through the directory resource');
    const srcPath = path.join(projectRoot, 'src');
    
    const dirResource = await client.getResource(`dir://${srcPath}`);
    console.log('Directory resource content:');
    const dirContent = JSON.parse(dirResource.contents[0].text);
    console.log(`Found ${dirContent.length} items in the src directory`);
    
    // Step 3: Get environment information
    console.log('\nStep 3: Getting environment information');
    const envResource = await client.getResource('env://info');
    console.log('Environment resource content:');
    const envInfo = JSON.parse(envResource.contents[0].text);
    console.log(`Node.js version: ${envInfo.node}`);
    console.log(`npm version: ${envInfo.npm}`);
    console.log(`OS: ${envInfo.os}`);
    
    // Example 3: Creating and modifying files
    console.log('\nExample 3: Creating and modifying files');
    
    // Create a temporary directory for our examples
    const tempDir = path.join(projectRoot, 'examples', 'temp');
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (error) {
      console.error('Error creating temp directory:', error);
    }
    
    // Step 1: Create a new file
    console.log('Step 1: Creating a new file');
    const newFilePath = path.join(tempDir, 'example.txt');
    
    await client.callTool({
      name: 'editFile',
      arguments: {
        file_path: newFilePath,
        content: 'This is an example file created by the advanced MCP client.\nIt demonstrates file creation capabilities.'
      }
    });
    
    console.log(`File created at: ${newFilePath}`);
    
    // Step 2: Read the file we just created
    console.log('\nStep 2: Reading the file we just created');
    const readResult = await client.callTool({
      name: 'readFile',
      arguments: {
        file_path: newFilePath
      }
    });
    
    console.log('File content:');
    console.log(readResult.content[0].text);
    
    // Step 3: Modify the file
    console.log('\nStep 3: Modifying the file');
    await client.callTool({
      name: 'editFile',
      arguments: {
        file_path: newFilePath,
        content: readResult.content[0].text + '\nThis line was added in a subsequent edit.'
      }
    });
    
    console.log('File updated');
    
    // Step 4: Read the modified file
    console.log('\nStep 4: Reading the modified file');
    const updatedReadResult = await client.callTool({
      name: 'readFile',
      arguments: {
        file_path: newFilePath
      }
    });
    
    console.log('Updated file content:');
    console.log(updatedReadResult.content[0].text);
    
    // Clean up
    console.log('\nCleaning up temporary files...');
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log('Temporary files removed');
    } catch (error) {
      console.error('Error removing temporary files:', error);
    }
    
    console.log('\nAdvanced MCP Client Example completed successfully!');
  } catch (error) {
    console.error('Error in Advanced MCP Client Example:', error);
  }
}

// Run the main function
main().catch(console.error);
