# Claude.md

This file contains useful information for Claude when working on this project.

## Project Overview

This is a modern TypeScript Node.js starter template with the following stack:

- **Runtime**: Bun (package manager and runtime)
- **Build Tool**: tsup (TypeScript bundler)
- **Execution**: tsx (TypeScript execution)
- **Testing**: Vitest
- **Linting**: ESLint v9 with flat config
- **Formatting**: Prettier with organize-imports plugin
- **Documentation**: TypeDoc
- **Release**: semantic-release
- **Git Hooks**: Lefthook

## Key Scripts

- `bun run build` - Build the project with tsup
- `bun run test` - Run type checking and unit tests
- `bun run test:type` - Run TypeScript type checking only
- `bun run test:unit` - Run unit tests only
- `bun run check` - Check formatting and linting
- `bun run check:format` - Check code formatting
- `bun run check:lint` - Check linting
- `bun run fix` - Fix formatting and linting issues
- `bun run fix:format` - Fix formatting issues
- `bun run fix:lint` - Fix linting issues
- `bun run docs` - Generate documentation
- `bun run clean` - Clean build artifacts
- `bun run dist` - Clean and build for distribution
- `bun run start` - Start the application
- `bun run release` - Create a semantic release

## Configuration Files

- `tsconfig.json` - TypeScript configuration with strict settings
- `tsup.config.ts` - Build configuration for dual CJS/ESM output
- `eslint.config.js` - ESLint v9 flat configuration
- `prettier.config.mjs` - Prettier configuration with organize imports
- `.releaserc.json` - Semantic release configuration
- `lefthook.yml` - Git hooks configuration
- `vitest.config.ts` - Test configuration

## Getting Started

1. Clone this template repository
2. Run the template script: `./template.sh GITHUB_OWNER GITHUB_REPO`
3. Install dependencies: `bun install`

## Development Workflow

1. Run tests: `bun run test`
2. Check code quality: `bun run check`
3. Fix issues: `bun run fix`
4. Build for production: `bun run build`

## CI/CD

The project uses GitHub Actions with:

- Format checking
- Linting
- Type checking
- Unit testing
- Building
- Documentation generation
- Automatic semantic releases on main branch

## Template Setup

This is a template repository. After cloning:

1. **Run the template script**: `./template.sh GITHUB_OWNER GITHUB_REPO`
   - Example: `./template.sh myusername myproject`
   - This replaces template variables in package.json with your actual values

2. **Install dependencies**: `bun install`

## Important Notes

- Configured for ESM modules (`"type": "module"`)
- TypeScript is configured with strict settings and `noEmit: true`
- Build uses tsup with automatic cleaning via `clean: true` option
- Clean script uses native `rm -rf` instead of rimraf
- All quality checks run in CI and must pass before merge
- Dual module support with proper exports for CJS/ESM compatibility
