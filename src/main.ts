import { createEnvChecker, type VersionRequirement } from "./doctor.js";

function showHelp() {
  console.log(`🩺 Doctor - Environment Checker

Usage:
  doctor [command] [options]

Commands:
  check <binary>           Check if a binary is available
  version <binary>         Get version of a binary
  verify <requirements>    Verify requirements from JSON string
  help                     Show this help message

Examples:
  doctor check node
  doctor version npm
  doctor verify '{"node":{"operator":">=","version":"18.0.0"}}'
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "help") {
    showHelp();
    return;
  }

  const checker = createEnvChecker();
  const command = args[0];

  try {
    switch (command) {
      case "check": {
        const binary = args[1];
        if (!binary) {
          console.error("❌ Binary name required");
          process.exit(1);
        }

        try {
          const version = await checker.getCurrentVersion(binary);
          console.log(`✅ ${binary}: ${version}`);
        } catch {
          console.log(`❌ ${binary}: not found`);
          process.exit(1);
        }
        break;
      }

      case "version": {
        const binary = args[1];
        if (!binary) {
          console.error("❌ Binary name required");
          process.exit(1);
        }

        try {
          const version = await checker.getCurrentVersion(binary);
          console.log(version);
        } catch {
          console.error(`❌ Failed to get version for ${binary}`);
          process.exit(1);
        }
        break;
      }

      case "verify": {
        const requirementsJson = args[1];
        if (!requirementsJson) {
          console.error("❌ Requirements JSON required");
          process.exit(1);
        }

        try {
          const requirements: Record<string, VersionRequirement> = JSON.parse(requirementsJson);
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
          console.error(`❌ Failed to parse requirements: ${error}`);
          process.exit(1);
        }
        break;
      }

      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`❌ Unexpected error: ${error}`);
  process.exit(1);
});
