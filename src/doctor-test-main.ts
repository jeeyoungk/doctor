#!/usr/bin/env bun run

import { createEnvChecker, type BinaryChecker, type VersionRequirement } from "./doctor.js";

function formatRequirement(req: VersionRequirement): string {
  if (typeof req === "string") {
    return req;
  } else if (Array.isArray(req)) {
    return req.map((r) => `${r.operator}${r.version}`).join(", ");
  } else {
    return `${req.operator}${req.version}`;
  }
}

async function main() {
  console.log("🩺 Doctor Environment Checker Test\n");

  // Create checker with common binaries
  const checker = createEnvChecker();

  // Define some test requirements
  const requirements: Record<string, VersionRequirement> = {
    node: { operator: ">=", version: "18.0.0" },
    npm: { operator: ">=", version: "8.0.0" },
    git: { operator: ">=", version: "2.0.0" },
    docker: { operator: ">=", version: "20.0.0" },
  };

  // Test new string format requirements
  const stringRequirements: Record<string, VersionRequirement> = {
    "node (string)": ">= 20.0.0, < 22.0.0",
    "npm (string)": ">= 9.0.0",
    "git (string)": ">= 2.30.0, < 3.0.0",
  };

  // Test some failing requirements to demonstrate failure reporting
  const failingRequirements: Record<string, VersionRequirement> = {
    "node (too high)": ">= 25.0.0",
    "npm (impossible range)": ">= 15.0.0, < 20.0.0",
    "git (exact mismatch)": "= 99.99.99",
  };

  // Test different semver operators
  const advancedRequirements: Record<string, VersionRequirement> = {
    "node (caret)": { operator: "^", version: "20.0.0" },
    "npm (tilde)": { operator: "~", version: "10.9.0" },
    "git (exact)": { operator: "=", version: "2.50.1" },
  };

  console.log("Checking requirements:");
  Object.entries(requirements).forEach(([binary, req]) => {
    console.log(`  ${binary}: ${formatRequirement(req)}`);
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
    if (bunResult.satisfies && bunResult.satisfiedConstraints && bunResult.satisfiedConstraints.length > 0) {
      console.log(`  ✓ Satisfied constraints: ${bunResult.satisfiedConstraints.join(", ")}`);
    }
    if (bunResult.failedConstraints && bunResult.failedConstraints.length > 0) {
      console.log(`  ↳ Failed constraints: ${bunResult.failedConstraints.join(", ")}`);
    }
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
      console.log(`${status} ${displayName}: ${result.currentVersion} satisfies ${formatRequirement(requirement)}`);
      if (result.satisfies && result.satisfiedConstraints && result.satisfiedConstraints.length > 0) {
        console.log(`  ✓ Satisfied constraints: ${result.satisfiedConstraints.join(", ")}`);
      }
      if (result.failedConstraints && result.failedConstraints.length > 0) {
        console.log(`  ↳ Failed constraints: ${result.failedConstraints.join(", ")}`);
      }
    } catch (error) {
      console.log(`❌ ${displayName}: Error - ${error}`);
    }
  }

  // Test string format requirements
  console.log("\nString format requirements:");
  console.log("===========================");

  const stringMappings = {
    "node (string)": "node",
    "npm (string)": "npm",
    "git (string)": "git",
  };

  for (const [displayName, requirement] of Object.entries(stringRequirements)) {
    const binaryName = stringMappings[displayName as keyof typeof stringMappings];
    try {
      const result = await checker.checkVersion(binaryName, requirement);
      const status = result.satisfies ? "✅" : "❌";
      console.log(`${status} ${displayName}: ${result.currentVersion} satisfies "${requirement}"`);
      if (result.satisfies && result.satisfiedConstraints && result.satisfiedConstraints.length > 0) {
        console.log(`  ✓ Satisfied constraints: ${result.satisfiedConstraints.join(", ")}`);
      }
      if (result.failedConstraints && result.failedConstraints.length > 0) {
        console.log(`  ↳ Failed constraints: ${result.failedConstraints.join(", ")}`);
      }
    } catch (error) {
      console.log(`❌ ${displayName}: Error - ${error}`);
    }
  }

  // Test failing requirements to demonstrate constraint reporting
  console.log("\nFailing requirements (demonstrating constraint reporting):");
  console.log("==========================================================");

  const failingMappings = {
    "node (too high)": "node",
    "npm (impossible range)": "npm",
    "git (exact mismatch)": "git",
  };

  for (const [displayName, requirement] of Object.entries(failingRequirements)) {
    const binaryName = failingMappings[displayName as keyof typeof failingMappings];
    try {
      const result = await checker.checkVersion(binaryName, requirement);
      const status = result.satisfies ? "✅" : "❌";
      console.log(`${status} ${displayName}: ${result.currentVersion} vs "${requirement}"`);
      if (result.satisfies && result.satisfiedConstraints && result.satisfiedConstraints.length > 0) {
        console.log(`  ✓ Satisfied constraints: ${result.satisfiedConstraints.join(", ")}`);
      }
      if (result.failedConstraints && result.failedConstraints.length > 0) {
        console.log(`  ↳ Failed constraints: ${result.failedConstraints.join(", ")}`);
      }
    } catch (error) {
      console.log(`❌ ${displayName}: Error - ${error}`);
    }
  }

  console.log("\n🏁 Test complete!");
}

main().catch(console.error);
