// PWD – ui.js
import { generateBatch } from "./generators.js";
import { SEPARATORS, SEP_LABELS } from "./wordlists.js";

let currentType = "word";
let currentOpts = {};

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ── Collect options from the active panel
function gatherOpts() {
  if (currentType === "word") {
    const sep = $("#word-sep").value;
    return {
      wordCount:  parseInt($("#word-count").value),
      separator:  sep === "__random__" ? pick(SEPARATORS) : sep,
      capMode:    $("#word-cap").value,
      injectNum:  $("#word-num").checked,
      leet:       $("#word-leet").checked,
    };
  }
  if (currentType === "char") {
    return {
      length:  parseInt($("#char-len").value),
      lower:   $("#char-lower").checked,
      upper:   $("#char-upper").checked,
      numbers: $("#char-nums").checked,
      special: $("#char-special").checked,
    };
  }
  // phrase
  const sep = $("#phrase-sep").value;
  return {
    wordCount:  parseInt($("#phrase-count").value),
    separator:  sep === "__random__" ? null : sep,
    capMode:    $("#phrase-cap").value,
    injectNum:  $("#phrase-num").checked,
    leet:       $("#phrase-leet").checked,
  };
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ── Generate + render
function generate() {
  currentOpts = gatherOpts();
  const results = generateBatch(currentType, currentOpts, 3);
  renderResults(results);
}

function renderResults(results) {
  const container = $("#results");
  container.innerHTML = "";
  results.forEach((r, idx) => container.appendChild(buildCard(r, idx)));
}

function buildCard(r, idx) {
  const card = document.createElement("div");
  card.className = "result-card" + (idx === 0 ? " result-card--primary" : "");

  // Password value + copy
  const pwLine  = document.createElement("div");
  pwLine.className = "pw-line";

  const pwText = document.createElement("span");
  pwText.className = "pw-value";
  pwText.textContent = r.value;

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.setAttribute("aria-label", "Copy password");
  copyBtn.innerHTML = iconCopy();
  copyBtn.addEventListener("click", () => copyPw(r.value, copyBtn));

  pwLine.appendChild(pwText);
  pwLine.appendChild(copyBtn);

  // Entropy bar + meta
  const meta = document.createElement("div");
  meta.className = "pw-meta";

  const bar = buildEntropyBar(r.bits);

  const metaRight = document.createElement("div");
  metaRight.className = "pw-meta-right";

  const badge = document.createElement("span");
  badge.className = `strength-badge strength--${r.strength.level}`;
  badge.textContent = r.strength.label;

  const bitsSpan = document.createElement("span");
  bitsSpan.className = "pw-bits";
  bitsSpan.textContent = `${r.bits} bits`;

  const timeSpan = document.createElement("span");
  timeSpan.className = "pw-time";
  timeSpan.textContent = `Crack time: ${r.time}`;

  metaRight.append(badge, bitsSpan, timeSpan);
  meta.append(bar, metaRight);

  card.append(pwLine, meta);

  // Warnings
  if (r.warnings.length > 0) {
    const warnBlock = document.createElement("div");
    warnBlock.className = "pw-warnings";
    r.warnings.forEach(w => {
      const b = document.createElement("div");
      b.className = "warn-badge";
      b.innerHTML = `${iconWarn()} ${w}`;
      warnBlock.appendChild(b);
    });
    card.appendChild(warnBlock);
  }

  // Regen single
  const regenBtn = document.createElement("button");
  regenBtn.className = "regen-btn";
  regenBtn.textContent = "↻ Regenerate this one";
  regenBtn.addEventListener("click", () => {
    const [fresh] = generateBatch(currentType, currentOpts, 1);
    card.replaceWith(buildCard(fresh, 0));
  });
  card.appendChild(regenBtn);

  return card;
}

function buildEntropyBar(bits) {
  const SEGS   = 12;
  const MAX    = 130;
  const filled = Math.min(SEGS, Math.round((bits / MAX) * SEGS));
  const level  = bits < 40 ? 0 : bits < 55 ? 1 : bits < 72 ? 2 : bits < 95 ? 3 : 4;

  const bar = document.createElement("div");
  bar.className = "entropy-bar";
  bar.title = `${bits} bits of entropy`;

  for (let i = 0; i < SEGS; i++) {
    const seg = document.createElement("span");
    seg.className = "entropy-seg" + (i < filled ? ` filled level-${level}` : "");
    bar.appendChild(seg);
  }

  const label = document.createElement("span");
  label.className = "entropy-label";
  label.textContent = `${bits}b`;
  bar.appendChild(label);
  return bar;
}

// ── Clipboard
async function copyPw(value, btn) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const ta = Object.assign(document.createElement("textarea"), {
      value, style: "position:fixed;opacity:0"
    });
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
  btn.innerHTML = iconCheck();
  btn.classList.add("copy-btn--done");
  setTimeout(() => {
    btn.innerHTML = iconCopy();
    btn.classList.remove("copy-btn--done");
  }, 2000);
}

