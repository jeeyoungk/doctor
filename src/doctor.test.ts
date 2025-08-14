import { describe, expect, it } from "vitest";
import {
  parseStringRequirement,
  parseVersionRequirement,
  satisfiesRequirement,
  type VersionConstraint,
  type VersionRequirement,
} from "./doctor.js";

describe("parseStringRequirement", () => {
  it("should parse single constraint", () => {
    const result = parseStringRequirement(">= 18.0.0");
    expect(result).toEqual([{ operator: ">=", version: "18.0.0" }]);
  });

  it("should parse multiple constraints", () => {
    const result = parseStringRequirement(">= 20.0.0, < 22.0.0");
    expect(result).toEqual([
      { operator: ">=", version: "20.0.0" },
      { operator: "<", version: "22.0.0" },
    ]);
  });

  it("should parse constraints with extra whitespace", () => {
    const result = parseStringRequirement("  >=   18.0.0  ,  <   20.0.0  ");
    expect(result).toEqual([
      { operator: ">=", version: "18.0.0" },
      { operator: "<", version: "20.0.0" },
    ]);
  });

  it("should handle all supported operators", () => {
    const result = parseStringRequirement("= 1.0.0, >= 2.0.0, <= 3.0.0, > 4.0.0, < 5.0.0, ^ 6.0.0, ~ 7.0.0");
    expect(result).toEqual([
      { operator: "=", version: "1.0.0" },
      { operator: ">=", version: "2.0.0" },
      { operator: "<=", version: "3.0.0" },
      { operator: ">", version: "4.0.0" },
      { operator: "<", version: "5.0.0" },
      { operator: "^", version: "6.0.0" },
      { operator: "~", version: "7.0.0" },
    ]);
  });

  it("should ignore invalid constraints", () => {
    const result = parseStringRequirement(">= 18.0.0, invalid, < 20.0.0");
    expect(result).toEqual([
      { operator: ">=", version: "18.0.0" },
      { operator: "<", version: "20.0.0" },
    ]);
  });

  it("should return empty array for empty string", () => {
    const result = parseStringRequirement("");
    expect(result).toEqual([]);
  });

  it("should return empty array for string with no valid constraints", () => {
    const result = parseStringRequirement("invalid, also invalid");
    expect(result).toEqual([]);
  });
});

describe("parseVersionRequirement", () => {
  it("should parse string requirement", () => {
    const requirement: VersionRequirement = ">= 18.0.0, < 20.0.0";
    const result = parseVersionRequirement(requirement);
    expect(result).toEqual([
      { operator: ">=", version: "18.0.0" },
      { operator: "<", version: "20.0.0" },
    ]);
  });

  it("should parse object requirement", () => {
    const requirement: VersionRequirement = { operator: ">=", version: "18.0.0" };
    const result = parseVersionRequirement(requirement);
    expect(result).toEqual([{ operator: ">=", version: "18.0.0" }]);
  });

  it("should parse array requirement", () => {
    const requirement: VersionRequirement = [
      { operator: ">=", version: "18.0.0" },
      { operator: "<", version: "20.0.0" },
    ];
    const result = parseVersionRequirement(requirement);
    expect(result).toEqual([
      { operator: ">=", version: "18.0.0" },
      { operator: "<", version: "20.0.0" },
    ]);
  });

  it("should handle single object in array", () => {
    const requirement: VersionRequirement = [{ operator: "^", version: "18.0.0" }];
    const result = parseVersionRequirement(requirement);
    expect(result).toEqual([{ operator: "^", version: "18.0.0" }]);
  });
});

