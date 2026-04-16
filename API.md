# PWD API — Reference for Browser Extension Development

Base URL: `https://YOUR_DOMAIN` (replace with your Cloudflare Pages domain, e.g. `pwd.pages.dev`)

All generation runs at the **edge** (Cloudflare Pages Functions). No passwords, no user data, and no analytics are stored anywhere. CORS is fully open — any origin can call the API.

---

## Endpoint

```
POST /api/generate
Content-Type: application/json
```

---

## Request body

All fields are optional. Defaults are shown.

```jsonc
{
  // ── Required
  "type":    "word",     // "word" | "char" | "phrase"
  "count":   1,          // 1–10 — how many passwords to return

  // ── Word-based (type: "word")
  "wordCount":  5,       // 2–10
  "separator":  "-",     // see Separators table below | "__random__" picks randomly each time
  "capMode":    "first", // see Cap modes table below
  "injectNum":  false,   // true = insert a digit mid-word (never at end)
  "leet":       false,   // true = apply l33t substitutions (a→4/@, e→3, i→1/!, etc.)

  // ── Character-based (type: "char")
  "length":   16,        // 8–64
  "lower":    true,      // include a–z (26 chars)
  "upper":    true,      // include A–Z (26 chars)
  "numbers":  true,      // include 0–9 (10 chars)
  "special":  true,      // include !@#$… (32 chars)

  // ── Sentence passphrase (type: "phrase")
  // Uses same: wordCount, separator ("__random__" default), capMode, injectNum, leet
  "wordCount":  5,       // 3–8
  "separator":  null     // null | "__random__" = random separator each generation
}
```

### Separators

| Value | Character |
|---|---|
| `"-"` | Hyphen |
| `"."` | Dot |
| `" "` | Space |
| `"_"` | Underscore |
| `"~"` | Tilde |
| `"!"` | Bang |
| `"@"` | At |
| `"#"` | Hash |
| `"$"` | Dollar |
| `"%"` | Percent |
| `"^"` | Caret |
| `"&"` | Ampersand |
| `"*"` | Star |
| `"="` | Equals |
| `"+"` | Plus |
| `"\|"` | Pipe |
| `"__random__"` | Pick a random separator each time (adds entropy) |

### Cap modes

| Value | Effect | Entropy bonus |
|---|---|---|
| `"first"` | Capitalize first letter (e.g. Cobalt) | 0 bits |
| `"last"` | Capitalize last letter (e.g. cobalT) | 0 bits |
| `"random"` | Capitalize one random position | +log₂(5) ≈ +2.3 bits/word |
| `"vowel"` | Capitalize one random vowel | +log₂(2.5) ≈ +1.3 bits/word |
| `"all"` | ALL CAPS | 0 bits |
| `"none"` | No capitalisation | 0 bits |

### L33t substitution map

When `"leet": true`, each substitutable character has a 50% chance of being replaced:

| Char | Substitutions |
|---|---|
| a / A | `4` or `@` |
| e / E | `3` |
| i / I | `1` or `!` |
| o / O | `0` |
| s / S | `$` or `5` |
| t / T | `7` |
| g / G | `9` |
| b / B | `8` |
| l / L | `1` |
| z / Z | `2` |

---

## Response

```jsonc
{
  "passwords": [
    {
      "value":    "Cobalt-Forest-Leaps-Swiftly-Alone",
      "bits":     51.4,          // generation entropy (conservative — wordlist attack model)
      "bfBits":   185.2,         // brute-force entropy (character space — what most meters show)
      "strength": {
        "label":  "Good",        // "Weak" | "Fair" | "Good" | "Strong" | "Excellent"
        "level":  2              // 0–4 (maps to label)
      },
      "time":     "2.1k years",  // crack time @ SHA-256 baseline (8B/s GPU), generation model
      "bfTime":   "longer than the universe's age", // crack time, brute-force model
      "warnings": [],            // SANS ISC anti-pattern warnings (array of strings)
      "type":     "word"         // echoes the requested type
    }
  ],
  "meta": {
    "type":        "word",
    "count":       1,
    "generatedAt": "2026-04-17T10:30:00.000Z",
    "rateNote":    "SHA-256 @ 8B/sec GPU baseline"
  }
}
```

### Strength levels

| level | label | bits (generation model) |
|---|---|---|
| 0 | Weak | < 40 |
| 1 | Fair | 40–54 |
| 2 | Good | 55–71 |
| 3 | Strong | 72–94 |
| 4 | Excellent | 95+ |

### Two entropy models explained

The response always contains **both** entropy models:

**`bits` / `time`** — Generation model (conservative)  
Assumes the attacker knows you used PWD and knows the wordlist. This is the cryptographically correct lower bound. Use this as your benchmark.

