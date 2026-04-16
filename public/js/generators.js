// PWD – generators.js
// Three password generators: word-based, character-based, sentence-passphrase
// All use crypto.getRandomValues() — no Math.random()

import {
  WORD_LIST, ARTICLES, ADJECTIVES, NOUNS, VERBS, ADVERBS,
  POOL_SEQUENCE, SEPARATORS
} from "./wordlists.js";

import {
  secureRandInt, LEET_MAP, leetEntropyBonus,
  charEntropy, wordPassphraseEntropy, sentencePassphraseEntropy,
  strengthLabel, crackTime, detectPatterns, charsetSize
} from "./entropy.js";

// ── Charset pools
const LOWER   = "abcdefghijklmnopqrstuvwxyz";
const UPPER   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS  = "0123456789";
const SPECIAL = "!@#$%^&*()-_=+[]{}|;:,.<>?";

// ── Crypto-secure Fisher-Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureRandInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr) { return arr[secureRandInt(arr.length)]; }

// ── Apply capitalization based on mode
// 'first'  → capitalize first letter
// 'last'   → capitalize last letter
// 'random' → capitalize one random position
// 'vowel'  → capitalize one random vowel
// 'all'    → full uppercase
// 'none'   → leave as-is
function applyCap(word, mode) {
  if (!word || word.length === 0) return word;
  const chars = word.split("");

  switch (mode) {
    case 'first':
      chars[0] = chars[0].toUpperCase();
      break;

    case 'last':
      chars[chars.length - 1] = chars[chars.length - 1].toUpperCase();
      break;

    case 'random': {
      const pos = secureRandInt(chars.length);
      chars[pos] = chars[pos].toUpperCase();
      break;
    }

    case 'vowel': {
      const vowels = "aeiouAEIOU";
      const vowelPositions = chars.map((c, i) => vowels.includes(c) ? i : -1).filter(i => i >= 0);
      if (vowelPositions.length > 0) {
        const pos = pick(vowelPositions);
        chars[pos] = chars[pos].toUpperCase();
      } else {
        // No vowels — fall back to random
        const pos = secureRandInt(chars.length);
        chars[pos] = chars[pos].toUpperCase();
      }
      break;
    }

    case 'all':
      return word.toUpperCase();

    case 'none':
    default:
      break;
  }

  return chars.join("");
}

