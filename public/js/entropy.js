// PWD – entropy.js  (v3)
//
// Crack-time baseline: SHA-256 @ 8B guesses/sec (RTX 4090 GPU cluster)
// This is the industry-standard "responsible middle ground" —
//   faster than bcrypt/Argon2 (which inflate times unfairly)
//   slower than MD5/NTLM (which are deprecated and insecure regardless)
//
// Insecure algorithms note displayed in UI:
//   MD5, SHA-1, NTLM — crackable in seconds regardless of password complexity.
//   The strength of a password is irrelevant if the hash algo is broken.

// SHA-256 GPU cluster — 8 billion/sec (conservative RTX 4090 benchmark)
export const BASELINE_RPS     = 8e9;
export const BASELINE_LABEL   = "SHA-256 (GPU cluster, 8B/s)";

// ── Cryptographically secure random integer [0, max)
export function secureRandInt(max) {
  if (max <= 0) return 0;
  const limit = Math.floor(0x100000000 / max) * max;
  const buf   = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % max;
}

// ── L33t substitution map
export const LEET_MAP = {
  a:['4','@'], e:['3'], i:['1','!'], o:['0'], s:['$','5'],
  t:['7'], g:['9'], b:['8'], l:['1'], z:['2'],
  A:['4','@'], E:['3'], I:['1','!'], O:['0'], S:['$','5'],
  T:['7'], G:['9'], B:['8'], L:['1'], Z:['2'],
};

export function leetEntropyBonus(word) {
  let bonus = 0;
  for (const ch of word) {
    const opts = LEET_MAP[ch];
    if (opts) { bonus += 1; if (opts.length > 1) bonus += 1; }
  }
  return bonus;
}

// ── Capitalisation mode entropy bonus per word
export function capModeBonus(mode) {
  if (mode === 'random') return Math.log2(5);
  if (mode === 'vowel')  return Math.log2(2.5);
  return 0;
}

// ── Model A: wordlist / generation entropy (conservative, cryptographically correct)
export function wordPassphraseEntropy(wordCount, wordlistSize, opts = {}) {
  if (wordCount <= 0 || wordlistSize <= 0) return 0;
  let bits = wordCount * Math.log2(wordlistSize);
  if (opts.sepPoolSize > 1)  bits += (wordCount - 1) * Math.log2(opts.sepPoolSize);
  bits += wordCount * capModeBonus(opts.capMode || 'none');
  if (opts.injectNum) bits += Math.log2(wordCount) + Math.log2(5) + Math.log2(9);
  if (opts.leet && opts.avgLeetBonus != null) bits += wordCount * opts.avgLeetBonus;
  return bits;
}

export function sentencePassphraseEntropy(poolSizes, opts = {}) {
  if (!poolSizes?.length) return 0;
  let bits = poolSizes.reduce((s, sz) => s + Math.log2(Math.max(sz, 1)), 0);
  if (opts.sepPoolSize > 1)  bits += (poolSizes.length - 1) * Math.log2(opts.sepPoolSize);
  bits += poolSizes.length * capModeBonus(opts.capMode || 'none');
  if (opts.injectNum) bits += Math.log2(poolSizes.length) + Math.log2(5) + Math.log2(9);
  if (opts.leet && opts.avgLeetBonus != null) bits += poolSizes.length * opts.avgLeetBonus;
  return bits;
}

// ── Model B: character brute-force entropy (what most online meters display)
export function bruteForceEntropy(password) {
  if (!password) return 0;
  let charset = 0;
  if (/[a-z]/.test(password)) charset += 26;
  if (/[A-Z]/.test(password)) charset += 26;
  if (/[0-9]/.test(password)) charset += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charset += 32;
  if (charset === 0) charset = 26;
  return password.length * Math.log2(charset);
}

// ── Character password entropy (from generator options)
export function charEntropy(length, charsetSz) {
  if (length <= 0 || charsetSz <= 0) return 0;
  return length * Math.log2(charsetSz);
}

// ── Strength label (based on wordlist entropy — conservative)
export function strengthLabel(bits) {
  if (bits < 40)  return { label: "Weak",      level: 0 };
  if (bits < 55)  return { label: "Fair",      level: 1 };
  if (bits < 72)  return { label: "Good",      level: 2 };
  if (bits < 95)  return { label: "Strong",    level: 3 };
  return               { label: "Excellent",  level: 4 };
}

// ── Crack time at SHA-256 baseline rate
export function crackTime(bits) {
  const seconds = Math.pow(2, bits) / 2 / BASELINE_RPS;
  if (seconds < 1)         return "< 1 second";
  if (seconds < 60)        return `${Math.round(seconds)} seconds`;
  if (seconds < 3600)      return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400)     return `${Math.round(seconds / 3600)} hours`;
  if (seconds < 2592000)   return `${Math.round(seconds / 86400)} days`;
  if (seconds < 31536000)  return `${Math.round(seconds / 2592000)} months`;
  const years = seconds / 31536000;
  if (years < 1e3)  return `${Math.round(years).toLocaleString()} years`;
  if (years < 1e6)  return `${(years / 1e3).toFixed(1)}k years`;
  if (years < 1e9)  return `${(years / 1e6).toFixed(1)}M years`;
  if (years < 1e12) return `${(years / 1e9).toFixed(1)}B years`;
  return "longer than the universe's age";
}

// ── Charset size helper
export function charsetSize(opts) {
  let size = 0;
  if (opts.lower)   size += 26;
  if (opts.upper)   size += 26;
  if (opts.numbers) size += 10;
  if (opts.special) size += 32;
  return size;
}

// ── SANS ISC anti-pattern detection
const CURRENT_YEAR = new Date().getFullYear();
const SEASONS = ["spring","summer","autumn","fall","winter"];
const MONTHS  = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec",
                 "january","february","march","april","june","july","august",
                 "september","october","november","december"];

export function detectPatterns(password) {
  const warnings = [];
  const lower = password.toLowerCase();
  for (let y = 1990; y <= CURRENT_YEAR + 2; y++) {
    if (lower.includes(String(y))) warnings.push(`Contains year ${y} — common in breached passwords`);
  }
  const m = password.match(/(\d{4})[^a-z0-9]*$/i);
  if (m && +m[1] >= 1990 && +m[1] <= CURRENT_YEAR + 2)
    warnings.push("Year at end — #1 honeypot pattern (Spring2026!, Admin@2026)");
  if (/012|123|234|345|456|567|678|789|890/.test(password))
    warnings.push("Sequential digit run (123…) — extremely common in breached passwords");
  if (/(.)\1{3,}/.test(password))
    warnings.push("Repeated character run — reduces effective entropy");
  for (const s of SEASONS) {
    if (new RegExp(`${s}\\d{2,4}`, "i").test(lower)) {
      warnings.push(`Season + number (${s}+year) — common forced-rotation password`); break;
    }
  }
  for (const mo of MONTHS) {
    if (new RegExp(`${mo}\\d{2,4}`, "i").test(lower)) {
      warnings.push("Month + number — predictable rotation password"); break;
    }
  }
  return warnings;
}
