import type { BinaryChecker } from "./config.js";

export const commonCheckers: Record<string, BinaryChecker> = {
  node: {
    parseVersion: /v?(\d+\.\d+\.\d+)/,
  },
  npm: {
    parseVersion: "(\\d+\\.\\d+\\.\\d+)",
  },
  pnpm: {
    parseVersion: /(\d+\.\d+\.\d+)/,
  },
  git: {
    parseVersion: /git version (\d+\.\d+\.\d+)/,
  },
  docker: {
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
  python: {
    parseVersion: /Python (\d+\.\d+\.\d+)/,
  },
  python3: {
    parseVersion: /Python (\d+\.\d+\.\d+)/,
  },
  bun: {
    parseVersion: /(\d+\.\d+\.\d+)/,
  },
};
