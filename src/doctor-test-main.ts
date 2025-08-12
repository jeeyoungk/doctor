#!/usr/bin/env tsx

import { createEnvChecker, type BinaryChecker, type VersionRequirement } from "./doctor.js";

async function main() {
  console.log("🩺 Doctor Environment Checker Test\n");

  // Create checker with common binaries
  const checker = createEnvChecker();

  // Define some test requirements
  const requirements: Record<string, VersionRequirement> = {
    node: { operator: ">=", version: "18.0.0" },
    npm: { operator: ">=", version: "8.0.0" },
    git: { operator: ">=", version: "2.0.0" },
  };

  // Test different semver operators
  const advancedRequirements: Record<string, VersionRequirement> = {
    "node (caret)": { operator: "^", version: "20.0.0" },
    "npm (tilde)": { operator: "~", version: "10.9.0" },
    "git (exact)": { operator: "=", version: "2.50.1" },
  };

  console.log("Checking requirements:");
  Object.entries(requirements).forEach(([binary, req]) => {
    console.log(`  ${binary}: ${req.operator}${req.version}`);
  });
  console.log();

  // Check multiple binaries
  const results = await checker.checkMultiple(requirements);

  console.log("Results:");
  console.log("========");

  results.forEach((result) => {
    const status = result.satisfies ? "✅" : "❌";
    const version = result.currentVersion || "not found";
    const error = result.error ? ` (${result.error})` : "";

    console.log(`${status} ${result.binary}: ${version}${error}`);
  });

  // Test individual binary checks
  console.log("\nIndividual checks:");
  console.log("==================");

  try {
    const nodeVersion = await checker.getCurrentVersion("node");
    console.log(`Node.js version: ${nodeVersion}`);
  } catch (error) {
    console.log(`Node.js check failed: ${error}`);
  }

  // Test with a custom checker
  console.log("\nTesting custom checker (bun):");
  const bunChecker: BinaryChecker = {
    name: "bun",
    command: "bun",
    parseVersion: (output: string) => {
      const match = output.match(/(\d+\.\d+\.\d+)/);
      return match?.[1] ?? null;
    },
  };

  checker.addChecker(bunChecker);

  try {
    const bunResult = await checker.checkVersion("bun", { operator: ">=", version: "1.0.0" });
    const status = bunResult.satisfies ? "✅" : "❌";
    console.log(`${status} bun: ${bunResult.currentVersion || "not found"}`);
  } catch (error) {
    console.log(`Bun check failed: ${error}`);
  }

  // Test advanced semver operators
  console.log("\nAdvanced semver tests:");
  console.log("======================");

  // For advanced tests, we need to map the display names back to actual binary names
  const advancedMappings = {
    "node (caret)": "node",
    "npm (tilde)": "npm",
    "git (exact)": "git",
  };

  for (const [displayName, requirement] of Object.entries(advancedRequirements)) {
    const binaryName = advancedMappings[displayName as keyof typeof advancedMappings];
    try {
      const result = await checker.checkVersion(binaryName, requirement);
      const status = result.satisfies ? "✅" : "❌";
      console.log(
        `${status} ${displayName}: ${result.currentVersion} satisfies ${requirement.operator}${requirement.version}`,
      );
    } catch (error) {
      console.log(`❌ ${displayName}: Error - ${error}`);
    }
  }

  console.log("\n🏁 Test complete!");
}

main().catch(console.error);
