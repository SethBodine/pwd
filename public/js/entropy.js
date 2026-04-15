// PassGen – entropy.js
// Entropy calculation + anti-pattern detection informed by SANS ISC research

// ── Cryptographically secure random integer [0, max)
export function secureRandInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % max;
}

// ── Entropy calculators
export function charEntropy(length, charsetSize) {
  if (length <= 0 || charsetSize <= 0) return 0;
  return length * Math.log2(charsetSize);
}

export function wordEntropy(wordCount, wordlistSize) {
  if (wordCount <= 0 || wordlistSize <= 0) return 0;
  return wordCount * Math.log2(wordlistSize);
}

export function sentenceEntropy(positions) {
  // positions = array of pool sizes per grammatical slot
  return positions.reduce((sum, size) => sum + Math.log2(size), 0);
}

// ── Strength label from bits
export function strengthLabel(bits) {
  if (bits < 40)  return { label: "Weak",      level: 0 };
  if (bits < 60)  return { label: "Fair",      level: 1 };
  if (bits < 80)  return { label: "Good",      level: 2 };
  if (bits < 100) return { label: "Strong",    level: 3 };
  return               { label: "Excellent",  level: 4 };
}

// ── Crack-time estimate at 100 billion guesses/second (offline, GPU cluster)
export function crackTime(bits) {
  const RATE = 1e11; // guesses/sec
  const avgGuesses = Math.pow(2, bits) / 2;
  const seconds = avgGuesses / RATE;

  if (seconds < 1)        return "< 1 second";
  if (seconds < 60)       return `${Math.round(seconds)} seconds`;
  if (seconds < 3600)     return `${Math.round(seconds/60)} minutes`;
  if (seconds < 86400)    return `${Math.round(seconds/3600)} hours`;
  if (seconds < 2592000)  return `${Math.round(seconds/86400)} days`;
  if (seconds < 31536000) return `${Math.round(seconds/2592000)} months`;
  const years = seconds / 31536000;
  if (years < 1e3)   return `${Math.round(years).toLocaleString()} years`;
  if (years < 1e6)   return `${Math.round(years/1e3).toLocaleString()}k years`;
  if (years < 1e9)   return `${Math.round(years/1e6).toLocaleString()}M years`;
  if (years < 1e12)  return `${Math.round(years/1e9).toLocaleString()}B years`;
  return "heat death of the universe";
}

// ── SANS ISC Anti-pattern detection
// Based on: https://isc.sans.edu/diary/32866
// Key findings: years at end, sequential numbers, season+year, month+year patterns

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_RANGE   = [1990, CURRENT_YEAR + 2];
const SEASONS      = ["spring","summer","autumn","fall","winter"];
const MONTHS       = ["jan","feb","mar","apr","may","jun",
                      "jul","aug","sep","oct","nov","dec",
                      "january","february","march","april","june","july",
                      "august","september","october","november","december"];

export function detectPatterns(password) {
  const warnings = [];
  const lower = password.toLowerCase();

  // 1. Year pattern anywhere (strong signal of weak password per honeypot data)
  for (let y = YEAR_RANGE[0]; y <= YEAR_RANGE[1]; y++) {
    if (lower.includes(String(y))) {
      warnings.push(`Contains year ${y} — found in top honeypot passwords`);
    }
  }

  // 2. Year at end specifically (most dangerous pattern: Word2026, Admin@2026)
  const yearAtEnd = /\d{4}[^a-z0-9]*$/i.test(password) &&
    (() => { const m = password.match(/(\d{4})[^a-z0-9]*$/i); return m && +m[1] >= 1990 && +m[1] <= CURRENT_YEAR + 2; })();
  if (yearAtEnd) {
    warnings.push("Year at end — #1 honeypot pattern (Spring2026!, Admin@2026)");
  }

  // 3. Sequential digit runs (123, 1234, 12345 — top honeypot numbers)
  if (/012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210/.test(password)) {
    warnings.push("Sequential digit run detected (123, 456…) — extremely common in breached passwords");
  }

  // 4. Repeated digits (1111, 0000, etc.)
  if (/(.)\1{3,}/.test(password)) {
    warnings.push("Repeated character run — significantly reduces entropy");
  }

  // 5. Season + year combos (Spring2026, Summer25 — frequently seen in honeypots)
  for (const s of SEASONS) {
    if (new RegExp(`${s}\\d{2,4}`, "i").test(lower)) {
      warnings.push(`Season + number pattern (${s}+year) — common forced-rotation password`);
      break;
    }
  }

  // 6. Month + year combos (April2026, Jan2026)
  for (const m of MONTHS) {
    if (new RegExp(`${m}\\d{2,4}`, "i").test(lower)) {
      warnings.push(`Month + number pattern — predictable rotation password`);
      break;
    }
  }

  // 7. All lowercase or all uppercase (misses charset breadth)
  if (/^[a-z]+$/.test(password)) warnings.push("All lowercase — missing uppercase, numbers, or symbols");
  if (/^[A-Z]+$/.test(password)) warnings.push("All uppercase — missing lowercase, numbers, or symbols");
  if (/^\d+$/.test(password)) warnings.push("All digits — extremely low entropy");

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
