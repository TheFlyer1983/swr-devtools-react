// Fails if a production build of either playground contains devtools code.
// Run after `pnpm build` and both playgrounds' `build`.
//
// It looks for strings that only the devtools' own code contains. The
// library's dist must contain them, so the check can't pass by looking for
// the wrong thing.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MARKERS = ['Open SWR Devtools', 'Resize SWR Devtools'];

const LIBRARY = 'packages/react/dist';
const BUNDLES = [
  'playgrounds/vite/dist',
  // Client and server output. Not .next/dev or .next/cache, which `next dev`
  // and build caching write.
  'playgrounds/next/.next/static',
  'playgrounds/next/.next/server'
];

function jsFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.(c|m)?js$/.test(file))
    .map((file) => join(dir, file));
}

function filesWithMarkers(dir: string): string[] {
  return jsFiles(dir).filter((file) => {
    const source = readFileSync(file, 'utf8');
    return MARKERS.some((marker) => source.includes(marker));
  });
}

let failed = false;

if (filesWithMarkers(LIBRARY).length === 0) {
  console.error(`No marker found in ${LIBRARY}. Update MARKERS to match the devtools' code.`);
  failed = true;
}

for (const dir of BUNDLES) {
  const leaked = filesWithMarkers(dir);
  if (leaked.length === 0) {
    console.log(`ok    ${dir}`);
  } else {
    failed = true;
    console.error(`FAIL  ${dir} contains devtools code:`);
    for (const file of leaked) console.error(`        ${file}`);
  }
}

if (failed) process.exit(1);
