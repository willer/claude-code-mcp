# Claude Code MCP Development Guide

## Build & Test Commands
- Build: `npm run build`
- Start: `npm run start`
- Dev mode: `npm run dev`
- Run all tests: `npm test`
- Run specific test: `npm run test:tools` or `npm run test:resources`
- Lint: `npm run lint`

## Code Style Guidelines
- Use TypeScript with strict type checking
- Follow ES modules format (import/export)
- Use .js extension in imports (e.g., `import { x } from './module.js'`)
- Prefer async/await over Promise chains
- Use descriptive camelCase for variables and functions
- Document functions with JSDoc comments
- Handle errors with try/catch and provide meaningful error messages
- Maintain consistent formatting per tsconfig.json
- Follow the existing architecture pattern with server/ and utils/ separation
- Use zod for schema validation and type safety