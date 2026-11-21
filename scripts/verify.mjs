#!/usr/bin/env node
// End-to-end verification of the compiled Kizu Wasm core + data/words.json.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCore } from '../web/core/index.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const srcWordsText = readFileSync(join(root, 'data/words.json'), 'utf8');
const webWordsText = readFileSync(join(root, 'web/data/words.json'), 'utf8');
const catalog = JSON.parse(srcWordsText);
const wasmBytes = readFileSync(join(root, 'web/core/app.wasm'));

const core = await createCore({ words: catalog.words, source: wasmBytes });
const errors = [];

if (srcWordsText !== webWordsText) {
  errors.push('data/words.json and web/data/words.json are out of sync');
}

if (catalog.words.length !== core.totalWords()) {
  errors.push(`words count mismatch: json=${catalog.words.length} wasm=${core.totalWords()}`);
}

const byId = new Set(catalog.words.map((w) => w.id));
let audioVerified = 0;

for (let i = 0; i < catalog.words.length; i++) {
  const w = catalog.words[i];
  if (w.idx !== i) errors.push(`${w.id}: idx=${w.idx} expected ${i}`);
  for (const rid of w.related || []) {
    if (!byId.has(rid)) errors.push(`${w.id}: broken related id ${rid}`);
  }
  const p = { ...w.defaults, tick: w.anim ? 350 : 0, action: 0 };
  const res = core.renderDemo(w.idx, p);
  if (!res.svg.startsWith('<svg ') || !res.svg.endsWith('</svg>')) {
    errors.push(`${w.id}: invalid svg wrapper`);
  }
  if (!res.readout || !res.hint) {
    errors.push(`${w.id}: empty readout or hint`);
  }
  if (core.hasAudio(w.idx)) {
    const pcm = core.synthPcm(w.idx, p);
    if (pcm.length < 1000) errors.push(`${w.id}: pcm too short (${pcm.length})`);
    let peak = 0;
    for (let s = 0; s < pcm.length; s++) {
      const a = Math.abs(pcm[s]);
      if (!Number.isFinite(a)) {
        errors.push(`${w.id}: non-finite pcm sample`);
        break;
      }
      if (a > peak) peak = a;
    }
    if (peak < 0.01) errors.push(`${w.id}: silent pcm (peak=${peak})`);
    audioVerified++;
  }
}

// Verify symptom & English search via Wasm
const hit1 = core.search(-1, 'のっぺり');
if (!hit1.includes(0)) errors.push(`search 'のっぺり' missing rim-light (0): ${hit1}`);
const hit2 = core.search(-1, 'merge');
if (!hit2.includes(30)) errors.push(`search 'merge' missing git-merge (30): ${hit2}`);
const hit3 = core.search(-1, 'bool');
if (!hit3.includes(31)) errors.push(`search 'bool' missing bool-and-types (31): ${hit3}`);

// Verify state machines via Wasm
if (core.panelNext(core.PanelTab.Compare, core.PanelEvent.SelectWord) !== core.PanelTab.Controls) {
  errors.push('panelNext failed SelectWord reset');
}
if (core.drawerNext(core.Drawer.Open, core.DrawerEvent.Escape) !== core.Drawer.Closed) {
  errors.push('drawerNext failed Escape close');
}

if (errors.length > 0) {
  console.error(`verify failed (${errors.length}):\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`verify ok: ${catalog.words.length} words, ${audioVerified} DSP audio synths, search & state machines verified via Wasm`);