describe("satisfiesRequirement", () => {
  it("should return true when version satisfies all constraints", () => {
    const constraints: VersionConstraint[] = [
      { operator: ">=", version: "18.0.0" },
      { operator: "<", version: "20.0.0" },
    ];
    const result = satisfiesRequirement("19.5.0", constraints);
    expect(result.satisfies).toBe(true);
    expect(result.satisfiedConstraints).toEqual([">=18.0.0", "<20.0.0"]);
    expect(result.failedConstraints).toEqual([]);
  });

  it("should return false when version fails some constraints", () => {
    const constraints: VersionConstraint[] = [
      { operator: ">=", version: "18.0.0" },
      { operator: "<", version: "20.0.0" },
    ];
    const result = satisfiesRequirement("20.5.0", constraints);
    expect(result.satisfies).toBe(false);
    expect(result.satisfiedConstraints).toEqual([">=18.0.0"]);
    expect(result.failedConstraints).toEqual(["<20.0.0"]);
  });

  it("should return false when version fails all constraints", () => {
    const constraints: VersionConstraint[] = [
      { operator: ">=", version: "20.0.0" },
      { operator: ">=", version: "22.0.0" },
    ];
    const result = satisfiesRequirement("18.5.0", constraints);
    expect(result.satisfies).toBe(false);
    expect(result.satisfiedConstraints).toEqual([]);
    expect(result.failedConstraints).toEqual([">=20.0.0", ">=22.0.0"]);
  });

  it("should handle exact version match", () => {
    const constraints: VersionConstraint[] = [{ operator: "=", version: "18.0.0" }];
    const result = satisfiesRequirement("18.0.0", constraints);
    expect(result.satisfies).toBe(true);
    expect(result.satisfiedConstraints).toEqual(["=18.0.0"]);
    expect(result.failedConstraints).toEqual([]);
  });

  it("should handle caret range", () => {
    const constraints: VersionConstraint[] = [{ operator: "^", version: "18.0.0" }];
    const result = satisfiesRequirement("18.5.2", constraints);
    expect(result.satisfies).toBe(true);
    expect(result.satisfiedConstraints).toEqual(["^18.0.0"]);
    expect(result.failedConstraints).toEqual([]);
  });

  it("should handle tilde range", () => {
    const constraints: VersionConstraint[] = [{ operator: "~", version: "18.1.0" }];
    const result = satisfiesRequirement("18.1.5", constraints);
    expect(result.satisfies).toBe(true);
    expect(result.satisfiedConstraints).toEqual(["~18.1.0"]);
    expect(result.failedConstraints).toEqual([]);
  });

  it("should handle invalid current version", () => {
    const constraints: VersionConstraint[] = [{ operator: ">=", version: "18.0.0" }];
    const result = satisfiesRequirement("invalid", constraints);
    expect(result.satisfies).toBe(false);
    expect(result.satisfiedConstraints).toEqual([]);
    expect(result.failedConstraints).toEqual(["Invalid current version format"]);
  });

  it("should handle invalid constraint version", () => {
    const constraints: VersionConstraint[] = [
      { operator: ">=", version: "18.0.0" },
      { operator: ">=", version: "invalid" },
    ];
    const result = satisfiesRequirement("19.0.0", constraints);
    expect(result.satisfies).toBe(false);
    expect(result.satisfiedConstraints).toEqual([">=18.0.0"]);
    expect(result.failedConstraints).toEqual(["Invalid version format: >=invalid"]);
  });

  it("should handle empty constraints array", () => {
    const constraints: VersionConstraint[] = [];
    const result = satisfiesRequirement("18.0.0", constraints);
    expect(result.satisfies).toBe(true);
    expect(result.satisfiedConstraints).toEqual([]);
    expect(result.failedConstraints).toEqual([]);
  });

  it("should handle single constraint", () => {
    const constraints: VersionConstraint[] = [{ operator: ">=", version: "18.0.0" }];
    const result = satisfiesRequirement("20.0.0", constraints);
    expect(result.satisfies).toBe(true);
    expect(result.satisfiedConstraints).toEqual([">=18.0.0"]);
    expect(result.failedConstraints).toEqual([]);
  });

  it("should handle pre-release versions", () => {
    const constraints: VersionConstraint[] = [{ operator: ">=", version: "18.0.0-alpha.1" }];
    const result = satisfiesRequirement("18.0.0-beta.1", constraints);
    expect(result.satisfies).toBe(true);
    expect(result.satisfiedConstraints).toEqual([">=18.0.0-alpha.1"]);
    expect(result.failedConstraints).toEqual([]);
  });
});
