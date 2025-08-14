# Claude.md

This file contains useful information for Claude when working on this project.

## Project Overview

**Doctor** is a modern TypeScript CLI tool for environment checking and binary version validation. It helps developers and teams ensure that required development tools meet specific version constraints across different environments.

### Key Features

- **Binary Version Checking**: Validate versions of system binaries (node, npm, git, docker, etc.)
- **Flexible Version Requirements**: Support for semantic version constraints (>=, <, ^, ~, etc.)
- **Built-in Common Checkers**: Pre-configured checkers for popular development tools
- **Custom Checker Support**: Easy configuration of custom binary checkers
- **Record-based Configuration**: Intuitive object-based config structure
- **Comprehensive Error Reporting**: Detailed constraint satisfaction reporting
- **Multiple Output Formats**: Version info, component details, and binary paths

## Technology Stack

- **Runtime**: Bun (package manager and runtime)
- **Build Tool**: tsup (TypeScript bundler)
- **Execution**: tsx (TypeScript execution)
- **Testing**: Vitest (64 comprehensive tests)
- **Linting**: ESLint v9 with flat config
- **Formatting**: Prettier with organize-imports plugin
- **Documentation**: TypeDoc
- **Release**: semantic-release
- **Git Hooks**: Lefthook
- **CLI Framework**: Commander.js
- **Version Management**: semver
- **Shell Execution**: zx
- **Schema Validation**: Zod v4

## Project Structure

```
src/
├── main.ts              # CLI entry point and argument parsing
├── doctor.ts            # Core EnvChecker class and logic
├── config.ts            # Type definitions and Zod schemas
├── builtin-configs.ts   # Built-in checker configurations
├── index.ts             # Library exports
├── doctor.test.ts       # Core logic unit tests
├── builtin-configs.test.ts # Matrix-style checker tests
└── doctor-test-main.ts  # Manual testing script

dist/
├── doctor.js            # CLI executable
├── index.js/.cjs        # Library outputs
└── index.d.ts/.d.cts    # Type definitions

doctor.config.js         # Example configuration file
```

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

## Core Architecture

### EnvChecker Class

The main class that manages binary checkers and performs version validation:

- `constructor(checkers: Record<string, BinaryChecker>)` - Initialize with checker configurations
- `addChecker(name: string, checker: BinaryChecker)` - Add custom checkers
- `getCurrentVersion(binaryName: string)` - Get version of a binary
- `getBinaryPath(binaryName: string)` - Get full path to binary executable
- `checkVersion(binaryName: string, requirement: VersionRequirement)` - Validate version against requirements
- `checkMultiple(requirements: Record<string, VersionRequirement>)` - Batch validation

### Configuration Format

**Record-based checker configuration:**

```typescript
{
  checkers: {
    // Built-in checkers (command field optional, uses key as command)
    node: { parseVersion: /v?(\d+\.\d+\.\d+)/ },

    // Custom checkers with explicit command
    "node-version": {
      command: "node",
      parseVersion: /v?(\d+\.\d+\.\d+)/
    },

    // Complex checkers with components
    docker: {
      versionFlag: ["version", "-f", "json"],
      parseVersion: (output) => JSON.parse(output).Client?.Version ?? null,
      parseComponents: (output) => { /* extract components */ }
    }
  },

  requirements: {
    node: ">= 18.0.0",
    npm: { operator: ">=", version: "8.0.0" },
    git: [
      { operator: ">=", version: "2.0.0" },
      { operator: "<", version: "3.0.0" }
    ]
  }
}
```

### Built-in Checkers

Pre-configured checkers available out-of-the-box:

- `node` - Node.js runtime
- `npm` - Node package manager
- `pnpm` - Alternative Node package manager
- `git` - Git version control
- `docker` - Docker containerization (with component support)
- `python` / `python3` - Python interpreters
- `bun` - Bun JavaScript runtime

## Configuration Files

- `tsconfig.json` - TypeScript configuration with strict settings
- `tsup.config.ts` - Build configuration for dual CJS/ESM output
- `eslint.config.js` - ESLint v9 flat configuration
- `prettier.config.mjs` - Prettier configuration with organize imports
- `.releaserc.json` - Semantic release configuration
- `lefthook.yml` - Git hooks configuration
- `vitest.config.ts` - Test configuration
- `doctor.config.js` - Example usage configuration

## Development Workflow

1. Run tests: `bun run test`
2. Check code quality: `bun run check`
3. Fix issues: `bun run fix`
4. Build for production: `bun run build`
5. Test CLI: `./dist/doctor.js [config-file]`

## CLI Usage

```bash
# Use default config file (doctor.config.js)
doctor

# Use specific config file
doctor path/to/config.js

# Show help
doctor --help
```

## Testing Strategy

- **Unit Tests** (22 tests): Core logic, parsing, and validation functions
- **Matrix Tests** (41 tests): All built-in checkers with multiple input scenarios
- **Integration Tests**: Full CLI workflow and error handling
- **Type Safety**: Strict TypeScript with comprehensive type checking

## CI/CD

GitHub Actions workflow with:

- Format checking (Prettier)
- Linting (ESLint)
- Type checking (TypeScript)
- Unit testing (Vitest)
- Building (tsup)
- Documentation generation (TypeDoc)
- Automatic semantic releases on main branch
- Package compatibility checking (@arethetypeswrong/cli)

## Important Notes

- **ESM First**: Configured for ESM modules with CJS compatibility
- **Type Safety**: Strict TypeScript settings with comprehensive error checking
- **Zero Dependencies**: Minimal runtime dependencies for security and performance
- **Cross-platform**: Works on macOS, Linux, and Windows
- **Extensible**: Easy to add custom binary checkers
- **Production Ready**: Comprehensive error handling and graceful degradation
- **Semantic Versioning**: Full semver constraint support including ^, ~, ranges
- **Shell Integration**: Uses `which` command for binary path detection
- **JSON Schema Validation**: Runtime config validation with helpful error messages

## Goals

1. **Simplify Environment Validation**: Make it easy to verify development environment requirements
2. **Improve Team Consistency**: Ensure all team members have compatible tool versions
3. **Enhance CI/CD Reliability**: Validate build environment requirements before execution
4. **Provide Clear Feedback**: Detailed error messages and constraint reporting
5. **Maintain Type Safety**: Comprehensive TypeScript coverage with runtime validation
6. **Enable Extensibility**: Simple API for adding custom binary checkers
