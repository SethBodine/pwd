# PWD — Secure Password Generator

Cryptographically secure password generator built on Cloudflare Pages.  
Three modes · Real entropy analysis · SHA-256 attack baseline · No tracking · Open source.

**Live:** `https://YOUR_DOMAIN`  
**API docs:** `https://YOUR_DOMAIN/swagger`  
**OpenAPI spec:** `https://YOUR_DOMAIN/openapi.yaml`  
**Source:** [github.com/SethBodine/pwd](https://github.com/SethBodine/pwd)

---

## Features

- **Three password types** — word-based (Diceware-style), character-based, sentence passphrases
- **Cryptographically random** — `crypto.getRandomValues()` throughout, no `Math.random()`
- **All generation client-side** — passwords never leave the browser
- **Dual entropy model** — generation model (conservative) + brute-force model (what online meters show)
- **SHA-256 baseline** — crack times at 8B guesses/sec (RTX 4090 GPU), the responsible middle ground
- **SANS ISC anti-pattern engine** — warns on years, sequential numbers, season+year combos
- **Light and dark mode** — toggle in the header; preference saved to `localStorage`
- **REST API** — all three generators via `POST /api/generate` with full validation
- **Swagger UI** — interactive API docs at `/swagger`
- **OpenAPI 3.1.0 spec** — machine-readable at `/openapi.yaml`
- **No build step** — pure HTML/CSS/ES Modules

---

## Entropy and crack time explained

### Two models, one response

Every generated password returns two entropy figures:

| Field | Model | What it means |
|---|---|---|
| `bits` / `time` | **Generation model** | Attacker knows your wordlist and word count — the cryptographic lower bound |
| `bfBits` / `bfTime` | **Brute-force model** | Attacker tries all character combinations — what passwordmonster and Bitwarden show |

Use the generation model as your benchmark. Reality sits between the two.

### SHA-256 baseline (8B/sec)

All crack times assume SHA-256 hashing at 8 billion guesses/second (RTX 4090 GPU cluster).  
This is the responsible middle ground:

| Algorithm | Rate | Status |
|---|---|---|
| MD5, SHA-1, NTLM, LM | 100B–500B/sec | **Broken — do not use** |
| **SHA-256 (our baseline)** | **8B/sec** | **Acceptable minimum** |
| bcrypt, Argon2, scrypt | 100K–1M/sec | Recommended for passwords |

> **Insecure algorithms note:** MD5, SHA-1, NTLM, LM, DES, and RC4 are cryptographically broken.  
> Password complexity is irrelevant when the hash algorithm itself is crackable.

### Wordlist size matters

The bundled wordlist contains 1,246 words (≈10.3 bits/word). For a 5-word passphrase:

| Wordlist | Bits | SHA-256 crack time |
|---|---|---|
| Bundled (1,246 words) | 51.4b | ~3 days |
| **EFF Large (7,776 words)** | **64.6b** | **~56 years** |

See [Upgrading the wordlist](#upgrading-the-wordlist) for the one-command upgrade to the EFF list.

---

## Project structure

```
pwd/
├── public/                    # Static site (Cloudflare Pages)
│   ├── index.html             # Main UI — three tabs, light/dark mode
│   ├── swagger.html           # Swagger UI (also served at /swagger)
│   ├── openapi.yaml           # OpenAPI 3.1.0 specification
│   ├── _redirects             # Cloudflare Pages URL redirects (/swagger → /swagger.html)
│   ├── robots.txt
│   ├── humans.txt
│   ├── .well-known/
│   │   └── security.txt       # RFC 9116 security disclosure
│   ├── css/
│   │   └── style.css          # Dark + light themes (CSS custom properties)
│   └── js/
│       ├── wordlists.js       # 1,246-word list + sentence pools + separators
│       ├── generators.js      # Three generators (word / char / phrase)
│       ├── entropy.js         # Entropy calc, crack times, anti-pattern detection
│       └── ui.js              # Tab switching, theme toggle, clipboard, entropy bar
├── functions/                 # Cloudflare Pages Functions (edge API)
│   ├── _middleware.js         # Security headers (CSP, HSTS, X-Frame-Options)
│   └── api/
│       └── generate.js        # POST /api/generate — validated, aligned with client
├── API.md                     # API reference for browser extension development
├── wrangler.toml
├── package.json               # npm run dev | npm run deploy
└── README.md
```

---

## Deployment

### Prerequisites

- [GitHub](https://github.com) account
- [Cloudflare](https://cloudflare.com) account (free tier works)
- [Node.js](https://nodejs.org) 18+ (for local development only)

### Step 1 — Fork and clone

```bash
git clone https://github.com/SethBodine/pwd.git
cd pwd
npm install
```

### Step 2 — Connect to Cloudflare Pages

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select your `pwd` repository
3. Build settings:

| Setting | Value |
|---|---|
| Build command | *(leave empty)* |
| Build output directory | `public` |

4. **Save and Deploy** — Cloudflare auto-detects `functions/` for edge functions.

### Step 3 — Custom domain (optional)

Workers & Pages → your project → **Custom domains** → **Set up a custom domain**.  
Cloudflare provisions SSL automatically.

### Step 4 — Update placeholders

Search for `YOUR_DOMAIN` and `YOUR_USERNAME` in:

| File | What to update |
|---|---|
| `public/robots.txt` | Sitemap URL |
| `public/humans.txt` | Name, GitHub handle |
| `public/.well-known/security.txt` | Domain, email, GitHub |
| `public/openapi.yaml` | Server URL |
| `public/swagger.html` | (automatically uses `/openapi.yaml`) |

### Step 5 — Local development

```bash
npm run dev
# http://localhost:8788
# API at http://localhost:8788/api/generate
# Swagger at http://localhost:8788/swagger
```

### Step 6 — Deploy manually

```bash
npm run deploy
```

Any push to `main` also triggers automatic Cloudflare Pages deployment.

---

## API

### Endpoint

```
POST /api/generate
Content-Type: application/json
```

### Quick examples

```bash
# Word passphrase, 5 words
curl -X POST https://YOUR_DOMAIN/api/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"word","wordCount":5,"separator":"-","capMode":"first","count":3}'

# Character password, 24 chars
curl -X POST https://YOUR_DOMAIN/api/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"char","length":24,"count":1}'

# Sentence passphrase, random separator
curl -X POST https://YOUR_DOMAIN/api/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"phrase","wordCount":5,"separator":null,"capMode":"first","count":3}'
```

### Request parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `type` | string | `"word"` | `"word"` \| `"char"` \| `"phrase"` |
| `count` | integer | `1` | 1–10 passwords per request |
| `wordCount` | integer | `5` | Words (word: 2–10, phrase: 3–8) |
| `separator` | string\|null | `"-"` | See separators table. `null` or `"__random__"` = random |
| `capMode` | string | `"first"` | `"first"` \| `"last"` \| `"random"` \| `"vowel"` \| `"all"` \| `"none"` |
| `injectNum` | boolean | `false` | Insert a digit mid-word (never at end) |
| `leet` | boolean | `false` | l33t substitutions (a→4/@, e→3, i→1/!, o→0, s→$/5…) |
| `length` | integer | `16` | Character password length (char only, 8–64) |
| `lower` | boolean | `true` | Include a–z |
| `upper` | boolean | `true` | Include A–Z |
| `numbers` | boolean | `true` | Include 0–9 |
| `special` | boolean | `true` | Include !@#$… |

> **Note:** Fields not applicable to the selected `type` are silently ignored and listed in `meta.ignoredFields` in the response.

### Response

```json
{
  "passwords": [
    {
      "value":    "Cobalt-Forest-Leaps-Swiftly-Alone",
      "bits":     51.4,
      "bfBits":   185.2,
      "strength": { "label": "Good", "level": 2 },
      "time":     "2.1k years",
      "bfTime":   "longer than the universe's age",
      "warnings": [],
      "type":     "word"
    }
  ],
  "meta": {
    "type":         "word",
    "count":        1,
    "generatedAt":  "2026-04-17T10:30:00.000Z",
    "wordlistSize": 1246,
    "rateNote":     "SHA-256 @ 8B/sec GPU baseline — identical to client-side calculation",
    "crackTimeNote":"Generation model: wordlist attack (conservative). bfTime: character brute-force."
  }
}
```

**Validation errors** return HTTP 400:

```json
{
  "error": "Invalid request parameters",
  "details": ["\"wordCount\" must be 2–10 for type \"word\""],
  "passwords": []
}
```

### Full API docs

Interactive Swagger UI: `https://YOUR_DOMAIN/swagger`  
OpenAPI 3.1.0 spec: `https://YOUR_DOMAIN/openapi.yaml`  
Extension reference: [`API.md`](API.md)

---

## Security headers

All responses receive these headers via `functions/_middleware.js`:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Blocks geolocation, microphone, camera, payment |

---

## Well-known files

| File | URL | Standard |
|---|---|---|
| `robots.txt` | `/robots.txt` | Allows crawlers, blocks `/api/`, `/swagger.html`, `/openapi.yaml` |
| `humans.txt` | `/humans.txt` | Credits and tech stack |
| `security.txt` | `/.well-known/security.txt` | RFC 9116 — update `Expires` annually |

---

## Upgrading the wordlist

The bundled wordlist has 1,246 words (10.3 bits/word). Upgrade to the full EFF Large Wordlist (7,776 words, 12.9 bits/word) for significantly stronger passphrases:

```bash
# Download and extract just the words
curl https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt | \
  awk '{print $2}' | \
  grep -v '^$' | \
  sed 's/.*/"&"/' | \
  paste -sd ',' > eff_words.txt
```

Then replace the `WORD_LIST` array in both:
- `public/js/wordlists.js`
- `functions/api/generate.js`

With the EFF list, a 5-word passphrase gives 64.6 bits → ~56 years at SHA-256.

---

## Privacy

- **No analytics** — no tracking pixels, no cookies, no telemetry
- **Client-side generation** — passwords generated in your browser using `crypto.getRandomValues()`
- **No server logging** — the API generates passwords at the edge and returns them; nothing is stored
- **Open source** — audit the code at [github.com/SethBodine/pwd](https://github.com/SethBodine/pwd)

---

## License

MIT — see [LICENSE](LICENSE) for details.  
EFF wordlist inspiration: [EFF Long Wordlist](https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases) (CC BY 3.0).
