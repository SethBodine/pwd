// PWD – ui.js  (v3 — simplified entropy display, no Discord)
import { generateBatch, WORD_LIST_SIZE } from "./generators.js";
import { SEPARATORS, SEP_LABELS } from "./wordlists.js";
import { BASELINE_LABEL } from "./entropy.js";

// Hashes considered insecure regardless of password complexity
const INSECURE_ALGOS = ["MD5","SHA-1","NTLM","LM","DES","RC4"];

let currentType = "word";
let currentOpts = {};

const $  = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

function gatherOpts() {
  if (currentType === "word") {
    return {
      wordCount: parseInt($("#word-count").value),
      separator: $("#word-sep").value,
      capMode:   $("#word-cap").value,
      injectNum: $("#word-num").checked,
      leet:      $("#word-leet").checked,
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
  const sep = $("#phrase-sep").value;
  return {
    wordCount: parseInt($("#phrase-count").value),
    separator: sep === "__random__" ? null : sep,
    capMode:   $("#phrase-cap").value,
    injectNum: $("#phrase-num").checked,
    leet:      $("#phrase-leet").checked,
  };
}

function generate() {
  currentOpts = gatherOpts();
  const results = generateBatch(currentType, currentOpts, 3);
  const container = $("#results");
  container.innerHTML = "";
  results.forEach((r, idx) => container.appendChild(buildCard(r, idx)));
}

function buildCard(r, idx) {
  const card = document.createElement("div");
  card.className = "result-card" + (idx === 0 ? " result-card--primary" : "");

  // Password + copy
  const pwLine = document.createElement("div");
  pwLine.className = "pw-line";
  const pwText = document.createElement("span");
  pwText.className = "pw-value";
  pwText.textContent = r.value;
  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.setAttribute("aria-label", "Copy password");
  copyBtn.innerHTML = iconCopy();
  copyBtn.addEventListener("click", () => copyPw(r.value, copyBtn));
  pwLine.append(pwText, copyBtn);

  // Entropy bar + badge
  const metaRow = document.createElement("div");
  metaRow.className = "pw-meta";
  metaRow.appendChild(buildEntropyBar(r.bits));
  const badge = document.createElement("span");
  badge.className = `strength-badge strength--${r.strength.level}`;
  badge.textContent = r.strength.label;
  const bitsSpan = document.createElement("span");
  bitsSpan.className = "pw-bits";
  bitsSpan.textContent = `${r.bits}b`;
  metaRow.append(badge, bitsSpan);

  // Dual model timing block
  const timing = buildTimingBlock(r);

  card.append(pwLine, metaRow, timing);

  // Warnings
  if (r.warnings.length > 0) {
    const wb = document.createElement("div");
    wb.className = "pw-warnings";
    r.warnings.forEach(w => {
      const b = document.createElement("div");
      b.className = "warn-badge";
      // Use separate nodes: SVG icon via innerHTML, warning text via textContent.
      // Keeps the icon markup intact while preventing any future API-sourced
      // warning string from being interpreted as HTML.
      const icon = document.createElement("span");
      icon.innerHTML = iconWarn();
      const txt = document.createElement("span");
      txt.textContent = w;
      b.appendChild(icon);
      b.appendChild(txt);
      wb.appendChild(b);
    });
    card.appendChild(wb);
  }

  // Regen
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

function buildTimingBlock(r) {
  const isPassphrase = r.type === "word" || r.type === "phrase";
  const wrap = document.createElement("div");
  wrap.className = "timing-block";

  if (isPassphrase) {
    // Two columns: generation model vs brute-force model
    const row = document.createElement("div");
    row.className = "timing-row";

    const cellA = document.createElement("div");
    cellA.className = "timing-cell timing-cell--a";
    cellA.innerHTML = `
      <span class="timing-label">Generation model <span class="timing-tip" title="Attacker knows your wordlist and word count — the conservative cryptographic bound">ⓘ</span></span>
      <span class="timing-time">${r.time}</span>
      <span class="timing-sub">${r.bits}b · ${BASELINE_LABEL}</span>
    `;

    const cellB = document.createElement("div");
    cellB.className = "timing-cell timing-cell--b";
    cellB.innerHTML = `
      <span class="timing-label">Brute-force model <span class="timing-tip" title="Attacker tries all character combinations — what most online meters show">ⓘ</span></span>
      <span class="timing-time">${r.bfTime}</span>
      <span class="timing-sub">${r.bfBits}b · character space</span>
    `;

    row.append(cellA, cellB);
    wrap.appendChild(row);

    const note = document.createElement("p");
    note.className = "timing-note";
    note.textContent = "Use the generation model (left) as your security benchmark — it's the conservative bound. Brute-force shows what passwordmonster and Bitwarden display.";
    wrap.appendChild(note);
  } else {
    // Character passwords — both models converge
    const cellA = document.createElement("div");
    cellA.className = "timing-cell timing-cell--a";
    cellA.style.flex = "1";
    cellA.innerHTML = `
      <span class="timing-label">Estimated crack time</span>
      <span class="timing-time">${r.time}</span>
      <span class="timing-sub">${r.bits}b · ${BASELINE_LABEL}</span>
    `;
    wrap.appendChild(cellA);
  }

  return wrap;
}

// ── Wordlist note — driven from actual WORD_LIST size, never hardcoded
function updateWordlistNote() {
  const note = $("#wordlist-note");
  if (!note) return;

  const size        = WORD_LIST_SIZE;
  const bitsPerWord = Math.log2(size);
  const EFF_THRESHOLD = 7776;

  if (size >= EFF_THRESHOLD) {
    note.hidden = true;
    return;
  }

  const bitsStr = bitsPerWord.toFixed(1);
  note.hidden = false;
  note.innerHTML =
    `<strong>Generation model crack time</strong> assumes an attacker who knows your exact wordlist ` +
    `(${size.toLocaleString()} words \u2192 ${bitsStr} bits/word). ` +
    `Upgrade to the full <a href="https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt" ` +
    `target="_blank" rel="noopener" class="text-link">EFF wordlist</a> ` +
    `(7,776 words \u2192 12.9 bits/word) for stronger estimates. See README for upgrade instructions.`;
}

// ── Insecure algo banner (rendered once into #insecure-banner)
function renderInsecureBanner() {
  const banner = $("#insecure-banner");
  if (!banner) return;
  banner.innerHTML = `
    <div class="insecure-icon">⚠</div>
    <div class="insecure-body">
      <strong>Insecure hashing algorithms — no password is safe in these</strong>
      <span>${INSECURE_ALGOS.join(" · ")} — these algorithms are broken and can be reversed in seconds regardless of password complexity. Any system using them should be considered compromised. Password strength is irrelevant when the hash itself is crackable.</span>
    </div>
  `;
}

function buildEntropyBar(bits) {
  const SEGS = 12, MAX = 130;
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
  const lbl = document.createElement("span");
  lbl.className = "entropy-label";
  lbl.textContent = `${bits}b`;
  bar.appendChild(lbl);
  return bar;
}

async function copyPw(value, btn) {
  try { await navigator.clipboard.writeText(value); }
  catch {
    const ta = Object.assign(document.createElement("textarea"), { value, style:"position:fixed;opacity:0" });
    document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
  }
  btn.innerHTML = iconCheck(); btn.classList.add("copy-btn--done");
  setTimeout(() => { btn.innerHTML = iconCopy(); btn.classList.remove("copy-btn--done"); }, 2000);
}

function iconCopy()  { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`; }
function iconCheck() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`; }
function iconWarn()  { return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`; }

function populateSepDropdowns() {
  [["#word-sep", false], ["#phrase-sep", true]].forEach(([sel, hasRandom]) => {
    const el = $(sel);
    if (!el) return;
    if (hasRandom) {
      const opt = Object.assign(document.createElement("option"), { value:"__random__", textContent:"Random (changes each time)", selected:true });
      el.appendChild(opt);
    }
    SEPARATORS.forEach(s => {
      const opt = Object.assign(document.createElement("option"), { value:s, textContent:SEP_LABELS[s]||s });
      if (!hasRandom && s==="-") opt.selected = true;
      el.appendChild(opt);
    });
  });
}

function syncSlider(inputId, displayId, suffix) {
  const input = $(inputId), display = $(displayId);
  if (!input || !display) return;
  const upd = () => { display.textContent = input.value + suffix; };
  upd(); input.addEventListener("input", upd);
}

function initTabs() {
  $$(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".tab-btn").forEach(b => { b.classList.remove("tab-btn--active"); b.setAttribute("aria-selected","false"); });
      $$(".tab-panel").forEach(p => p.classList.remove("tab-panel--active"));
      btn.classList.add("tab-btn--active"); btn.setAttribute("aria-selected","true");
      currentType = btn.dataset.type;
      $(`#panel-${currentType}`).classList.add("tab-panel--active");
      generate();
    });
  });
}

