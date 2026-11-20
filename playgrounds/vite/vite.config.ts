import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { mockApi } from './mock-api.ts';

export default defineConfig({
  plugins: [react(), mockApi()],
  resolve: {
    // Use the package's source, not its dist build, so edits hot-reload
    // without running `pnpm build` first.
    alias: [
      {
        find: /^swr-devtools-react$/,
        replacement: fileURLToPath(new URL('../../packages/react/src/index.ts', import.meta.url))
      },
      {
        find: /^swr-devtools-react\/production$/,
        replacement: fileURLToPath(
          new URL('../../packages/react/src/production.ts', import.meta.url)
        )
      }
    ]
  },
  server: {
    port: 5173
  }
});
