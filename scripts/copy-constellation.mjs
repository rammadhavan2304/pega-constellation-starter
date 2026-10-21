// Copies the Pega ConstellationJS engine files from node_modules into
// public/constellation so Vite can serve them. These files are licensed by
// Pegasystems under the "ConstellationJS Engine License" and are therefore NOT
// committed to this repository; they are restored on every `npm install`.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@pega', 'constellationjs', 'dist');
const dest = join(root, 'public', 'constellation');
const prerequisite = join(dest, 'prerequisite');

if (!existsSync(src)) {
  console.warn('[copy-constellation] @pega/constellationjs not installed; skipping.');
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(prerequisite, { recursive: true });

cpSync(join(src, 'bootstrap-shell.js'), join(dest, 'bootstrap-shell.js'));
cpSync(join(src, 'lib_asset.json'), join(dest, 'lib_asset.json'));

for (const entry of readdirSync(src)) {
  if (entry.startsWith('bootstrap-shell') || entry === 'lib_asset.json' || entry.startsWith('ConstellationJS Engine License')) {
    continue;
  }
  cpSync(join(src, entry), join(prerequisite, entry), { recursive: true });
}

console.log('[copy-constellation] Copied ConstellationJS engine to public/constellation');
