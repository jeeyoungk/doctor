import { describe, expect, it } from "vitest";
import { commonCheckers } from "./builtin-configs.js";
import type { VersionParser } from "./config.js";

// Type definition for test cases
interface CheckerTestCase {
  name: string;
  outputs: {
    input: string;
    expected: string | null;
  }[];
}

// Test cases for each builtin checker
const testCases: CheckerTestCase[] = [
  {
    name: "node",
    outputs: [
      { input: "v20.18.0", expected: "20.18.0" },
      { input: "18.19.1", expected: "18.19.1" },
      { input: "v16.20.2", expected: "16.20.2" },
      { input: "invalid output", expected: null },
    ],
  },
  {
    name: "npm",
    outputs: [
      { input: "10.8.2", expected: "10.8.2" },
      { input: "9.8.1", expected: "9.8.1" },
      { input: "8.19.4", expected: "8.19.4" },
      { input: "invalid output", expected: null },
    ],
  },
  {
    name: "pnpm",
    outputs: [
      { input: "8.15.6", expected: "8.15.6" },
      { input: "7.33.7", expected: "7.33.7" },
      { input: "9.1.0", expected: "9.1.0" },
      { input: "invalid output", expected: null },
    ],
  },
  {
    name: "git",
    outputs: [
      { input: "git version 2.50.1", expected: "2.50.1" },
      { input: "git version 2.45.2", expected: "2.45.2" },
      { input: "git version 2.40.0", expected: "2.40.0" },
      { input: "invalid output", expected: null },
    ],
  },
  {
    name: "docker",
    outputs: [
      {
        input:
          '{"Client":{"Version":"28.3.2"},"Server":{"Version":"28.3.2","Components":[{"Name":"Engine","Version":"28.3.2"}]}}',
        expected: "28.3.2",
      },
      {
        input: '{"Client":{"Version":"24.0.7"},"Server":{"Version":"24.0.7"}}',
        expected: "24.0.7",
      },
      { input: "invalid json", expected: null },
      { input: '{"Client":{}}', expected: null },
    ],
  },
  {
    name: "python",
    outputs: [
      { input: "Python 3.12.5", expected: "3.12.5" },
      { input: "Python 3.11.9", expected: "3.11.9" },
      { input: "Python 3.9.18", expected: "3.9.18" },
      { input: "invalid output", expected: null },
    ],
  },
  {
    name: "python3",
    outputs: [
      { input: "Python 3.12.5", expected: "3.12.5" },
      { input: "Python 3.11.9", expected: "3.11.9" },
      { input: "Python 3.10.12", expected: "3.10.12" },
      { input: "invalid output", expected: null },
    ],
  },
  {
    name: "bun",
    outputs: [
      { input: "1.2.19", expected: "1.2.19" },
      { input: "1.1.29", expected: "1.1.29" },
      { input: "1.0.35", expected: "1.0.35" },
      { input: "invalid output", expected: null },
    ],
  },
];

// Utility function to execute parseVersion based on its type
function executeVersionParser(parseVersion: VersionParser, output: string): string | null {
  if (typeof parseVersion === "function") {
    return parseVersion(output);
  }

  if (typeof parseVersion === "string") {
    const regex = new RegExp(parseVersion);
    const match = output.match(regex);
    return match?.[1] ?? null;
  }

  if (parseVersion instanceof RegExp) {
    const match = output.match(parseVersion);
    return match?.[1] ?? null;
  }

  return null;
}

describe("builtin configs", () => {
  // Matrix-style test: iterate through each test case
  testCases.forEach(({ name, outputs }) => {
    describe(`${name} checker`, () => {
      const checker = commonCheckers[name];

      it(`should exist in commonCheckers`, () => {
        expect(checker).toBeDefined();
      });

      if (checker) {
        // Test each output for this checker
        outputs.forEach(({ input, expected }) => {
          it(`should parse "${input}" as ${expected}`, () => {
            const result = executeVersionParser(checker.parseVersion, input);
            expect(result).toBe(expected);
          });
        });
      }
    });
  });

  it("should have all expected checkers", () => {
    const expectedNames = testCases.map((tc) => tc.name);
    const actualNames = Object.keys(commonCheckers);

    // Verify all test cases have corresponding checkers
    expectedNames.forEach((name) => {
      expect(actualNames).toContain(name);
    });

    // Log any extra checkers not covered by tests
    const extraCheckers = actualNames.filter((name) => !expectedNames.includes(name));
    if (extraCheckers.length > 0) {
      console.warn(`Checkers not covered by tests: ${extraCheckers.join(", ")}`);
    }
  });
});
