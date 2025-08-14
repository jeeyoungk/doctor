import { Command } from "commander";
import { access } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { version } from "../package.json";
import { configSchema, type Config } from "./config.js";
import { createEnvChecker } from "./doctor.js";

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
  if (input.includes("/") || input.includes("\\") || input.endsWith(".js") || input.endsWith(".mjs")) {
    try {
      // Load as ESM module (both .js and .mjs are treated as ESM)
      const fileUrl = pathToFileURL(input).href;
      const module = await import(fileUrl);

      // Validate config with Zod schema
      const parseResult = configSchema.safeParse(module.default);
      if (!parseResult.success) {
        const errorMessages = parseResult.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("\n  ");
        throw new Error(`Invalid config format:\n  ${errorMessages}`);
      }

      return parseResult.data as Config;
    } catch (error) {
      throw new Error(`Failed to load config from file: ${error}`);
    }
  } else {
    throw new Error("Config must be a file path to a .js or .mjs file");
  }
}

async function findConfigFile(): Promise<string | null> {
  const configFiles = ["doctor.config.js", "doctor.config.mjs"];

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
      const config = await loadConfig(configFile);

      // Create checker with additional checkers from config
      const checker = createEnvChecker(config.checkers || {});

      // Use requirements from config, or fall back to treating the entire config as requirements for backwards compatibility
      const requirements = config.requirements || {};
      const results = await checker.checkMultiple(requirements);

      let hasFailure = false;
      results.forEach((result) => {
        const status = result.satisfies ? "✅" : "❌";
        const version = result.currentVersion || "not found";
        const error = result.error ? ` (${result.error})` : "";
        const path = result.fullPath && result.fullPath !== result.binary ? ` (${result.fullPath})` : "";

        console.log(`${status} ${result.binary}: ${version}${error}${path}`);

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
  doctor.config.js/mjs (ESM modules)

Example config (doctor.config.js):
  export default {
    checkers: {
      tsc: {
        parseVersion: (output) => {
          const match = output.match(/Version (\\d+\\.\\d+\\.\\d+)/);
          return match?.[1] ?? null;
        }
      }
    },
    requirements: {
      node: { operator: ">=", version: "18.0.0" },
      npm: { operator: ">=", version: "8.0.0" }
    }
  };`);
  }
}

program.parse();
