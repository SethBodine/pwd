// PWD – generators.js  (v3)

import {
  WORD_LIST, ARTICLES, ADJECTIVES, NOUNS, VERBS, ADVERBS, SEPARATORS
} from "./wordlists.js";
import {
  secureRandInt, LEET_MAP, leetEntropyBonus, capModeBonus,
  charEntropy, wordPassphraseEntropy, sentencePassphraseEntropy,
  bruteForceEntropy, strengthLabel, crackTime, detectPatterns, charsetSize
} from "./entropy.js";

const LOWER   = "abcdefghijklmnopqrstuvwxyz";
const UPPER   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS  = "0123456789";
const SPECIAL = "!@#$%^&*()-_=+[]{}|;:,.<>?";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureRandInt(i + 1); [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(arr) { return arr[secureRandInt(arr.length)]; }

function applyCap(word, mode) {
  if (!word) return word;
  const c = word.split("");
  if (mode === 'first')  { c[0] = c[0].toUpperCase(); }
  else if (mode === 'last')   { c[c.length-1] = c[c.length-1].toUpperCase(); }
  else if (mode === 'random') { const p = secureRandInt(c.length); c[p] = c[p].toUpperCase(); }
  else if (mode === 'vowel')  {
    const vi = c.map((x,i) => "aeiouAEIOU".includes(x)?i:-1).filter(i=>i>=0);
    const p  = vi.length ? pick(vi) : secureRandInt(c.length);
    c[p] = c[p].toUpperCase();
  } else if (mode === 'all') { return word.toUpperCase(); }
  return c.join("");
}

function applyLeet(word) {
  return word.split("").map(ch => {
    const opts = LEET_MAP[ch];
    if (!opts || secureRandInt(2) === 0) return ch;
    return pick(opts);
  }).join("");
}

// ── Build a result with both entropy models
function makeResult(value, wordlistBits, type, extra = {}) {
  const bfBits = bruteForceEntropy(value);
  return {
    value,
    bits:     Math.round(wordlistBits * 10) / 10,   // Model A — generation entropy
    bfBits:   Math.round(bfBits * 10) / 10,          // Model B — brute-force entropy
    strength: strengthLabel(wordlistBits),
    time:     crackTime(wordlistBits),   // wordlist model crack time
    bfTime:   crackTime(bfBits),         // brute-force model crack time
    warnings: detectPatterns(value),
    type,
    ...extra,
  };
}

// ── 1. Word-based
export function generateWordPassword(opts = {}) {
  const { wordCount=4, separator="-", capMode="first", injectNum=false, leet=false } = opts;
  const isRandom = separator === "__random__";
  const sep = isRandom ? pick(SEPARATORS) : separator;

  const words = Array.from({ length: wordCount }, () => {
    let w = pick(WORD_LIST);
    if (leet) w = applyLeet(w);
    return applyCap(w, leet ? 'none' : capMode);
  });

  if (injectNum) {
    const t = secureRandInt(wordCount), d = String(secureRandInt(9)+1);
    const w = words[t], p = secureRandInt(w.length-1)+1;
    words[t] = w.slice(0,p)+d+w.slice(p);
  }

  const value = words.join(sep);
  const avgLeetBonus = leet ? words.reduce((s,w)=>s+leetEntropyBonus(w),0)/wordCount : 0;
  const bits = wordPassphraseEntropy(wordCount, WORD_LIST.length, {
    sepPoolSize: isRandom ? SEPARATORS.length : 1,
    capMode: leet ? 'none' : capMode,
    injectNum, leet, avgLeetBonus,
  });
  return makeResult(value, bits, "word");
}

// ── 2. Character-based
export function generateCharPassword(opts = {}) {
  const { length=16, lower=true, upper=true, numbers=true, special=true } = opts;
  let charset = "";
  if (lower)   charset += LOWER;
  if (upper)   charset += UPPER;
  if (numbers) charset += DIGITS;
  if (special) charset += SPECIAL;
  if (!charset) charset = LOWER;
  const size = charsetSize({ lower, upper, numbers, special }) || 26;

  const req = [];
  if (lower)   req.push(pick([...LOWER]));
  if (upper)   req.push(pick([...UPPER]));
  if (numbers) req.push(pick([...DIGITS]));
  if (special) req.push(pick([...SPECIAL]));
  const rem = Array.from({ length: Math.max(0, length-req.length) },
    () => charset[secureRandInt(charset.length)]);

  let value = shuffle([...req,...rem]).join("");
  for (let a = 0; a < 5 && numbers; a++) {
    if (!/012|123|234|345|456|567|678|789|19[0-9]{2}|20[0-3][0-9]/.test(value)) break;
    const cs = value.split(""), di = cs.map((c,i)=>DIGITS.includes(c)?i:-1).filter(i=>i>=0);
    const nd = shuffle(di.map(()=>pick([...DIGITS])));
    di.forEach((idx,i)=>{cs[idx]=nd[i];}); value = cs.join("");
  }

  const bits = charEntropy(length, size);
  return makeResult(value, bits, "char");
}

// ── 3. Sentence passphrase
const SENTENCE_POOLS = [
  { pool: ARTICLES,   ext: false },
  { pool: ADJECTIVES, ext: true },
  { pool: NOUNS,      ext: true },
  { pool: VERBS,      ext: false },
  { pool: ADVERBS,    ext: false },
  { pool: ADJECTIVES, ext: true },
  { pool: NOUNS,      ext: true },
  { pool: ADVERBS,    ext: false },
];

export function generatePhrasePassword(opts = {}) {
  const { wordCount=5, separator=null, capMode="first", injectNum=false, leet=false } = opts;
  const isRandom = separator === null || separator === "__random__";
  const sep = isRandom ? pick(SEPARATORS) : separator;
  const count = Math.max(3, Math.min(8, wordCount));
  const defs  = SENTENCE_POOLS.slice(0, count);

  const words = defs.map(({ pool, ext }) => {
    const combined = ext ? [...pool,...WORD_LIST] : pool;
    let w = pick(combined);
    if (leet) w = applyLeet(w);
    return applyCap(w, leet ? 'none' : capMode);
  });

  if (injectNum) {
    const t = secureRandInt(count-1), d = String(secureRandInt(9)+1);
    const w = words[t], p = secureRandInt(w.length-1)+1;
    words[t] = w.slice(0,p)+d+w.slice(p);
  }

  const value = words.join(sep);
  const poolSizes = defs.map(({ pool, ext }) => ext ? pool.length+WORD_LIST.length : pool.length);
  const avgLeetBonus = leet ? words.reduce((s,w)=>s+leetEntropyBonus(w),0)/count : 0;
  const bits = sentencePassphraseEntropy(poolSizes, {
    sepPoolSize: isRandom ? SEPARATORS.length : 1,
    capMode: leet ? 'none' : capMode,
    injectNum, leet, avgLeetBonus,
  });
  return makeResult(value, bits, "phrase", { separator: sep, poolSizes });
}

export function generateBatch(type, opts, count = 3) {
  const fn = type==="word" ? generateWordPassword
           : type==="char" ? generateCharPassword
           :                 generatePhrasePassword;
  return Array.from({ length: count }, () => fn(opts));
}

// Re-export wordlist size so ui.js can read it without importing the raw list
export const WORD_LIST_SIZE = WORD_LIST.length;
