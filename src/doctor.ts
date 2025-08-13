import semver from "semver";
import { $ } from "zx";

export interface VersionRequirement {
  operator: "=" | ">=" | "<=" | ">" | "<" | "^" | "~";
  version: string;
}

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
}

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

      const satisfies = this.satisfiesRequirement(currentVersion, requirement);
      const components = await this.getComponents(binaryName);

      return {
        binary: binaryName,
        currentVersion,
        satisfies,
        ...(components && { components }),
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

  private satisfiesRequirement(currentVersion: string, requirement: VersionRequirement): boolean {
    try {
      // Clean and validate versions
      const cleanCurrent = semver.clean(currentVersion);
      const cleanRequired = semver.clean(requirement.version);

      if (!cleanCurrent || !cleanRequired) {
        return false;
      }

      // Build the range string based on operator
      const range = `${requirement.operator}${cleanRequired}`;

      return semver.satisfies(cleanCurrent, range);
    } catch {
      return false;
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
