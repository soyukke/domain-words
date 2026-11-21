// Thin browser shell for domain-words (Kizu WebAssembly core + Web Audio).
import { createCore } from './core/index.mjs';
import { PcmPlayer } from './audio.js';

const $ = (id) => document.getElementById(id);

const player = new PcmPlayer();
let core = null;
let catalog = null;
let wordsById = new Map();

let currentIdx = 0;
let currentCat = 0;
let panelState = 0; // PanelTab.Controls
let drawerState = 0; // Drawer.Closed
let playbackState = 0; // Playback.Idle
let params = { p0: 0, p1: 0, p2: 0, p3: 0, tick: 0, action: 0 };
let lastHint = '';
let animRaf = 0;
let statusTimer = 0;

function showStatus(msg) {
  const el = $('status-msg');
  el.textContent = msg;
  clearTimeout(statusTimer);
  if (msg) {
    statusTimer = setTimeout(() => {
      el.textContent = '';
    }, 2200);
  }
}

function stopPlayback() {
  if (animRaf) {
    cancelAnimationFrame(animRaf);
    animRaf = 0;
  }
  player.stop();
  if (core) {
    playbackState = core.playbackNext(playbackState, core.PlaybackEvent.Stop);
  }
  updatePlayButton();
}

function currentWord() {
  return catalog.words[currentIdx];
}

function updatePlayButton() {
  const w = currentWord();
  const btn = $('play-btn');
  const label = $('play-label');
  const hasSound = core && core.hasAudio(w.idx);
  const hasAnim = Boolean(w.anim);
  if (!hasSound && !hasAnim) {
    btn.hidden = true;
    return;
  }
  btn.hidden = false;
  if (playbackState === core.Playback.Playing) {
    label.textContent = '停止';
  } else if (hasAnim) {
    label.textContent = w.anim.button || '試す';
  } else {
    label.textContent = '音を聴く';
  }
}

function renderDemo() {
  const w = currentWord();
  const res = core.renderDemo(w.idx, params);
  $('demo-canvas').innerHTML = res.svg;
  $('demo-readout').textContent = res.readout;
  lastHint = res.hint;
  $('prompt-after').textContent = w.after.replace('{hint}', lastHint);
}

function applyPanelTab() {
  const panes = [
    { tab: $('tab-controls'), pane: $('pane-controls'), id: core.PanelTab.Controls },
    { tab: $('tab-prompt'), pane: $('pane-prompt'), id: core.PanelTab.Prompt },
    { tab: $('tab-compare'), pane: $('pane-compare'), id: core.PanelTab.Compare },
  ];
  for (const item of panes) {
    const active = panelState === item.id;
    item.tab.setAttribute('aria-selected', String(active));
    item.pane.hidden = !active;
  }
}

function renderCategories() {
  const strip = $('cat-strip');
  strip.innerHTML = '';
  for (const cat of catalog.categories) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill';
    btn.role = 'tab';
    btn.textContent = cat.label;
    btn.setAttribute('aria-selected', String(cat.id === currentCat));
    btn.addEventListener('click', () => {
      const first = catalog.words.find((w) => w.cat === cat.id);
      if (first) selectWord(first.idx, true);
    });
    strip.appendChild(btn);
  }
}

function renderWordStrip() {
  const strip = $('word-strip');
  strip.innerHTML = '';
  const list = catalog.words.filter((w) => w.cat === currentCat);
  for (const w of list) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pill';
    btn.role = 'tab';
    btn.textContent = w.title;
    btn.setAttribute('aria-selected', String(w.idx === currentIdx));
    btn.addEventListener('click', () => selectWord(w.idx, true));
    strip.appendChild(btn);
  }
  const active = strip.querySelector('[aria-selected="true"]');
  if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function renderControls() {
  const w = currentWord();
  const host = $('controls-list');
  host.innerHTML = '';

  for (const ctrl of w.controls) {
    const wrap = document.createElement('div');
    wrap.className = 'ctrl';

    if (ctrl.type === 'range') {
      const head = document.createElement('div');
      head.className = 'ctrl-head';
      const lbl = document.createElement('label');
      lbl.textContent = ctrl.label;
      const inputId = `ctrl-${ctrl.key}`;
      lbl.htmlFor = inputId;
      const val = document.createElement('span');
      val.className = 'ctrl-val';
      val.textContent = `${params[ctrl.key]}${ctrl.unit || ''}`;
      head.append(lbl, val);

      const range = document.createElement('input');
      range.type = 'range';
      range.id = inputId;
      range.min = String(ctrl.min);
      range.max = String(ctrl.max);
      range.value = String(params[ctrl.key]);
      range.addEventListener('input', () => {
        params[ctrl.key] = Number(range.value);
        val.textContent = `${params[ctrl.key]}${ctrl.unit || ''}`;
        renderDemo();
      });
      wrap.append(head, range);
    } else if (ctrl.type === 'choice') {
      const head = document.createElement('div');
      head.className = 'ctrl-head';
      head.textContent = ctrl.label;
      const row = document.createElement('div');
      row.className = 'choice-row';
      ctrl.options.forEach((opt, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'choice-btn';
        b.textContent = opt;
        b.setAttribute('aria-pressed', String(params[ctrl.key] === i));
        b.addEventListener('click', () => {
          params[ctrl.key] = i;
          row.querySelectorAll('.choice-btn').forEach((el, j) => {
            el.setAttribute('aria-pressed', String(j === i));
          });
          renderDemo();
        });
        row.appendChild(b);
      });
      wrap.append(head, row);
    } else if (ctrl.type === 'toggle') {
      const lbl = document.createElement('label');
      lbl.className = 'toggle-row';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = params[ctrl.key] !== 0;
      cb.addEventListener('change', () => {
        params[ctrl.key] = cb.checked ? 1 : 0;
        renderDemo();
      });
      const txt = document.createElement('span');
      txt.textContent = ctrl.label;
      lbl.append(cb, txt);
      wrap.appendChild(lbl);
    }
    host.appendChild(wrap);
  }
}

