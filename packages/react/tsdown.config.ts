import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  platform: "browser",
  dts: true,
  // Next.js App Router needs this at the top of the bundle.
  banner: "'use client';",
  deps: {
    // core is internal: bundle it in instead of importing it.
    alwaysBundle: ["@swr-devtools-react/core"],
    // Fail the build if the output imports anything except the peers.
    onlyImport: ["react", "swr"],
  },
});

export default config;
