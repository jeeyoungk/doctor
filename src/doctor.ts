import semver from "semver";
import { $ } from "zx";
import { commonCheckers } from "./builtin-configs.js";
import type { BinaryChecker, VersionParser } from "./config.js";

export type VersionRequirement =
  | string // Comma-separated string like ">= 20.0.0, < 22"
  | VersionConstraint
  | VersionConstraint[];

export interface VersionConstraint {
  operator: "=" | ">=" | "<=" | ">" | "<" | "^" | "~";
  version: string;
}

export type ParsedVersionRequirement = VersionConstraint[];

/**
 * Result of checking a binary's version against requirements.
 */
export interface VersionCheckResult {
  /** Name of the binary being checked (e.g., 'node', 'npm') */
  binary: string;
  /** Whether the current version satisfies the requirements */
  satisfies: boolean;
  /** The detected version of the binary, or null if not found/parseable */
  currentVersion: string | null;
  /** Full path to the binary that was executed, or null if not found */
  fullPath: string | null;
  /** Additional metadata about the binary variant (e.g., distribution, build info) */
  metadata?: Record<string, string>;
  /** Component versions for complex tools (e.g., Docker client/server versions) */
  components?: Record<string, string>;
  /** Error message if the check failed */
  error?: string;
  /** List of version constraints that failed to be satisfied */
  failedConstraints?: string[];
  /** List of version constraints that were successfully satisfied */
  satisfiedConstraints?: string[];
}

interface RequirementCheckResult {
  satisfies: boolean;
  failedConstraints: string[];
  satisfiedConstraints: string[];
}

// Utility function to handle different parseVersion types
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

// Utility functions for version requirement parsing and validation
export function parseStringRequirement(requirement: string): VersionConstraint[] {
  const parts = requirement.split(",").map((part) => part.trim());
  const parsed: VersionConstraint[] = [];

  for (const part of parts) {
    const match = part.match(/^(>=|<=|>|<|=|\^|~)\s*(.+)$/);
    if (match && match[1] && match[2]) {
      parsed.push({
        operator: match[1] as VersionConstraint["operator"],
        version: match[2].trim(),
      });
    }
  }

  return parsed;
}

export function parseVersionRequirement(requirement: VersionRequirement): ParsedVersionRequirement {
  if (typeof requirement === "string") {
    return parseStringRequirement(requirement);
  }

  if (Array.isArray(requirement)) {
    return requirement;
  }

  // Single object requirement
  return [requirement];
}

export function satisfiesRequirement(
  currentVersion: string,
  parsedRequirement: ParsedVersionRequirement,
): RequirementCheckResult {
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

    for (const constraint of parsedRequirement) {
      const cleanRequired = semver.clean(constraint.version);
      if (!cleanRequired) {
        failedConstraints.push(`Invalid version format: ${constraint.operator}${constraint.version}`);
        continue;
      }

      const range = `${constraint.operator}${cleanRequired}`;
      if (!semver.satisfies(cleanCurrent, range)) {
        failedConstraints.push(`${constraint.operator}${cleanRequired}`);
      } else {
        satisfiedConstraints.push(`${constraint.operator}${cleanRequired}`);
      }
    }

    return {
      satisfies: failedConstraints.length === 0,
      failedConstraints,
      satisfiedConstraints,
    };
  } catch {
    return {
      satisfies: false,
      failedConstraints: ["Error processing version requirement"],
      satisfiedConstraints: [],
    };
  }
}

export class EnvChecker {
  private checkers: Map<string, BinaryChecker> = new Map();

  constructor(checkers: Record<string, BinaryChecker> = {}) {
    Object.entries(checkers).forEach(([name, checker]) => this.addChecker(name, checker));
  }

  addChecker(name: string, checker: BinaryChecker): void {
    this.checkers.set(name, checker);
  }

  async getCurrentVersion(binaryName: string): Promise<string | null> {
    const checker = this.checkers.get(binaryName);
    if (!checker) {
      throw new Error(`No checker configured for binary: ${binaryName}`);
    }

    try {
      const command = checker.command ?? binaryName;
      const versionFlag = checker.versionFlag ?? "--version";

      // Configure zx to be quiet and not throw on non-zero exit codes
      $.verbose = false;
      const result = await $`${command} ${versionFlag}`.nothrow();

      const output = result.stdout || result.stderr;
      return executeVersionParser(checker.parseVersion, output.trim());
    } catch {
      return null;
    }
  }

  async getBinaryPath(binaryName: string): Promise<string | null> {
    const checker = this.checkers.get(binaryName);
    if (!checker) {
      throw new Error(`No checker configured for binary: ${binaryName}`);
    }

    try {
      const command = checker.command ?? binaryName;
      // Configure zx to be quiet and not throw on non-zero exit codes
      $.verbose = false;
      const result = await $`which ${command}`.nothrow();

      if (result.exitCode === 0 && result.stdout.trim()) {
        return result.stdout.trim();
      }

      // Return null if which command fails to find the binary
      return null;
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
      const command = checker.command ?? binaryName;
      const versionFlag = checker.versionFlag ?? "--version";

      // Configure zx to be quiet and not throw on non-zero exit codes
      $.verbose = false;
      const result = await $`${command} ${versionFlag}`.nothrow();

      const output = result.stdout || result.stderr;
      return checker.parseComponents(output.trim());
    } catch {
      return null;
    }
  }

  async checkVersion(binaryName: string, requirement: VersionRequirement): Promise<VersionCheckResult> {
    try {
      const [currentVersion, fullPath] = await Promise.all([
        this.getCurrentVersion(binaryName),
        this.getBinaryPath(binaryName),
      ]);

      if (!currentVersion) {
        return {
          binary: binaryName,
          currentVersion: null,
          fullPath,
          satisfies: false,
          error: `Binary '${binaryName}' not found or version could not be determined`,
        };
      }

      const parsedRequirement = parseVersionRequirement(requirement);
      const requirementResult = satisfiesRequirement(currentVersion, parsedRequirement);
      const components = await this.getComponents(binaryName);

      return {
        binary: binaryName,
        currentVersion,
        fullPath,
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
      const fullPath = await this.getBinaryPath(binaryName).catch(() => null);
      return {
        binary: binaryName,
        currentVersion: null,
        fullPath,
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
}

export function createEnvChecker(additionalCheckers: Record<string, BinaryChecker> = {}): EnvChecker {
  return new EnvChecker({ ...commonCheckers, ...additionalCheckers });
}