function renderMeta() {
  const w = currentWord();
  $('word-title').textContent = w.title;
  $('word-en').textContent = w.en;
  $('word-summary').textContent = w.summary;
  $('word-pos').textContent = `${w.idx + 1} / ${catalog.words.length}`;
  $('prompt-before').textContent = w.before;

  const symHost = $('symptom-tags');
  symHost.innerHTML = '';
  for (const s of w.symptoms) {
    const span = document.createElement('span');
    span.className = 'chip';
    span.textContent = s;
    symHost.appendChild(span);
  }

  const cmpHost = $('compare-list');
  cmpHost.innerHTML = '';
  for (const c of w.compare) {
    const box = document.createElement('div');
    box.className = 'compare-item';
    const dt = document.createElement('dt');
    dt.textContent = c.term;
    const dd = document.createElement('dd');
    dd.textContent = c.diff;
    box.append(dt, dd);
    cmpHost.appendChild(box);
  }

  const relHost = $('related-list');
  relHost.innerHTML = '';
  for (const rid of w.related || []) {
    const target = wordsById.get(rid);
    if (!target) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = target.title;
    btn.addEventListener('click', () => selectWord(target.idx, true));
    relHost.appendChild(btn);
  }
}

function selectWord(idx, pushHash = false) {
  stopPlayback();
  currentIdx = ((idx % catalog.words.length) + catalog.words.length) % catalog.words.length;
  const w = currentWord();
  currentCat = w.cat;
  params = { ...w.defaults, tick: 0, action: 0 };
  panelState = core.panelNext(panelState, core.PanelEvent.SelectWord);
  playbackState = core.playbackNext(playbackState, core.PlaybackEvent.WordChanged);

  renderCategories();
  renderWordStrip();
  renderMeta();
  renderControls();
  applyPanelTab();
  updatePlayButton();
  renderDemo();

  if (pushHash) {
    history.replaceState(null, '', `#${w.id}`);
  }
}

function triggerPlay() {
  const w = currentWord();
  if (playbackState === core.Playback.Playing) {
    stopPlayback();
    params.tick = 0;
    renderDemo();
    return;
  }

  playbackState = core.playbackNext(playbackState, core.PlaybackEvent.Play);
  updatePlayButton();

  if (core.hasAudio(w.idx)) {
    const samples = core.synthPcm(w.idx, params);
    const rate = core.sampleRate();
    player.play(samples, rate, () => {
      if (!w.anim) {
        playbackState = core.playbackNext(playbackState, core.PlaybackEvent.Stop);
        updatePlayButton();
      }
    });
  }

  if (w.anim) {
    const dur = w.anim.duration || 1000;
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      if (elapsed >= dur) {
        params.tick = dur;
        renderDemo();
        animRaf = 0;
        playbackState = core.playbackNext(playbackState, core.PlaybackEvent.Stop);
        updatePlayButton();
        return;
      }
      params.tick = Math.floor((elapsed / dur) * 1000);
      renderDemo();
      animRaf = requestAnimationFrame(step);
    };
    animRaf = requestAnimationFrame(step);
  }
}

// ---- Search & Symptom Drawer (with mobile ghost-click guard) --------------

function setDrawer(ev) {
  drawerState = core.drawerNext(drawerState, ev);
  const open = drawerState === core.Drawer.Open;
  $('search-backdrop').hidden = !open;
  if (open) {
    renderDrawerResults($('search-input').value);
    requestAnimationFrame(() => $('search-input').focus());
  }
}

function renderDrawerResults(query) {
  const host = $('drawer-results');
  const indices = core.search(-1, query);
  host.innerHTML = '';
  if (indices.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-note';
    empty.textContent = '一致するワードが見つかりません';
    host.appendChild(empty);
    return;
  }
  for (const idx of indices) {
    const w = catalog.words[idx];
    if (!w) continue;
    const cat = catalog.categories[w.cat];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'res-item';
    const t = document.createElement('span');
    t.className = 'res-title';
    t.textContent = w.title;
    const c = document.createElement('span');
    c.className = 'res-cat';
    c.textContent = `${cat ? cat.label : ''} · ${w.kind}`;
    const s = document.createElement('span');
    s.className = 'res-sum';
    s.textContent = w.summary;
    btn.append(t, c, s);
    btn.addEventListener('click', () => {
      setDrawer(core.DrawerEvent.PickWord);
      selectWord(w.idx, true);
    });
    host.appendChild(btn);
  }
}

