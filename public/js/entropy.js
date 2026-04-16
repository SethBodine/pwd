// PWD – entropy.js
// Entropy calculation aligned with KeePass / NIST SP 800-63B approach
// Transformation bonuses: capitalization mode, l33t, separator selection, number injection

// ── Cryptographically secure random integer [0, max)
export function secureRandInt(max) {
  if (max <= 0) return 0;
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % max;
}

// ── L33t substitution map
export const LEET_MAP = {
  a: ['4', '@'], e: ['3'], i: ['1', '!'], o: ['0'], s: ['$', '5'],
  t: ['7'], g: ['9'], b: ['8'], l: ['1'], z: ['2'],
  A: ['4', '@'], E: ['3'], I: ['1', '!'], O: ['0'], S: ['$', '5'],
  T: ['7'], G: ['9'], B: ['8'], L: ['1'], Z: ['2'],
};

// Extra bits l33t adds for a given word (computed on actual word)
export function leetEntropyBonus(word) {
  let bonus = 0;
  for (const ch of word) {
    const opts = LEET_MAP[ch];
    if (opts) {
      bonus += 1;                      // binary: substitute or not
      if (opts.length > 1) bonus += 1; // which substitution
    }
  }
  return bonus;
}

// Capitalization mode entropy bonus per word
export function capModeBonus(mode) {
  switch (mode) {
    case 'random': return Math.log2(5);    // avg word length ~5 → log₂(5) ≈ 2.32
    case 'vowel':  return Math.log2(2.5);  // avg vowels ~2.5   → log₂(2.5) ≈ 1.32
    default:       return 0;               // first/last/all/none are deterministic
  }
}

// ── Character password entropy
export function charEntropy(length, charsetSize) {
  if (length <= 0 || charsetSize <= 0) return 0;
  return length * Math.log2(charsetSize);
}

// ── Word passphrase entropy (KeePass-aligned + transformation bonuses)
// Base: N × log₂(W)  — selecting N words from wordlist of size W
// Bonuses for separator pool, cap mode, number injection, l33t
export function wordPassphraseEntropy(wordCount, wordlistSize, opts = {}) {
  if (wordCount <= 0 || wordlistSize <= 0) return 0;

  let bits = wordCount * Math.log2(wordlistSize);

  // Separator pool bonus: (N-1) gaps, each chosen from sepPoolSize options
  if (opts.sepPoolSize > 1) {
    bits += (wordCount - 1) * Math.log2(opts.sepPoolSize);
  }

  // Cap mode bonus per word
  bits += wordCount * capModeBonus(opts.capMode || 'none');

  // Number injection bonus
  if (opts.injectNum) {
    bits += Math.log2(wordCount) + Math.log2(5) + Math.log2(9);
  }

  // L33t bonus (avg 2.5 bits/word if words unknown; precise if words passed in)
  if (opts.leet) {
    bits += wordCount * (opts.avgLeetBonus != null ? opts.avgLeetBonus : 2.5);
  }

  return bits;
}

// ── Sentence passphrase entropy
// poolSizes: array of word-pool sizes per grammatical slot
export function sentencePassphraseEntropy(poolSizes, opts = {}) {
  if (!poolSizes || poolSizes.length === 0) return 0;

  let bits = poolSizes.reduce((sum, size) => sum + Math.log2(Math.max(size, 1)), 0);

  if (opts.sepPoolSize > 1) {
    bits += (poolSizes.length - 1) * Math.log2(opts.sepPoolSize);
  }

  bits += poolSizes.length * capModeBonus(opts.capMode || 'none');

  if (opts.injectNum) {
    bits += Math.log2(poolSizes.length) + Math.log2(5) + Math.log2(9);
  }

  if (opts.leet) {
    bits += poolSizes.length * (opts.avgLeetBonus != null ? opts.avgLeetBonus : 2.5);
  }

  return bits;
}

// ── Strength label (calibrated for both passphrase and char modes)
export function strengthLabel(bits) {
  if (bits < 40)  return { label: "Weak",      level: 0 };
  if (bits < 55)  return { label: "Fair",      level: 1 };
  if (bits < 72)  return { label: "Good",      level: 2 };
  if (bits < 95)  return { label: "Strong",    level: 3 };
  return               { label: "Excellent",  level: 4 };
}

// ── Crack-time estimate at 100B guesses/sec (offline GPU worst case)
export function crackTime(bits) {
  const RATE    = 1e11;
  const seconds = Math.pow(2, bits) / 2 / RATE;

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

// ── SANS ISC anti-pattern detection (https://isc.sans.edu/diary/32866)
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_RANGE   = [1990, CURRENT_YEAR + 2];
const SEASONS = ["spring","summer","autumn","fall","winter"];
const MONTHS  = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec",
                 "january","february","march","april","june","july","august",
                 "september","october","november","december"];

export function detectPatterns(password) {
  const warnings = [];
  const lower = password.toLowerCase();

  for (let y = YEAR_RANGE[0]; y <= YEAR_RANGE[1]; y++) {
    if (lower.includes(String(y))) {
      warnings.push(`Contains year ${y} — top honeypot pattern (SANS ISC data)`);
    }
  }

  const yearAtEnd = /\d{4}[^a-z0-9]*$/i.test(password) &&
    (() => { const m = password.match(/(\d{4})[^a-z0-9]*$/i); return m && +m[1] >= 1990 && +m[1] <= CURRENT_YEAR + 2; })();
  if (yearAtEnd) {
    warnings.push("Year at end — #1 honeypot pattern (Spring2026!, Admin@2026)");
  }

  if (/012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210/.test(password)) {
    warnings.push("Sequential digit run (123, 456…) — extremely common in breached passwords");
  }

  if (/(.)\1{3,}/.test(password)) {
    warnings.push("Repeated character run — reduces effective entropy");
  }

  for (const s of SEASONS) {
    if (new RegExp(`${s}\\d{2,4}`, "i").test(lower)) {
      warnings.push(`Season + number (${s}+year) — common forced-rotation password`);
      break;
    }
  }

  for (const m of MONTHS) {
    if (new RegExp(`${m}\\d{2,4}`, "i").test(lower)) {
      warnings.push("Month + number pattern — predictable rotation password");
      break;
    }
  }

  if (/^[a-z\s]+$/.test(password)) warnings.push("All lowercase — missing uppercase, numbers, or symbols");
  if (/^[A-Z\s]+$/.test(password)) warnings.push("All uppercase — missing lowercase, numbers, or symbols");
  if (/^\d+$/.test(password))      warnings.push("All digits — extremely low entropy");

  return warnings;
}

// ── Charset size for char generator
export function charsetSize(opts) {
  let size = 0;
  if (opts.lower)   size += 26;
  if (opts.upper)   size += 26;
  if (opts.numbers) size += 10;
  if (opts.special) size += 32;
  return size;
}