// ── Apply l33t substitutions (each l33table char: binary choice, random option)
function applyLeet(word) {
  return word.split("").map(ch => {
    const opts = LEET_MAP[ch];
    if (!opts) return ch;
    // 50% chance to substitute
    if (secureRandInt(2) === 0) return ch;
    return pick(opts);
  }).join("");
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. WORD-BASED GENERATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function generateWordPassword(opts = {}) {
  const {
    wordCount  = 4,
    separator  = "-",
    capMode    = "first",   // first | last | random | vowel | all | none
    injectNum  = false,
    leet       = false,
  } = opts;

  const words = [];
  for (let i = 0; i < wordCount; i++) {
    let w = pick(WORD_LIST);
    if (leet) w = applyLeet(w);
    w = applyCap(w, leet ? 'none' : capMode); // leet already mixes case
    words.push(w);
  }

  // SANS-informed: inject number mid-word, not at end
  if (injectNum) {
    const targetIdx = secureRandInt(wordCount);
    const digit = String(secureRandInt(9) + 1);
    const w     = words[targetIdx];
    const pos   = secureRandInt(w.length - 1) + 1;
    words[targetIdx] = w.slice(0, pos) + digit + w.slice(pos);
  }

  const value = words.join(separator);

  // Precise l33t bonus: average across actual generated words
  const avgLeetBonus = leet
    ? words.reduce((sum, w) => sum + leetEntropyBonus(w), 0) / words.length
    : 0;

  const bits = wordPassphraseEntropy(wordCount, WORD_LIST.length, {
    sepPoolSize:    separator === "__random__" ? SEPARATORS.length : 1,
    capMode:        leet ? 'none' : capMode,
    injectNum,
    leet,
    avgLeetBonus,
  });

  return {
    value,
    bits:     Math.round(bits * 10) / 10,
    strength: strengthLabel(bits),
    time:     crackTime(bits),
    warnings: detectPatterns(value),
    type:     "word",
    entropy:  buildBreakdown(wordCount, WORD_LIST.length, bits, separator, capMode, injectNum, leet, avgLeetBonus, "word"),
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. CHARACTER-BASED GENERATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function generateCharPassword(opts = {}) {
  const {
    length  = 16,
    lower   = true,
    upper   = true,
    numbers = true,
    special = true,
  } = opts;

  let charset = "";
  if (lower)   charset += LOWER;
  if (upper)   charset += UPPER;
  if (numbers) charset += DIGITS;
  if (special) charset += SPECIAL;
  if (!charset) charset = LOWER;

  const size = charsetSize({ lower, upper, numbers, special }) || 26;

  // Guarantee at least one char from each enabled group
  const required = [];
  if (lower)   required.push(pick([...LOWER]));
  if (upper)   required.push(pick([...UPPER]));
  if (numbers) required.push(pick([...DIGITS]));
  if (special) required.push(pick([...SPECIAL]));

  const remaining = Array.from(
    { length: Math.max(0, length - required.length) },
    () => charset[secureRandInt(charset.length)]
  );

  let value = shuffle([...required, ...remaining]).join("");

  // SANS-informed: reject sequential digit runs and year patterns — reshuffle digits
  for (let attempt = 0; attempt < 5 && numbers; attempt++) {
    if (!/012|123|234|345|456|567|678|789|19[0-9]{2}|20[0-3][0-9]/.test(value)) break;
    const chars    = value.split("");
    const digitIdx = chars.map((c, i) => DIGITS.includes(c) ? i : -1).filter(i => i >= 0);
    const newDigits = shuffle(digitIdx.map(() => pick([...DIGITS])));
    digitIdx.forEach((idx, i) => { chars[idx] = newDigits[i]; });
    value = chars.join("");
  }

  const bits = charEntropy(length, size);
  return {
    value,
    bits:     Math.round(bits * 10) / 10,
    strength: strengthLabel(bits),
    time:     crackTime(bits),
    warnings: detectPatterns(value),
    type:     "char",
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. SENTENCE PASSPHRASE GENERATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Noun and Adjective slots draw from WORD_LIST (large) for higher entropy.
// Article, Verb, Adverb slots use specialised grammar pools.
// Effective pool per slot is reported for entropy calculation.
const SENTENCE_POOLS = [
  { pool: ARTICLES,   useWordList: false },
  { pool: ADJECTIVES, useWordList: true  }, // + WORD_LIST
  { pool: NOUNS,      useWordList: true  }, // + WORD_LIST
  { pool: VERBS,      useWordList: false },
  { pool: ADVERBS,    useWordList: false },
  { pool: ADJECTIVES, useWordList: true  },
  { pool: NOUNS,      useWordList: true  },
  { pool: ADVERBS,    useWordList: false },
];

export function generatePhrasePassword(opts = {}) {
  const {
    wordCount  = 5,
    separator  = null,     // null = random each time
    capMode    = "first",
    injectNum  = false,
    leet       = false,
  } = opts;

  const sep        = separator ?? pick(SEPARATORS);
  const count      = Math.max(3, Math.min(8, wordCount));
  const poolDefs   = SENTENCE_POOLS.slice(0, count);

  // Build combined pool for noun/adj slots (grammar pool ∪ WORD_LIST)
  const words = poolDefs.map(({ pool, useWordList }) => {
    const combined = useWordList ? [...pool, ...WORD_LIST] : pool;
    let w = pick(combined);
    if (leet) w = applyLeet(w);
    w = applyCap(w, leet ? 'none' : capMode);
    return w;
  });

  // Number injection mid-sentence, not at end (SANS-informed)
  if (injectNum) {
    const targetIdx = secureRandInt(count - 1); // never last word
    const digit = String(secureRandInt(9) + 1);
    const w     = words[targetIdx];
    const pos   = secureRandInt(w.length - 1) + 1;
    words[targetIdx] = w.slice(0, pos) + digit + w.slice(pos);
  }

  const value = words.join(sep);

  // Effective pool sizes per slot
  const poolSizes = poolDefs.map(({ pool, useWordList }) =>
    useWordList ? pool.length + WORD_LIST.length : pool.length
  );

  const avgLeetBonus = leet
    ? words.reduce((sum, w) => sum + leetEntropyBonus(w), 0) / words.length
    : 0;

  const bits = sentencePassphraseEntropy(poolSizes, {
    sepPoolSize:  separator === null ? SEPARATORS.length : 1,
    capMode:      leet ? 'none' : capMode,
    injectNum,
    leet,
    avgLeetBonus,
  });

  return {
    value,
    bits:      Math.round(bits * 10) / 10,
    strength:  strengthLabel(bits),
    time:      crackTime(bits),
    warnings:  detectPatterns(value),
    type:      "phrase",
    separator: sep,
    poolSizes,
  };
}

// ── Entropy breakdown tooltip data
function buildBreakdown(wordCount, wordlistSize, totalBits, sep, capMode, injectNum, leet, avgLeetBonus, type) {
  const base  = wordCount * Math.log2(wordlistSize);
  const sepB  = sep === "__random__" ? (wordCount - 1) * Math.log2(SEPARATORS.length) : 0;
  const capB  = wordCount * (capMode === 'random' ? Math.log2(5) : capMode === 'vowel' ? Math.log2(2.5) : 0);
  const numB  = injectNum ? Math.log2(wordCount) + Math.log2(5) + Math.log2(9) : 0;
  const leetB = leet ? wordCount * avgLeetBonus : 0;
  return { base, sepB, capB, numB, leetB };
}

// ── Generate a batch
export function generateBatch(type, opts, count = 3) {
  const fn = type === "word"  ? generateWordPassword
           : type === "char"  ? generateCharPassword
           :                    generatePhrasePassword;
  return Array.from({ length: count }, () => fn(opts));
}
