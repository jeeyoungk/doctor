// Sample requirements configuration for doctor verify command
// Usage: doctor verify sample-requirements.js

export default {
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

  // Docker requirement (optional - may not be installed)
  docker: {
    operator: ">=",
    version: "20.0.0",
  },

  // TypeScript requirement
  tsc: {
    operator: ">=",
    version: "4.0.0",
  },

  // Advanced semver examples
  python: {
    operator: "^",
    version: "3.8.0",
  },

  // Exact version requirement example
  // Uncomment to test exact version matching
  // "node-exact": {
  //   operator: "=",
  //   version: "20.0.0"
  // }
};
