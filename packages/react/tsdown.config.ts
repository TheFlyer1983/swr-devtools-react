import { defineConfig, type UserConfig } from 'tsdown';

const config: UserConfig = defineConfig({
  entry: ['src/index.ts', 'src/production.ts'],
  format: 'esm',
  platform: 'browser',
  // Keep `process.env.NODE_ENV` as is, for the app's bundler to replace. The
  // browser platform would otherwise bake in 'development' and defeat the
  // production no-op in index.ts.
  define: { 'process.env.NODE_ENV': 'process.env.NODE_ENV' },
  dts: true,
  // Next.js App Router needs this at the top of the bundle.
  banner: "'use client';",
  deps: {
    // core is internal: bundle it in instead of importing it.
    alwaysBundle: ['@swr-devtools-react/core'],
    // Fail the build if the output imports anything except the peers.
    onlyImport: ['react', 'react-dom', 'swr']
  }
});

export default config;
