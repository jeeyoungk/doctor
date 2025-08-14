import { Command } from "commander";
import { access, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { version } from "../package.json";
import { configSchema, createEnvChecker, type BinaryChecker, type Config, type VersionRequirement } from "./doctor.js";

const program = new Command();

program
  .name("doctor")
  .description("🩺 Doctor - Environment Checker")
  .version(version)
  .argument("[config]", "Configuration file (JSON, JS, or ESM module)")
  .action(async (configFile?: string) => {
    await runVerify(configFile);
  });

async function loadConfig(input: string): Promise<Config> {
  // Check if input looks like a file path
  if (
    input.includes("/") ||
    input.includes("\\") ||
    input.endsWith(".json") ||
    input.endsWith(".js") ||
    input.endsWith(".mjs")
  ) {
    try {
      if (input.endsWith(".json")) {
        // Load JSON file
        const content = await readFile(input, "utf-8");
        return JSON.parse(content);
      } else if (input.endsWith(".js") || input.endsWith(".mjs")) {
        // Load JS/ESM module
        const fileUrl = pathToFileURL(input).href;
        const module = await import(fileUrl);
        return module.default;
      } else {
        // Try to determine file type by reading
        const content = await readFile(input, "utf-8");
        try {
          return JSON.parse(content);
        } catch {
          // If JSON parsing fails, treat as JS file
          const fileUrl = pathToFileURL(input).href;
          const module = await import(fileUrl);
          return module.default;
        }
      }
    } catch (error) {
      throw new Error(`Failed to load config from file: ${error}`);
    }
  } else {
    // Treat as JSON string
    return JSON.parse(input);
  }
}

async function findConfigFile(): Promise<string | null> {
  const configFiles = ["doctor.config.js", "doctor.config.mjs", "doctor.config.json"];

  for (const file of configFiles) {
    try {
      await access(file);
      return file;
    } catch {
      // File doesn't exist, continue
    }
  }
  return null;
}

async function runVerify(configFile?: string) {
  // If no config file provided, try to find one
  if (!configFile) {
    configFile = (await findConfigFile()) ?? undefined;
  }

  if (configFile) {
    console.log(`🩺 Found config file: ${configFile}`);

    try {
      const rawConfig = await loadConfig(configFile);

      // Validate config with Zod schema
      const parseResult = configSchema.safeParse(rawConfig);
      if (!parseResult.success) {
        console.error(`❌ Invalid config file format:`);
        parseResult.error.issues.forEach((issue) => {
          console.error(`  • ${issue.path.join(".")}: ${issue.message}`);
        });
        process.exit(1);
      }

      const config = parseResult.data;

      // Create checker with additional checkers from config
      const checker = createEnvChecker((config.checkers as BinaryChecker[]) || []);

      // Use requirements from config, or fall back to treating the entire config as requirements for backwards compatibility
      const requirements = config.requirements || (config as Record<string, VersionRequirement>);
      const results = await checker.checkMultiple(requirements);

      let hasFailure = false;
      results.forEach((result) => {
        const status = result.satisfies ? "✅" : "❌";
        const version = result.currentVersion || "not found";
        const error = result.error ? ` (${result.error})` : "";

        console.log(`${status} ${result.binary}: ${version}${error}`);

        // Display satisfied constraints for successful matches
        if (result.satisfies && result.satisfiedConstraints && result.satisfiedConstraints.length > 0) {
          console.log(`  ✓ Satisfied constraints: ${result.satisfiedConstraints.join(", ")}`);
        }

        // Display failed constraints if available
        if (result.failedConstraints && result.failedConstraints.length > 0) {
          console.log(`  ↳ Failed constraints: ${result.failedConstraints.join(", ")}`);
        }

        // Display components if available
        if (result.components) {
          Object.entries(result.components).forEach(([component, componentVersion]) => {
            console.log(`  └─ ${component}: ${componentVersion}`);
          });
        }

        if (!result.satisfies) {
          hasFailure = true;
        }
      });

      if (hasFailure) {
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Failed to load or parse config: ${error}`);
      process.exit(1);
    }
  } else {
    console.log(`🩺 Doctor - Environment Checker

No config file found. Usage:
  doctor [config-file]     - Verify requirements from config file
  doctor --help           - Show detailed help

Supported config files:
  doctor.config.js/mjs/json

Example config (doctor.config.js):
  export default {
    checkers: [
      {
        name: "tsc",
        command: "tsc",
        parseVersion: (output) => {
          const match = output.match(/Version (\\d+\\.\\d+\\.\\d+)/);
          return match?.[1] ?? null;
        }
      }
    ],
    requirements: {
      node: { operator: ">=", version: "18.0.0" },
      npm: { operator: ">=", version: "8.0.0" }
    }
  };`);
  }
}

program.parse();