**`bfBits` / `bfTime`** — Brute-force model  
Attacker tries all character combinations without wordlist knowledge. This is what passwordmonster.com and Bitwarden's strength meter display. Reality sits between the two models.

**Crack time baseline:** SHA-256 at 8 billion guesses/second (RTX 4090 GPU cluster). This is the responsible middle ground — slower than broken algorithms (MD5/NTLM which are crackable regardless of password strength), faster than modern KDFs (bcrypt/Argon2 which inflate estimates).

**Insecure algorithms note:** MD5, SHA-1, NTLM, LM, DES, RC4 are broken. Any password — regardless of complexity or entropy — stored with these algorithms should be considered compromised. Crack time estimates are meaningless for these.

---

## Examples

### Word-based, 6 words, random separator, l33t

```bash
curl -X POST https://YOUR_DOMAIN/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "word",
    "count": 3,
    "wordCount": 6,
    "separator": "__random__",
    "capMode": "random",
    "leet": true,
    "injectNum": false
  }'
```

### Character-based, 24 chars, full complexity

```bash
curl -X POST https://YOUR_DOMAIN/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "char",
    "count": 1,
    "length": 24,
    "lower": true,
    "upper": true,
    "numbers": true,
    "special": true
  }'
```

### Sentence passphrase, 5 words, space separator, capitalised

```bash
curl -X POST https://YOUR_DOMAIN/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "phrase",
    "count": 3,
    "wordCount": 5,
    "separator": " ",
    "capMode": "first",
    "leet": false
  }'
```

### JavaScript (browser extension context)

```javascript
async function generatePassword(options = {}) {
  const res = await fetch("https://YOUR_DOMAIN/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type:      "word",
      count:     1,
      wordCount: 5,
      separator: "-",
      capMode:   "first",
      ...options,
    }),
  });
  const data = await res.json();
  return data.passwords[0]; // { value, bits, bfBits, strength, time, bfTime, warnings, type }
}

// Usage
const pw = await generatePassword({ type: "char", length: 20 });
console.log(pw.value);    // e.g. "mK#9vXpL2@qRtN7sJwEa"
console.log(pw.bits);     // e.g. 131.0
console.log(pw.strength); // { label: "Excellent", level: 4 }
console.log(pw.time);     // e.g. "longer than the universe's age"
```

---

## CORS

The API sets `Access-Control-Allow-Origin: *` on all responses. Browser extensions can call it directly from content scripts, background service workers, or popup scripts without a proxy.

```javascript
// Works from any extension context — no proxy needed
const response = await fetch("https://YOUR_DOMAIN/api/generate", { ... });
```

---

## Error handling

The API always returns HTTP 200. If the request body is malformed or missing, defaults are used. There are no 4xx/5xx error states under normal usage.

For network failures in the extension:

```javascript
try {
  const res  = await fetch("https://YOUR_DOMAIN/api/generate", { ... });
  const data = await res.json();
  return data.passwords[0];
} catch (err) {
  // Fall back to a local client-side generator or show an error
  console.error("PWD API unreachable:", err);
}
```

---

## Rate limiting

No explicit rate limiting is implemented in the function. Cloudflare's default DDoS protection applies. For the extension, a reasonable client-side debounce (300ms) is sufficient.

---

## Extension architecture notes

**Manifest V3** (Chrome) and **Manifest V2/V3** (Firefox) both support `fetch()` in background service workers / background scripts. Add the domain to `host_permissions` (MV3) or `permissions` (MV2):

```json
// manifest.json (Manifest V3 — Chrome)
{
  "manifest_version": 3,
  "permissions": ["clipboardWrite", "activeTab", "storage"],
  "host_permissions": ["https://YOUR_DOMAIN/*"],
  "background": { "service_worker": "background.js" },
  "action": { "default_popup": "popup.html" }
}
```

```json
// manifest.json (Manifest V2 — Firefox)
{
  "manifest_version": 2,
  "permissions": ["clipboardWrite", "activeTab", "storage", "https://YOUR_DOMAIN/*"],
  "background": { "scripts": ["background.js"] },
  "browser_action": { "default_popup": "popup.html" }
}
```

**Suggested extension features to build:**
- Popup with same three tabs (word / character / phrase) mirroring the web UI
- Detect focused password fields on the page and offer to fill
- Remember last-used settings via `chrome.storage.local` / `browser.storage.local`
- Right-click context menu: "Generate password → fill field"
- Optional: copy-on-click without opening popup for quick generation
- Display `strength.label` and `time` next to the generated password

---

## Wordlist info

The bundled wordlist contains **1,246 curated words** (≈10.3 bits/word). To upgrade to the full EFF Large Wordlist (7,776 words, 12.9 bits/word), see the README for the `awk` extraction command. Replace the `WORD_LIST` array in both `public/js/wordlists.js` and `functions/api/generate.js`.

---

*PWD · github.com/SethBodine/pwd · MIT licence*
