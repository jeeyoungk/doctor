import { defineConfig } from "tsup";

/**
 * Node 18 (which is the engine version we're using) supports ES2023
 */
const target = "es2023";
const outDir = "dist";
const common = {
  target,
  outDir,
  platform: "node",
} as const;

export default defineConfig([
  // Library build
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: {
      resolve: true,
    },
    clean: true,
    splitting: false,
    sourcemap: true,
    minify: false,
    ...common,
  },
  // CLI executable build
  {
    entry: { doctor: "src/main.ts" },
    format: ["esm"],
    banner: { js: "#!/usr/bin/env node" },
    onSuccess: "chmod +x dist/doctor.js",
    ...common,
  },
]);
