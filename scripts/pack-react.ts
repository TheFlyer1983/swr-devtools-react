// Packs swr-devtools-react into .pack/swr-devtools-react.tgz with the root
// README, which is the npm page. packages/react/README.md is a short pointer
// for people browsing the repo, so it's swapped out while packing and always
// restored, even when packing fails.

import { execFileSync } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

const PACKAGE_README = 'packages/react/README.md';

const pointer = readFileSync(PACKAGE_README);
copyFileSync('README.md', PACKAGE_README);
try {
  execFileSync(
    'pnpm',
    [
      '--filter',
      'swr-devtools-react',
      'exec',
      'pnpm',
      'pack',
      '--out',
      '../../.pack/swr-devtools-react.tgz'
    ],
    { stdio: 'inherit' }
  );
} finally {
  writeFileSync(PACKAGE_README, pointer);
}
