// PassGen – ui.js
import { generateBatch } from "./generators.js";
import { SEPARATORS } from "./wordlists.js";

// ── State
let currentType = "word";
let currentOpts  = {};
let results      = [];

// ── DOM helpers
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Collect options from active panel
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function gatherOpts() {
  if (currentType === "word") {
    return {
      wordCount:  parseInt($("#word-count").value),
      separator:  $("#word-sep").value,
      capitalize: $("#word-cap").checked,
      injectNum:  $("#word-num").checked,
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
  return {
    wordCount:  parseInt($("#phrase-count").value),
    separator:  $("#phrase-sep").value === "random" ? null : $("#phrase-sep").value,
    capitalize: $("#phrase-cap").checked,
    injectNum:  $("#phrase-num").checked,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Generate and render
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function generate() {
  currentOpts = gatherOpts();
  results     = generateBatch(currentType, currentOpts, 3);
  renderResults(results);
}

function renderResults(results) {
  const container = $("#results");
  container.innerHTML = "";
  results.forEach((r, idx) => {
    const card = buildResultCard(r, idx);
    container.appendChild(card);
  });
}

function buildResultCard(r, idx) {
  const card = document.createElement("div");
  card.className = "result-card" + (idx === 0 ? " result-card--primary" : "");

  // Password value
  const pwLine = document.createElement("div");
  pwLine.className = "pw-line";

  const pwText = document.createElement("span");
  pwText.className = "pw-value";
  pwText.textContent = r.value;
  pwText.setAttribute("data-password", r.value);

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.setAttribute("aria-label", "Copy password");
  copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
  copyBtn.addEventListener("click", () => copyPassword(r.value, copyBtn));

  pwLine.appendChild(pwText);
  pwLine.appendChild(copyBtn);

  // Entropy bar + meta
  const meta = document.createElement("div");
  meta.className = "pw-meta";

  const entropyBar = buildEntropyBar(r.bits);
  const metaRight  = document.createElement("div");
  metaRight.className = "pw-meta-right";

  const strengthSpan = document.createElement("span");
  strengthSpan.className = `strength-badge strength--${r.strength.level}`;
  strengthSpan.textContent = r.strength.label;

  const bitsSpan = document.createElement("span");
  bitsSpan.className = "pw-bits";
  bitsSpan.textContent = `${r.bits} bits`;

  const timeSpan = document.createElement("span");
  timeSpan.className = "pw-time";
  timeSpan.textContent = `Crack time: ${r.time}`;

  metaRight.appendChild(strengthSpan);
  metaRight.appendChild(bitsSpan);
  metaRight.appendChild(timeSpan);

  meta.appendChild(entropyBar);
  meta.appendChild(metaRight);

  card.appendChild(pwLine);
  card.appendChild(meta);

  // Warnings
  if (r.warnings.length > 0) {
    const warnBlock = document.createElement("div");
    warnBlock.className = "pw-warnings";
    r.warnings.forEach(w => {
      const badge = document.createElement("div");
      badge.className = "warn-badge";
      badge.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>${w}`;
      warnBlock.appendChild(badge);
    });
    card.appendChild(warnBlock);
  }

  // Regenerate single
  const regenBtn = document.createElement("button");
  regenBtn.className = "regen-btn";
  regenBtn.textContent = "↻ Regenerate this one";
  regenBtn.addEventListener("click", () => {
    const [newResult] = generateBatch(currentType, currentOpts, 1);
    const newCard = buildResultCard(newResult, 0);
    card.replaceWith(newCard);
  });
  card.appendChild(regenBtn);

  return card;
}

function buildEntropyBar(bits) {
  const SEGMENTS = 10;
  const MAX_BITS = 130;
  const filled   = Math.min(SEGMENTS, Math.round((bits / MAX_BITS) * SEGMENTS));

  const bar = document.createElement("div");
  bar.className = "entropy-bar";
  bar.setAttribute("title", `${bits} bits of entropy`);

  for (let i = 0; i < SEGMENTS; i++) {
    const seg = document.createElement("span");
    seg.className = "entropy-seg" + (i < filled ? ` filled level-${getLevel(bits)}` : "");
    bar.appendChild(seg);
  }

  const label = document.createElement("span");
  label.className = "entropy-label";
  label.textContent = `${bits}b`;
  bar.appendChild(label);

  return bar;
}

function getLevel(bits) {
  if (bits < 40)  return 0;
  if (bits < 60)  return 1;
  if (bits < 80)  return 2;
  if (bits < 100) return 3;
  return 4;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Copy to clipboard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function copyPassword(value, btn) {
  try {
    await navigator.clipboard.writeText(value);
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    btn.classList.add("copy-btn--done");
    setTimeout(() => {
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`;
      btn.classList.remove("copy-btn--done");
    }, 2000);
  } catch {
    // Fallback for non-HTTPS
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.style.position = "fixed";
    ta.style.opacity  = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Slider display sync
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function syncSlider(inputId, displayId, suffix = "") {
  const input   = $(inputId);
  const display = $(displayId);
  if (!input || !display) return;
  display.textContent = input.value + suffix;
  input.addEventListener("input", () => {
    display.textContent = input.value + suffix;
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tab switching
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initTabs() {
  $$(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".tab-btn").forEach(b => b.classList.remove("tab-btn--active"));
      $$(".tab-panel").forEach(p => p.classList.remove("tab-panel--active"));
      btn.classList.add("tab-btn--active");
      currentType = btn.dataset.type;
      $(`#panel-${currentType}`).classList.add("tab-panel--active");
      generate();
    });
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API docs toggle
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initApiDocs() {
  const toggle = $("#api-toggle");
  const body   = $("#api-body");
  if (!toggle || !body) return;
  toggle.addEventListener("click", () => {
    const open = body.classList.toggle("api-body--open");
    toggle.querySelector(".chevron").style.transform = open ? "rotate(180deg)" : "";
    toggle.setAttribute("aria-expanded", open);
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Populate separator dropdowns
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function populateSepDropdowns() {
  const SEP_LABELS = {
    "-": "Hyphen  ( - )", ".": "Dot  ( . )", "_": "Underscore  ( _ )",
    "~": "Tilde  ( ~ )", "!": "Bang  ( ! )", "@": "At  ( @ )",
    "#": "Hash  ( # )", "$": "Dollar  ( $ )", "%": "Percent  ( % )",
    "^": "Caret  ( ^ )", "&": "Ampersand  ( & )", "*": "Star  ( * )",
    "=": "Equals  ( = )", "+": "Plus  ( + )", "|": "Pipe  ( | )"
  };

  ["#word-sep", "#phrase-sep"].forEach(sel => {
    const el = $(sel);
    if (!el) return;
    // For phrase, add "Random" option
    if (sel === "#phrase-sep") {
      const opt = document.createElement("option");
      opt.value = "random"; opt.textContent = "Random (changes each time)";
      el.appendChild(opt);
    }
    SEPARATORS.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s; opt.textContent = SEP_LABELS[s] || s;
      if (s === "-") opt.selected = true;
      el.appendChild(opt);
    });
    // For phrase default to random
    if (sel === "#phrase-sep") el.value = "random";
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Keyboard shortcut: Space / Enter = regenerate all
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function initKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      generate();
      $("#gen-btn")?.classList.add("gen-btn--pulse");
      setTimeout(() => $("#gen-btn")?.classList.remove("gen-btn--pulse"), 300);
    }
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Boot
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.addEventListener("DOMContentLoaded", () => {
  populateSepDropdowns();
  initTabs();
  initApiDocs();
  initKeyboard();

  // Slider sync
  syncSlider("#word-count",   "#word-count-val",   " words");
  syncSlider("#char-len",     "#char-len-val",      " chars");
  syncSlider("#phrase-count", "#phrase-count-val",  " words");

  // Wire controls to live regeneration
  $$("input[type=range], input[type=checkbox], select").forEach(el => {
    el.addEventListener("change", generate);
    if (el.type === "range") el.addEventListener("input", generate);
  });

  // Generate button
  $("#gen-btn").addEventListener("click", generate);

  // Initial generation
  generate();
});
