// High-level JavaScript bridge for domain-words WebAssembly (app.wasm + app.mjs).
import { instantiate, instantiateKizu } from './app.mjs';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const PanelTab = Object.freeze({ Controls: 0, Prompt: 1, Compare: 2 });
export const PanelEvent = Object.freeze({ ToControls: 0, ToPrompt: 1, ToCompare: 2, SelectWord: 3 });
export const Drawer = Object.freeze({ Closed: 0, Open: 1 });
export const DrawerEvent = Object.freeze({ Open: 0, Close: 1, Toggle: 2, PickWord: 3, Escape: 4 });
export const Playback = Object.freeze({ Idle: 0, Playing: 1 });
export const PlaybackEvent = Object.freeze({ Play: 0, Stop: 1, WordChanged: 2 });

export function wordsJsonToIndexTsv(words) {
  const clean = (s) => String(s ?? '').replace(/[\t\r\n]+/g, ' ').trim();
  const lines = words.map((w, idx) => [
    idx,
    w.cat,
    clean(w.id),
    clean(w.title),
    clean(w.en),
    clean((w.symptoms || []).join(' ')),
    clean(w.summary),
  ].join('\t'));
  return encoder.encode(lines.join('\n') + '\n');
}

export async function createCore({ words, source } = {}) {
  const slots = [null, null];
  let searchText = '';
  let svgText = '';
  let readoutText = '';
  let hintText = '';
  let pcmBytes = null;
  let lastError = '';

  const options = {
    write(stream, bytes) {
      if (stream === 2 && typeof console !== 'undefined') {
        console.error(decoder.decode(bytes));
      }
      return true;
    },
    host: {
      read_input(host, slot, offset, pointer, capacity) {
        const src = slots[slot];
        if (!src) return 0;
        const start = offset >>> 0;
        const end = Math.min(src.byteLength, start + (capacity >>> 0));
        if (end <= start) return 0;
        return host.writeBytes(pointer, src.subarray(start, end));
      },
      give_bytes(host, kind, pointer, length) {
        const bytes = host.readBytes(pointer, length);
        if (kind === 0) searchText = decoder.decode(bytes);
        else if (kind === 1) svgText = decoder.decode(bytes);
        else if (kind === 2) readoutText = decoder.decode(bytes);
        else if (kind === 3) hintText = decoder.decode(bytes);
        else if (kind === 4) pcmBytes = bytes;
      },
      give_error(host, pointer, length) {
        lastError = decoder.decode(host.readBytes(pointer, length));
      },
    },
  };

  const program = source !== undefined
    ? await instantiateKizu(source, options)
    : await instantiate(options);
  program.start();
  const e = program.exports;

  const tsv = wordsJsonToIndexTsv(words || []);
  slots[0] = tsv;
  lastError = '';
  const handle = e.core_new(tsv.byteLength) >>> 0;
  slots[0] = null;
  if (!handle) {
    throw new Error(lastError || 'Failed to initialize domain-words core');
  }

  return Object.freeze({
    PanelTab,
    PanelEvent,
    Drawer,
    DrawerEvent,
    Playback,
    PlaybackEvent,
    panelNext: (s, ev) => e.panel_next(s, ev),
    drawerNext: (s, ev) => e.drawer_next(s, ev),
    playbackNext: (s, ev) => e.playback_next(s, ev),
    totalWords: () => e.total_words(),
    sampleRate: () => e.audio_sample_rate(),
    hasAudio: (wordId) => e.demo_has_audio(wordId) !== 0,

    search(categoryFilter, query = '') {
      const qBytes = encoder.encode(String(query || ''));
      slots[1] = qBytes;
      searchText = '';
      lastError = '';
      try {
        const rc = e.catalog_search(handle, categoryFilter, qBytes.byteLength);
        if (rc !== 0) throw new Error(lastError || 'Search failed');
        if (!searchText) return [];
        return searchText.split(',').map((x) => Number.parseInt(x, 10)).filter((n) => !Number.isNaN(n));
      } finally {
        slots[1] = null;
      }
    },

    renderDemo(wordId, params = {}) {
      svgText = '';
      readoutText = '';
      hintText = '';
      lastError = '';
      const rc = e.demo_render(
        wordId,
        params.p0 | 0,
        params.p1 | 0,
        params.p2 | 0,
        params.p3 | 0,
        params.tick | 0,
        params.action | 0,
      );
      if (rc !== 0) throw new Error(lastError || 'Demo render failed');
      return { svg: svgText, readout: readoutText, hint: hintText };
    },

    synthPcm(wordId, params = {}) {
      pcmBytes = null;
      lastError = '';
      const rc = e.demo_synth_pcm(
        wordId,
        params.p0 | 0,
        params.p1 | 0,
        params.p2 | 0,
        params.p3 | 0,
        params.tick | 0,
        params.action | 0,
      );
      if (rc !== 0) throw new Error(lastError || 'PCM synthesis failed');
      if (!pcmBytes || pcmBytes.byteLength === 0) return new Float32Array(0);
      const copy = pcmBytes.slice();
      return new Float32Array(copy.buffer, copy.byteOffset, Math.floor(copy.byteLength / 4));
    },
  });
}
