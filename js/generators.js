// PassGen – generators.js
// Three password generators: word-based, character-based, sentence-passphrase
// All use crypto.getRandomValues() — no Math.random()

import { WORD_LIST, ARTICLES, ADJECTIVES, NOUNS, VERBS, ADVERBS, SEPARATORS } from "./wordlists.js";
import {
  secureRandInt, charEntropy, wordEntropy, sentenceEntropy,
  strengthLabel, crackTime, detectPatterns, charsetSize
} from "./entropy.js";

// ── Charset pools
const LOWER   = "abcdefghijklmnopqrstuvwxyz";
const UPPER   = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS  = "0123456789";
const SPECIAL = "!@#$%^&*()-_=+[]{}|;:,.<>?";

// ── Fisher-Yates shuffle (crypto-secure)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = secureRandInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Pick N random items from an array without repetition
function pickN(arr, n) {
  return shuffle(arr).slice(0, n);
}

// ── Pick one random item
function pick(arr) {
  return arr[secureRandInt(arr.length)];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. WORD-BASED GENERATOR (Diceware / EFF style)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export function generateWordPassword(opts = {}) {
  const {
    wordCount  = 4,
    separator  = "-",
    capitalize = false,
    injectNum  = false,   // Inject a number MID-word (never appended)
  } = opts;

  const words = [];
  for (let i = 0; i < wordCount; i++) {
    let w = pick(WORD_LIST);
    if (capitalize) w = w[0].toUpperCase() + w.slice(1);
    words.push(w);
  }

  // SANS-informed: if injecting a number, insert it inside a random word
  // NOT at the end of the full password
  if (injectNum) {
    const targetWord = secureRandInt(wordCount);
    const digit = String(secureRandInt(9) + 1); // avoid leading 0
    const pos   = secureRandInt(words[targetWord].length - 1) + 1; // mid-word
    const w = words[targetWord];
    words[targetWord] = w.slice(0, pos) + digit + w.slice(pos);
  }

  const value = words.join(separator);
  const bits  = wordEntropy(wordCount, WORD_LIST.length);

  return {
    value,
    bits:     Math.round(bits * 10) / 10,
    strength: strengthLabel(bits),
    time:     crackTime(bits),
    warnings: detectPatterns(value),
    type:     "word"
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

  // Build charset
  let charset = "";
  if (lower)   charset += LOWER;
  if (upper)   charset += UPPER;
  if (numbers) charset += DIGITS;
  if (special) charset += SPECIAL;
  if (!charset) charset = LOWER; // fallback

  const size = charsetSize({ lower, upper, numbers, special });

  // Guarantee at least one char from each enabled group
  const required = [];
  if (lower)   required.push(pick([...LOWER]));
  if (upper)   required.push(pick([...UPPER]));
  if (numbers) required.push(pick([...DIGITS]));
  if (special) required.push(pick([...SPECIAL]));

  // Fill remaining positions from full charset
  const remaining = [];
  for (let i = required.length; i < length; i++) {
    remaining.push(charset[secureRandInt(charset.length)]);
  }

  // SANS-informed: shuffle so required chars aren't always at front or end
  const combined = shuffle([...required, ...remaining]);

  // SANS-informed: if numbers present, ensure no digit run of 3+ sequential
  // and no year pattern — regenerate digits if needed (max 5 attempts)
  let value = combined.join("");
  let attempts = 0;
  while (numbers && attempts < 5) {
    const hasSeq  = /012|123|234|345|456|567|678|789/.test(value);
    const hasYear = /19[0-9]{2}|20[0-3][0-9]/.test(value);
    if (!hasSeq && !hasYear) break;
    // Reshuffle only the digit positions
    const chars = value.split("");
    const digitIdxs = chars.map((c,i) => DIGITS.includes(c) ? i : -1).filter(i => i >= 0);
    const newDigits  = shuffle(digitIdxs.map(() => pick([...DIGITS])));
    digitIdxs.forEach((idx, i) => { chars[idx] = newDigits[i]; });
    value = chars.join("");
    attempts++;
  }

  const bits = charEntropy(length, size || 26);
  return {
    value,
    bits:     Math.round(bits * 10) / 10,
    strength: strengthLabel(bits),
    time:     crackTime(bits),
    warnings: detectPatterns(value),
    type:     "char"
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. SENTENCE PASSPHRASE GENERATOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Builds: [article] [adj] [noun] [verb] [adverb] (+ extras)
// Separator varies each generation for diversity

const POOL_SEQUENCE = [ARTICLES, ADJECTIVES, NOUNS, VERBS, ADVERBS,
                       ADJECTIVES, NOUNS, ADVERBS]; // repeatable for 6-8 words

export function generatePhrasePassword(opts = {}) {
  const {
    wordCount  = 5,
    separator  = null,  // null = pick randomly each time
    capitalize = true,
    injectNum  = false,
  } = opts;

  const sep = separator ?? pick(SEPARATORS);
  const clampedCount = Math.max(3, Math.min(8, wordCount));

  const words = [];
  for (let i = 0; i < clampedCount; i++) {
    const pool = POOL_SEQUENCE[i % POOL_SEQUENCE.length];
    let w = pick(pool);
    if (capitalize) w = w[0].toUpperCase() + w.slice(1);
    words.push(w);
  }

  // SANS-informed number injection: mid-sentence, not at end
  if (injectNum) {
    const targetWord = secureRandInt(clampedCount - 1); // never last word
    const digit = String(secureRandInt(9) + 1);
    const pos   = secureRandInt(words[targetWord].length - 1) + 1;
    const w = words[targetWord];
    words[targetWord] = w.slice(0, pos) + digit + w.slice(pos);
  }

  const value = words.join(sep);

  // Entropy: sum of log2(pool_size) per position + separator selection
  const poolSizes = Array.from({ length: clampedCount }, (_, i) => POOL_SEQUENCE[i % POOL_SEQUENCE.length].length);
  const separatorBits = separator ? 0 : Math.log2(SEPARATORS.length);
  const bits = sentenceEntropy(poolSizes) + separatorBits;

  return {
    value,
    bits:      Math.round(bits * 10) / 10,
    strength:  strengthLabel(bits),
    time:      crackTime(bits),
    warnings:  detectPatterns(value),
    type:      "phrase",
    separator: sep
  };
}

// ── Generate multiple passwords at once
export function generateBatch(type, opts, count = 3) {
  const fn = type === "word"  ? generateWordPassword
           : type === "char"  ? generateCharPassword
           :                    generatePhrasePassword;
  return Array.from({ length: count }, () => fn(opts));
}