// ── SVG icons
function iconCopy() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
}
function iconCheck() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
}
function iconWarn() {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
}

// ── Populate separator dropdowns
function populateSepDropdowns() {
  [["#word-sep", false], ["#phrase-sep", true]].forEach(([sel, hasRandom]) => {
    const el = $(sel);
    if (!el) return;
    if (hasRandom) {
      const opt = document.createElement("option");
      opt.value = "__random__";
      opt.textContent = "Random (changes each time)";
      opt.selected = true;
      el.appendChild(opt);
    }
    SEPARATORS.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = SEP_LABELS[s] || s;
      if (!hasRandom && s === "-") opt.selected = true;
      el.appendChild(opt);
    });
  });
}

// ── Slider sync
function syncSlider(inputId, displayId, suffix) {
  const input   = $(inputId);
  const display = $(displayId);
  if (!input || !display) return;
  const update = () => { display.textContent = input.value + suffix; };
  update();
  input.addEventListener("input", update);
}

// ── Tab switching
function initTabs() {
  $$(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".tab-btn").forEach(b => { b.classList.remove("tab-btn--active"); b.setAttribute("aria-selected","false"); });
      $$(".tab-panel").forEach(p => p.classList.remove("tab-panel--active"));
      btn.classList.add("tab-btn--active");
      btn.setAttribute("aria-selected", "true");
      currentType = btn.dataset.type;
      $(`#panel-${currentType}`).classList.add("tab-panel--active");
      generate();
    });
  });
}

// ── API docs toggle
function initApiDocs() {
  const toggle = $("#api-toggle");
  const body   = $("#api-body");
  if (!toggle || !body) return;
  toggle.addEventListener("click", () => {
    const open = body.classList.toggle("api-body--open");
    toggle.querySelector(".chevron").style.transform = open ? "rotate(180deg)" : "";
    toggle.setAttribute("aria-expanded", String(open));
  });
}

// ── Keyboard shortcut
function initKeyboard() {
  document.addEventListener("keydown", e => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      generate();
      const btn = $("#gen-btn");
      btn?.classList.add("gen-btn--pulse");
      setTimeout(() => btn?.classList.remove("gen-btn--pulse"), 300);
    }
  });
}

// ── Boot
document.addEventListener("DOMContentLoaded", () => {
  populateSepDropdowns();
  initTabs();
  initApiDocs();
  initKeyboard();

  syncSlider("#word-count",   "#word-count-val",   " words");
  syncSlider("#char-len",     "#char-len-val",      " chars");
  syncSlider("#phrase-count", "#phrase-count-val",  " words");

  // Live regen on any control change
  $$("input[type=range], input[type=checkbox], select").forEach(el => {
    el.addEventListener("change", generate);
    if (el.type === "range") el.addEventListener("input", generate);
  });

  $("#gen-btn").addEventListener("click", generate);
  generate();
});
