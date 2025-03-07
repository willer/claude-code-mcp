/**
 * Prompt-based MCP Client Example
 * 
 * This example demonstrates how to use the prompts provided by the Claude Code MCP server
 * to perform more complex tasks that require AI assistance.
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
    console.log('Starting Prompt-based MCP Client Example...');
    
    // Create a transport that connects to the Claude Code MCP server
    const transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath]
    });
    
    // Create a client with prompt capabilities
    const client = new Client(
      {
        name: 'prompt-example-client',
        version: '1.0.0'
      },
      {
        capabilities: {
          prompts: {
            generalCLI: {},
            codeReview: {},
            prReview: {},
            initCodebase: {}
          },
          tools: {
            bash: {},
            readFile: {},
            listFiles: {},
            searchGlob: {},
            grep: {},
            editFile: {},
            think: {}
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
    
    // Example 1: Using the generalCLI prompt for a simple task
    console.log('\nExample 1: Using the generalCLI prompt for a simple task');
    
    const generalCliResult = await client.callPrompt({
      name: 'generalCLI',
      arguments: {
        query: 'List all JavaScript files in the current directory and count how many lines each one has.'
      }
    });
    
    console.log('generalCLI prompt result:');
    console.log(generalCliResult.content[0].text);
    
    // Example 2: Using the codeReview prompt to analyze code
    console.log('\nExample 2: Using the codeReview prompt to analyze code');
    
    // Create a temporary file with some code to review
    const tempDir = path.join(__dirname, 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const codeToReview = `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

// This function has several issues:
// 1. No input validation
// 2. No handling for missing price property
// 3. No handling for non-numeric prices
function applyDiscount(total, discountCode) {
  if (discountCode === 'SAVE10') {
    return total * 0.9;
  } else if (discountCode === 'SAVE20') {
    return total * 0.8;
  }
  return total;
}

module.exports = {
  calculateTotal,
  applyDiscount
};
`;
    
    const codeFilePath = path.join(tempDir, 'shopping-cart.js');
    await fs.writeFile(codeFilePath, codeToReview);
    
    const codeReviewResult = await client.callPrompt({
      name: 'codeReview',
      arguments: {
        file_path: codeFilePath,
        review_focus: 'Identify potential bugs, security issues, and suggest improvements'
      }
    });
    
    console.log('codeReview prompt result:');
    console.log(codeReviewResult.content[0].text);
    
    // Example 3: Using the initCodebase prompt to understand a codebase
    console.log('\nExample 3: Using the initCodebase prompt to understand a codebase');
    
    // Create a simple project structure for demonstration
    const projectDir = path.join(tempDir, 'sample-project');
    await fs.mkdir(projectDir, { recursive: true });
    await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'tests'), { recursive: true });
    
    // Create some sample files
    const indexJs = `
const { User } = require('./models/user');
const { Product } = require('./models/product');
const express = require('express');

const app = express();
app.use(express.json());

app.get('/users', async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

app.get('/products', async (req, res) => {
  const products = await Product.findAll();
  res.json(products);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
`;
    
    const userModelJs = `
class User {
  constructor(id, name, email) {
    this.id = id;
    this.name = name;
    this.email = email;
  }
  
  static async findAll() {
    // Simulated database query
    return [
      new User(1, 'John Doe', 'john@example.com'),
      new User(2, 'Jane Smith', 'jane@example.com')
    ];
  }
}

module.exports = { User };
`;
    
    const productModelJs = `
class Product {
  constructor(id, name, price) {
    this.id = id;
    this.name = name;
    this.price = price;
  }
  
  static async findAll() {
    // Simulated database query
    return [
      new Product(1, 'Laptop', 999.99),
      new Product(2, 'Smartphone', 499.99)
    ];
  }
}

module.exports = { Product };
`;
    
    const testJs = `
const assert = require('assert');
const { User } = require('../src/models/user');
const { Product } = require('../src/models/product');

describe('User', () => {
  it('should return all users', async () => {
    const users = await User.findAll();
    assert(Array.isArray(users));
    assert(users.length > 0);
  });
});

describe('Product', () => {
  it('should return all products', async () => {
    const products = await Product.findAll();
    assert(Array.isArray(products));
    assert(products.length > 0);
  });
});
`;
    
    await fs.writeFile(path.join(projectDir, 'src', 'index.js'), indexJs);
    await fs.mkdir(path.join(projectDir, 'src', 'models'), { recursive: true });
    await fs.writeFile(path.join(projectDir, 'src', 'models', 'user.js'), userModelJs);
    await fs.writeFile(path.join(projectDir, 'src', 'models', 'product.js'), productModelJs);
    await fs.writeFile(path.join(projectDir, 'tests', 'models.test.js'), testJs);
    
    const packageJson = `
{
  "name": "sample-project",
  "version": "1.0.0",
  "description": "A sample project for demonstrating Claude Code MCP",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "mocha tests/**/*.test.js"
  },
  "dependencies": {
    "express": "^4.17.1"
  },
  "devDependencies": {
    "mocha": "^9.1.3"
  }
}
`;
    
    await fs.writeFile(path.join(projectDir, 'package.json'), packageJson);
    
    const initCodebaseResult = await client.callPrompt({
      name: 'initCodebase',
      arguments: {
        project_path: projectDir,
        focus_areas: 'Architecture, main components, and data flow'
      }
    });
    
    console.log('initCodebase prompt result:');
    console.log(initCodebaseResult.content[0].text);
    
    // Example 4: Using the prReview prompt to review a pull request
    console.log('\nExample 4: Using the prReview prompt to review code changes');
    
    // Create files to simulate a PR
    const originalFile = `
