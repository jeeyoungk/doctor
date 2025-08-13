import { Command } from "commander";
import { access, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { version } from "../package.json";
import { createEnvChecker, type VersionRequirement } from "./doctor.js";

const program = new Command();

program
  .name("doctor")
  .description("🩺 Doctor - Environment Checker")
  .version(version)
  .argument("[config]", "Configuration file (JSON, JS, or ESM module)")
  .action(async (configFile?: string) => {
    await runVerify(configFile);
  });

async function loadRequirements(input: string): Promise<Record<string, VersionRequirement>> {
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
      throw new Error(`Failed to load requirements from file: ${error}`);
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
  const checker = createEnvChecker();

  // If no config file provided, try to find one
  if (!configFile) {
    configFile = (await findConfigFile()) ?? undefined;
  }

  if (configFile) {
    console.log(`🩺 Found config file: ${configFile}`);

    try {
      const requirements = await loadRequirements(configFile);
      const results = await checker.checkMultiple(requirements);

      let hasFailure = false;
      results.forEach((result) => {
        const status = result.satisfies ? "✅" : "❌";
        const version = result.currentVersion || "not found";
        console.log(`${status} ${result.binary}: ${version}`);

        if (!result.satisfies) {
          hasFailure = true;
        }
      });

      if (hasFailure) {
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Failed to load or parse requirements: ${error}`);
      process.exit(1);
    }
  } else {
    console.log("🩺 Doctor - Environment Checker");
    console.log("\nNo config file found. Usage:");
    console.log("  doctor [config-file]     - Verify requirements from config file");
    console.log("  doctor --help           - Show detailed help");
    console.log("\nSupported config files:");
    console.log("  doctor.config.js/mjs/json");
    console.log("\nExample config (doctor.config.js):");
    console.log("  export default {");
    console.log('    node: { operator: ">=", version: "18.0.0" },');
    console.log('    npm: { operator: ">=", version: "8.0.0" }');
    console.log("  };");
  }
}

program.parse();
