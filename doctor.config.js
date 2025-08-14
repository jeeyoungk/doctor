// Sample configuration for doctor CLI
// Usage: doctor [doctor.config.js]

/** @type {import("./src/doctor.ts").Config} */
export default {
  // Optional: Custom binary checkers (extends the built-in common checkers)
  checkers: [
    // Example custom checker for TypeScript compiler
    {
      name: "tsc",
      command: "tsc",
      parseVersion: (output) => {
        const match = output.match(/Version (\d+\.\d+\.\d+)/);
        return match?.[1] ?? null;
      },
    },
  ],

  // Version requirements for binaries
  requirements: {
    // Basic version requirements
    node: {
      operator: ">=",
      version: "18.0.0",
    },

    npm: {
      operator: ">=",
      version: "8.0.0",
    },

    // Git requirement
    git: {
      operator: ">=",
      version: "2.0.0",
    },

    // Bun requirement (if available)
    bun: {
      operator: ">=",
      version: "1.0.0",
    },

    // Docker requirement (optional - may not be installed) - using string format
    docker: ">= 20.0.0, < 30.0.0",

    // TypeScript requirement (using custom checker above)
    tsc: {
      operator: ">=",
      version: "4.0.0",
    },

    python: {
      operator: "^",
      version: "3.8.0",
    },
  },
};