function calculatePrice(product, quantity) {
  return product.price * quantity;
}

function applyTax(price, taxRate) {
  return price * (1 + taxRate);
}

module.exports = {
  calculatePrice,
  applyTax
};
`;
    
    const modifiedFile = `
function calculatePrice(product, quantity) {
  if (!product || typeof product.price !== 'number') {
    throw new Error('Invalid product');
  }
  if (typeof quantity !== 'number' || quantity <= 0) {
    throw new Error('Invalid quantity');
  }
  return product.price * quantity;
}

function applyTax(price, taxRate) {
  if (typeof price !== 'number' || price < 0) {
    throw new Error('Invalid price');
  }
  if (typeof taxRate !== 'number' || taxRate < 0) {
    throw new Error('Invalid tax rate');
  }
  return price * (1 + taxRate);
}

function calculateTotal(items, taxRate = 0) {
  const subtotal = items.reduce((total, item) => {
    return total + calculatePrice(item.product, item.quantity);
  }, 0);
  
  return applyTax(subtotal, taxRate);
}

module.exports = {
  calculatePrice,
  applyTax,
  calculateTotal
};
`;
    
    const originalFilePath = path.join(tempDir, 'pricing-original.js');
    const modifiedFilePath = path.join(tempDir, 'pricing-modified.js');
    
    await fs.writeFile(originalFilePath, originalFile);
    await fs.writeFile(modifiedFilePath, modifiedFile);
    
    const prReviewResult = await client.callPrompt({
      name: 'prReview',
      arguments: {
        original_file: originalFilePath,
        modified_file: modifiedFilePath,
        review_focus: 'Code quality, error handling, and new functionality'
      }
    });
    
    console.log('prReview prompt result:');
    console.log(prReviewResult.content[0].text);
    
    // Clean up
    console.log('\nCleaning up temporary files...');
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log('Temporary files removed');
    } catch (error) {
      console.error('Error removing temporary files:', error);
    }
    
    console.log('\nPrompt-based MCP Client Example completed successfully!');
  } catch (error) {
    console.error('Error in Prompt-based MCP Client Example:', error);
  }
}

// Run the main function
main().catch(console.error);
