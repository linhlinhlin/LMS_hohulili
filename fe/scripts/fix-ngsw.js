/**
 * fix-ngsw.js — Remove phantom file references from ngsw.json
 *
 * Angular 20 esbuild builder has a bug where CSS chunks that get merged
 * into the main bundle are still referenced in ngsw.json but don't exist
 * as physical files. This causes NGSW installation to fail (prefetch 404).
 *
 * This script runs after `ng build` and removes any ngsw.json entries
 * for files that don't exist in the build output.
 */
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist', 'lms-angular', 'browser');
const NGSW_PATH = path.join(DIST_DIR, 'ngsw.json');

if (!fs.existsSync(NGSW_PATH)) {
  console.log('[fix-ngsw] No ngsw.json found, skipping.');
  process.exit(0);
}

const ngsw = JSON.parse(fs.readFileSync(NGSW_PATH, 'utf8'));
let removed = 0;

// Fix assetGroups: remove URLs for files that don't exist
for (const group of ngsw.assetGroups || []) {
  const before = group.urls.length;
  group.urls = group.urls.filter(url => {
    const filePath = path.join(DIST_DIR, url);
    const exists = fs.existsSync(filePath);
    if (!exists) {
      console.log(`[fix-ngsw] Removing phantom: ${url} (not found on disk)`);
    }
    return exists;
  });
  removed += before - group.urls.length;
}

// Fix hashTable: remove entries for files that don't exist
for (const url of Object.keys(ngsw.hashTable || {})) {
  const filePath = path.join(DIST_DIR, url);
  if (!fs.existsSync(filePath)) {
    delete ngsw.hashTable[url];
  }
}

if (removed > 0) {
  fs.writeFileSync(NGSW_PATH, JSON.stringify(ngsw, null, 2));
  console.log(`[fix-ngsw] Fixed ngsw.json: removed ${removed} phantom file(s).`);
} else {
  console.log('[fix-ngsw] ngsw.json is clean, no phantom files found.');
}
