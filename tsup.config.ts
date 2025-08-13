import { defineConfig } from "tsup";

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
    target: "es2022",
    outDir: "dist",
  },
  // CLI executable build
  {
    entry: { doctor: "src/main.ts" },
    format: ["esm"],
    outDir: "dist",
    banner: {
      js: "#!/usr/bin/env node",
    },
    clean: false,
    target: "es2022",
    platform: "node",
    onSuccess: "chmod +x dist/doctor.js",
  },
]);
