import { defineConfig } from "tsup";

export default defineConfig([
  // Library build
  {
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    splitting: false,
    sourcemap: true,
    minify: false,
    target: "es2022",
    outDir: "dist",
  },
  // CLI executable build
  {
    entry: ["src/main.ts"],
    format: ["esm"],
    outDir: "dist",
    banner: {
      js: "#!/usr/bin/env node",
    },
    clean: false,
    target: "es2022",
    name: "cli",
    platform: "neutral",
    onSuccess: "chmod +x dist/main.js",
  },
]);
