import { z } from "zod";

// Type for parseVersion function that can be a function, string regex, or RegExp
export type VersionParser = ((output: string) => string | null) | string | RegExp;

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
  command: z.string().optional(),
  versionFlag: z.union([z.string(), z.array(z.string())]).optional(),
  parseVersion: z.unknown(),
  parseComponents: z.unknown().optional(),
});

export const configSchema = z.object({
  checkers: z.record(z.string(), binaryCheckerSchema).optional(),
  requirements: z.record(z.string(), versionRequirementSchema).optional(),
});

// Infer types from Zod schemas to ensure perfect alignment
/**
 * Infer types from zod schema. However, applies some changes:
 * - `parseVersion` and `parseComponents` are not typed as functions, but as `unknown`
 */
export type Config = z.infer<typeof configSchema> & {
  checkers?: Record<string, BinaryChecker> | undefined;
};

export type BinaryChecker = z.infer<typeof binaryCheckerSchema> & {
  /** Command to execute. If not specified, uses the checker name as the command. */
  command?: string;
  /** function to parse the version from the original output. */
  parseVersion: VersionParser;
  parseComponents?: (output: string) => Record<string, string> | null;
};