function initDrawerSymptoms() {
  const host = $('drawer-symptoms');
  host.innerHTML = '';
  for (const sym of catalog.symptoms) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.textContent = sym.label;
    b.addEventListener('click', () => {
      $('search-input').value = sym.query;
      renderDrawerResults(sym.query);
    });
    host.appendChild(b);
  }
}

function copyText(text, doneMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showStatus(doneMsg)).catch(() => showStatus('コピー失敗'));
    return;
  }
  showStatus(doneMsg);
}

function bindEvents() {
  $('tab-controls').addEventListener('click', () => {
    panelState = core.panelNext(panelState, core.PanelEvent.ToControls);
    applyPanelTab();
  });
  $('tab-prompt').addEventListener('click', () => {
    panelState = core.panelNext(panelState, core.PanelEvent.ToPrompt);
    applyPanelTab();
  });
  $('tab-compare').addEventListener('click', () => {
    panelState = core.panelNext(panelState, core.PanelEvent.ToCompare);
    applyPanelTab();
  });

  $('prev-word').addEventListener('click', () => selectWord(currentIdx - 1, true));
  $('next-word').addEventListener('click', () => selectWord(currentIdx + 1, true));
  $('play-btn').addEventListener('click', triggerPlay);
  $('reset-btn').addEventListener('click', () => {
    stopPlayback();
    params = { ...currentWord().defaults, tick: 0, action: 0 };
    renderControls();
    renderDemo();
    showStatus('初期値へ戻した');
  });

  $('random-btn').addEventListener('click', () => {
    let next = Math.floor(Math.random() * catalog.words.length);
    if (next === currentIdx) next = (next + 1) % catalog.words.length;
    selectWord(next, true);
  });

  $('share-btn').addEventListener('click', () => {
    const w = currentWord();
    const url = `${location.origin}${location.pathname}#${w.id}`;
    copyText(`${w.title} (${w.en})\n${url}`, 'URLをコピーした');
  });

  $('copy-prompt').addEventListener('click', () => {
    copyText($('prompt-after').textContent, '指示文をコピーした');
  });

  $('brand-mark').addEventListener('click', (e) => {
    const href = $('brand-mark').getAttribute('href') || '';
    if (href.startsWith('#')) {
      e.preventDefault();
      selectWord(0, true);
    }
  });

  // Ghost-click safe drawer backdrop & close button
  let backdropDown = false;
  let closeDown = false;
  const backdrop = $('search-backdrop');
  const closeBtn = $('close-drawer');

  $('open-drawer').addEventListener('click', () => setDrawer(core.DrawerEvent.Open));
  backdrop.addEventListener('pointerdown', (e) => {
    backdropDown = e.target === backdrop;
  });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop && (backdropDown || e.detail === 0)) {
      setDrawer(core.DrawerEvent.Close);
    }
    backdropDown = false;
  });
  closeBtn.addEventListener('pointerdown', () => {
    closeDown = true;
  });
  closeBtn.addEventListener('click', (e) => {
    if (closeDown || e.detail === 0) {
      setDrawer(core.DrawerEvent.Close);
    }
    closeDown = false;
  });

  $('search-input').addEventListener('input', (e) => {
    renderDrawerResults(e.target.value);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawerState === core.Drawer.Open) {
      setDrawer(core.DrawerEvent.Escape);
      return;
    }
    if (drawerState === core.Drawer.Open) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (e.key === '/') {
      e.preventDefault();
      setDrawer(core.DrawerEvent.Open);
    } else if (e.key === 'ArrowRight') {
      selectWord(currentIdx + 1, true);
    } else if (e.key === 'ArrowLeft') {
      selectWord(currentIdx - 1, true);
    } else if (e.key === ' ' && !$('play-btn').hidden) {
      e.preventDefault();
      triggerPlay();
    }
  });

  window.addEventListener('hashchange', () => {
    const id = location.hash.replace(/^#/, '');
    const w = wordsById.get(id);
    if (w && w.idx !== currentIdx) {
      selectWord(w.idx, false);
    }
  });
}

async function boot() {
  const res = await fetch('./data/words.json');
  if (!res.ok) throw new Error('Failed to load words.json');
  catalog = await res.json();
  wordsById = new Map(catalog.words.map((w) => [w.id, w]));
  core = await createCore({ words: catalog.words });

  $('count-note').textContent = `${catalog.words.length} words`;
  initDrawerSymptoms();
  bindEvents();

  const hashId = location.hash.replace(/^#/, '');
  const initial = wordsById.get(hashId);
  selectWord(initial ? initial.idx : 0, false);
}

boot().catch((err) => {
  console.error(err);
  showStatus('読み込みエラー');
});
