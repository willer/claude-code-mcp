# Contributing to Claude Code MCP

Thank you for your interest in contributing to Claude Code MCP! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with the following information:

1. A clear, descriptive title
2. A detailed description of the issue
3. Steps to reproduce the bug
4. Expected behavior
5. Actual behavior
6. Any relevant logs or screenshots
7. Your environment (OS, Node.js version, etc.)

### Suggesting Enhancements

We welcome suggestions for enhancements! Please create an issue with:

1. A clear, descriptive title
2. A detailed description of the proposed enhancement
3. Any relevant examples or mockups
4. Why this enhancement would be useful

### Pull Requests

1. Fork the repository
2. Create a new branch for your changes
3. Make your changes
4. Run tests to ensure your changes don't break existing functionality
5. Submit a pull request

#### Pull Request Guidelines

- Follow the existing code style
- Write clear, descriptive commit messages
- Include tests for new functionality
- Update documentation as needed
- Keep pull requests focused on a single topic

## Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-code-mcp.git
cd claude-code-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## Project Structure

```
claude-code-mcp/
├── src/
│   ├── server/
│   │   ├── claude-code-server.ts  # Main server setup
│   │   ├── tools.ts               # Tool implementations
│   │   ├── prompts.ts             # Prompt definitions
│   │   └── resources.ts           # Resource implementations
│   ├── utils/
│   │   ├── bash.ts                # Shell command utilities
│   │   └── file.ts                # File system utilities
│   └── index.ts                   # Entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Coding Standards

- Use TypeScript for all new code
- Follow the existing code style
- Add JSDoc comments for all public APIs
- Write unit tests for new functionality

## License

By contributing to this project, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
