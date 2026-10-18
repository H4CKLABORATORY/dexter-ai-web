import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

const site = resolve(process.argv[2] || '');
assert(existsSync(site), 'Static Pages artifact directory missing');
const sub = resolve(site, 'mira');
const html = readFileSync(join(sub, 'index.html'), 'utf8');
assert(html.includes('id="cosmos"'), 'Neural canvas absent');
assert(html.includes('id="viewCompare"'), 'A/B laboratory control absent');
const assetNames = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map((m) => m[1]);
const expected = new Set(['styles.css', 'compare.js', 'analyzer.js', 'visual.js', 'studio.js', 'manifest.webmanifest', 'apple-touch-icon.png']);
for (const asset of expected) assert(assetNames.includes(asset), `Index missing asset ${asset}`);
for (const asset of assetNames) {
  const url = new URL(asset, 'https://h4cklaboratory.github.io/dexter-ai-web/mira/');
  assert(url.pathname.startsWith('/dexter-ai-web/mira/'), `Asset escapes /mira/: ${asset}`);
  const path = resolve(sub, decodeURIComponent(url.pathname.substring('/dexter-ai-web/mira/'.length)));
  assert(path.startsWith(sub + '/') && existsSync(path) && statSync(path).size > 0, `Missing/empty ${asset}`);
}
const manifest = JSON.parse(readFileSync(join(sub,'manifest.webmanifest'), 'utf8'));
assert(manifest.start_url === './' && manifest.scope === './', 'PWA base paths incorrect');
for(const icon of manifest.icons) assert(existsSync(join(sub,icon.src)), `PWA icon missing: ${icon.src}`);
const sw = readFileSync(join(sub,'sw.js'),'utf8');
assert(sw.includes("'./index.html'") && sw.includes("'./styles.css'"), 'Service worker precache missing essentials');
assert(html.includes('serviceWorker.register("./sw.js")'), 'Service worker not registered with /mira/ scope');
assert(existsSync(join(site,'index.html')), 'Existing root homepage missing');
console.log(`PASS: /mira/ index, ${assetNames.length} linked assets, PWA scope & cache, root homepage preserved`);