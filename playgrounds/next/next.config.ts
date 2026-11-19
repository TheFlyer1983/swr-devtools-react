import type { NextConfig } from 'next';

const config: NextConfig = {
  // The shared playground code is TypeScript source, not a built package.
  transpilePackages: ['@swr-devtools-react/playground-shared'],
  typescript: {
    // Next reads this tsconfig, which has no `paths`, so it bundles
    // swr-devtools-react from its built dist, like a real app would. That
    // checks the dist's 'use client' banner. tsconfig.json points `paths` at
    // the source for typechecking without a build.
    tsconfigPath: './tsconfig.next.json'
  }
};

export default config;
