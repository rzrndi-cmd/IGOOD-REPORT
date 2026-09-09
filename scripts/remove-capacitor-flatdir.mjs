import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const files = [
  'android/app/build.gradle',
  'android/capacitor-cordova-android-plugins/build.gradle',
];

function removeFlatDirBlocks(source) {
  return source
    .replace(/\nrepositories\s*\{\s*flatDir\s*\{\s*dirs[^\n]*\n\s*\}\s*\}\s*\n/g, '\n')
    .replace(/\n\s*flatDir\s*\{\s*dirs[^\n]*\n\s*\}\n/g, '\n');
}

let changed = false;

for (const file of files) {
  const path = resolve(projectRoot, file);
  const before = readFileSync(path, 'utf8');
  const after = removeFlatDirBlocks(before);
  if (after !== before) {
    writeFileSync(path, after);
    changed = true;
    console.log(`Removed flatDir from ${file}`);
  }
}

if (!changed) console.log('No flatDir blocks found.');
