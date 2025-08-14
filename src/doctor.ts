import semver from "semver";
import { z } from "zod";
import { $ } from "zx";

/** Top level config definition for the doctor CLI. */
export interface Config {
  checkers?: BinaryChecker[];
  requirements?: Record<string, VersionRequirement>;
}
export type VersionRequirement =
  | string // Comma-separated string like ">= 20.0.0, < 22"
  | {
      operator: "=" | ">=" | "<=" | ">" | "<" | "^" | "~";
      version: string;
    }
  | {
      operator: "=" | ">=" | "<=" | ">" | "<" | "^" | "~";
      version: string;
    }[];

/** Interface for checking the version of a binary */
export interface BinaryChecker {
  name: string;
  command: string;
  versionFlag?: string | string[];
  parseVersion: (output: string) => string | null;
  parseComponents?: (output: string) => Record<string, string> | null;
}

export interface VersionCheckResult {
  binary: string;
  currentVersion: string | null;
  satisfies: boolean;
  components?: Record<string, string>;
  error?: string;
  failedConstraints?: string[];
  satisfiedConstraints?: string[];
}

interface RequirementCheckResult {
  satisfies: boolean;
  failedConstraints: string[];
  satisfiedConstraints: string[];
}

// Zod schemas for runtime validation
const versionOperatorSchema = z.enum(["=", ">=", "<=", ">", "<", "^", "~"]);

const versionRequirementObjectSchema = z.object({
  operator: versionOperatorSchema,
  version: z.string(),
});

export const versionRequirementSchema = z.union([
  z.string(), // Comma-separated string like ">= 20.0.0, < 22"
  versionRequirementObjectSchema,
  z.array(versionRequirementObjectSchema),
]);

export const binaryCheckerSchema = z.object({
  name: z.string(),
  command: z.string(),
  versionFlag: z.union([z.string(), z.array(z.string())]).optional(),
  parseVersion: z.any(), // Function validation is complex in Zod v4, using any for now
  parseComponents: z.any().optional(), // Function validation is complex in Zod v4, using any for now
});

export const configSchema = z.object({
  checkers: z.array(binaryCheckerSchema).optional(),
  requirements: z.record(z.string(), versionRequirementSchema).optional(),
});

export class EnvChecker {
  private checkers: Map<string, BinaryChecker> = new Map();

  constructor(checkers: BinaryChecker[] = []) {
    checkers.forEach((checker) => this.addChecker(checker));
  }

  addChecker(checker: BinaryChecker): void {
    this.checkers.set(checker.name, checker);
  }

  async getCurrentVersion(binaryName: string): Promise<string | null> {
    const checker = this.checkers.get(binaryName);
    if (!checker) {
      throw new Error(`No checker configured for binary: ${binaryName}`);
    }

    try {
      const versionFlag = checker.versionFlag ?? "--version";

      // Configure zx to be quiet and not throw on non-zero exit codes
      $.verbose = false;
      const result = await $`${checker.command} ${versionFlag}`.nothrow();

      const output = result.stdout || result.stderr;
      return checker.parseVersion(output.trim());
    } catch {
      return null;
    }
  }

  async getComponents(binaryName: string): Promise<Record<string, string> | null> {
    const checker = this.checkers.get(binaryName);
    if (!checker?.parseComponents) {
      return null;
    }

    try {
      const versionFlag = checker.versionFlag ?? "--version";

      // Configure zx to be quiet and not throw on non-zero exit codes
      $.verbose = false;
      const result = await $`${checker.command} ${versionFlag}`.nothrow();

      const output = result.stdout || result.stderr;
      return checker.parseComponents(output.trim());
    } catch {
      return null;
    }
  }