function initApiDocs() {
  const toggle = $("#api-toggle"), body = $("#api-body");
  if (!toggle || !body) return;
  toggle.addEventListener("click", () => {
    const open = body.classList.toggle("api-body--open");
    toggle.querySelector(".chevron").style.transform = open ? "rotate(180deg)" : "";
    toggle.setAttribute("aria-expanded", String(open));
  });
}

function initKeyboard() {
  document.addEventListener("keydown", e => {
    if (["INPUT","SELECT","TEXTAREA"].includes(e.target.tagName)) return;
    if (e.key===" "||e.key==="Enter") {
      e.preventDefault(); generate();
      const btn = $("#gen-btn");
      btn?.classList.add("gen-btn--pulse");
      setTimeout(()=>btn?.classList.remove("gen-btn--pulse"), 300);
    }
  });
}


  // ── Theme toggle
  function initTheme() {
    const btn   = $("#theme-toggle");
    const icon  = $("#toggle-icon");
    const label = $("#toggle-label");
    if (!btn) return;

    function syncButton() {
      const isLight = document.documentElement.classList.contains("light");
      if (icon)  icon.textContent  = isLight ? "☾" : "☀";
      if (label) label.textContent = isLight ? "Dark" : "Light";
    }

    // Sync button label to whatever theme-init.js already applied
    syncButton();

    btn.addEventListener("click", () => {
      const isCurrentlyLight = document.documentElement.classList.contains("light");
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(isCurrentlyLight ? "dark" : "light");
      localStorage.setItem("pwd-theme", isCurrentlyLight ? "dark" : "light");
      syncButton();
    });
  }

document.addEventListener("DOMContentLoaded", () => {
  populateSepDropdowns();
  initTheme();
  renderInsecureBanner();
  updateWordlistNote();
  initTabs();
  initApiDocs();
  initKeyboard();
  syncSlider("#word-count",   "#word-count-val",  " words");
  syncSlider("#char-len",     "#char-len-val",     " chars");
  syncSlider("#phrase-count", "#phrase-count-val", " words");
  $$("input[type=range],input[type=checkbox],select").forEach(el => {
    el.addEventListener("change", generate);
    if (el.type==="range") el.addEventListener("input", generate);
  });
  $("#gen-btn").addEventListener("click", generate);
  generate();
});