  async checkVersion(binaryName: string, requirement: VersionRequirement): Promise<VersionCheckResult> {
    try {
      const currentVersion = await this.getCurrentVersion(binaryName);

      if (!currentVersion) {
        return {
          binary: binaryName,
          currentVersion: null,
          satisfies: false,
          error: `Binary '${binaryName}' not found or version could not be determined`,
        };
      }

      const requirementResult = this.satisfiesRequirement(currentVersion, requirement);
      const components = await this.getComponents(binaryName);

      return {
        binary: binaryName,
        currentVersion,
        satisfies: requirementResult.satisfies,
        ...(components && { components }),
        ...(requirementResult.failedConstraints.length > 0 && {
          failedConstraints: requirementResult.failedConstraints,
        }),
        ...(requirementResult.satisfiedConstraints.length > 0 && {
          satisfiedConstraints: requirementResult.satisfiedConstraints,
        }),
      };
    } catch (error) {
      return {
        binary: binaryName,
        currentVersion: null,
        satisfies: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async checkMultiple(requirements: Record<string, VersionRequirement>): Promise<VersionCheckResult[]> {
    const results = await Promise.all(
      Object.entries(requirements).map(([binaryName, requirement]) => this.checkVersion(binaryName, requirement)),
    );
    return results;
  }

  private parseStringRequirement(requirement: string): Array<{ operator: string; version: string }> {
    const parts = requirement.split(",").map((part) => part.trim());
    const parsed: Array<{ operator: string; version: string }> = [];

    for (const part of parts) {
      const match = part.match(/^(>=|<=|>|<|=|\^|~)\s*(.+)$/);
      if (match && match[1] && match[2]) {
        parsed.push({ operator: match[1], version: match[2].trim() });
      }
    }

    return parsed;
  }

  private satisfiesRequirement(currentVersion: string, requirement: VersionRequirement): RequirementCheckResult {
    try {
      const cleanCurrent = semver.clean(currentVersion);
      if (!cleanCurrent) {
        return {
          satisfies: false,
          failedConstraints: ["Invalid current version format"],
          satisfiedConstraints: [],
        };
      }

      const failedConstraints: string[] = [];
      const satisfiedConstraints: string[] = [];

      // Handle string requirement (comma-separated)
      if (typeof requirement === "string") {
        const parsedRequirements = this.parseStringRequirement(requirement);
        for (const req of parsedRequirements) {
          const cleanRequired = semver.clean(req.version);
          if (!cleanRequired) {
            failedConstraints.push(`Invalid version format: ${req.operator}${req.version}`);
            continue;
          }
          const range = `${req.operator}${cleanRequired}`;
          if (!semver.satisfies(cleanCurrent, range)) {
            failedConstraints.push(`${req.operator}${cleanRequired}`);
          } else {
            satisfiedConstraints.push(`${req.operator}${cleanRequired}`);
          }
        }
        return {
          satisfies: failedConstraints.length === 0,
          failedConstraints,
          satisfiedConstraints,
        };
      }

      // Handle array of requirements
      if (Array.isArray(requirement)) {
        for (const req of requirement) {
          const cleanRequired = semver.clean(req.version);
          if (!cleanRequired) {
            failedConstraints.push(`Invalid version format: ${req.operator}${req.version}`);
            continue;
          }
          const range = `${req.operator}${cleanRequired}`;
          if (!semver.satisfies(cleanCurrent, range)) {
            failedConstraints.push(`${req.operator}${cleanRequired}`);
          } else {
            satisfiedConstraints.push(`${req.operator}${cleanRequired}`);
          }
        }
        return {
          satisfies: failedConstraints.length === 0,
          failedConstraints,
          satisfiedConstraints,
        };
      }

      // Handle single object requirement
      const cleanRequired = semver.clean(requirement.version);
      if (!cleanRequired) {
        return {
          satisfies: false,
          failedConstraints: [`Invalid version format: ${requirement.operator}${requirement.version}`],
          satisfiedConstraints: [],
        };
      }

      const range = `${requirement.operator}${cleanRequired}`;
      const satisfies = semver.satisfies(cleanCurrent, range);
      if (!satisfies) {
        failedConstraints.push(`${requirement.operator}${cleanRequired}`);
      } else {
        satisfiedConstraints.push(`${requirement.operator}${cleanRequired}`);
      }
      return { satisfies, failedConstraints, satisfiedConstraints };
    } catch {
      return {
        satisfies: false,
        failedConstraints: ["Error processing version requirement"],
        satisfiedConstraints: [],
      };
    }
  }
}

export const commonCheckers: BinaryChecker[] = [
  {
    name: "node",
    command: "node",
    parseVersion: (output: string) => {
      const match = output.match(/v?(\d+\.\d+\.\d+)/);
      return match?.[1] ?? null;
    },
  },
  {
    name: "npm",
    command: "npm",
    parseVersion: (output: string) => {
      const match = output.match(/(\d+\.\d+\.\d+)/);
      return match?.[1] ?? null;
    },
  },
  {
    name: "pnpm",
    command: "pnpm",
    parseVersion: (output: string) => {
      const match = output.match(/(\d+\.\d+\.\d+)/);
      return match?.[1] ?? null;
    },
  },
  {
    name: "git",
    command: "git",
    parseVersion: (output: string) => {
      const match = output.match(/git version (\d+\.\d+\.\d+)/);
      return match?.[1] ?? null;
    },
  },
  {
    name: "docker",
    command: "docker",
    versionFlag: ["version", "-f", "json"],
    parseVersion: (output: string) => {
      try {
        const json = JSON.parse(output);
        return json.Client?.Version ?? null;
      } catch {
        return null;
      }
    },
    parseComponents: (output: string) => {
      try {
        const json = JSON.parse(output);
        const components: Record<string, string> = {};

        // Add Client version
        if (json.Client?.Version) {
          components["Client"] = json.Client.Version;
        }

        // Add Server version
        if (json.Server?.Version) {
          components["Server"] = json.Server.Version;
        }

        // Add Server components
        if (json.Server?.Components) {
          json.Server.Components.forEach((comp: { Name?: string; Version?: string }) => {
            if (comp.Name && comp.Version) {
              components[comp.Name] = comp.Version;
            }
          });
        }

        return Object.keys(components).length > 0 ? components : null;
      } catch {
        return null;
      }
    },
  },
  {
    name: "python",
    command: "python",
    parseVersion: (output: string) => {
      const match = output.match(/Python (\d+\.\d+\.\d+)/);
      return match?.[1] ?? null;
    },
  },
  {
    name: "python3",
    command: "python3",
    parseVersion: (output: string) => {
      const match = output.match(/Python (\d+\.\d+\.\d+)/);
      return match?.[1] ?? null;
    },
  },
  {
    name: "bun",
    command: "bun",
    parseVersion: (output: string) => {
      const match = output.match(/(\d+\.\d+\.\d+)/);
      return match?.[1] ?? null;
    },
  },
];

export function createEnvChecker(additionalCheckers: BinaryChecker[] = []): EnvChecker {
  return new EnvChecker([...commonCheckers, ...additionalCheckers]);
}
