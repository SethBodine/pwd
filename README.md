# PassGen

Cryptographically secure password generator built for Cloudflare Pages.  
Three modes — word-based, character-based, sentence passphrase — with real entropy analysis and anti-pattern detection informed by [SANS ISC honeypot research](https://isc.sans.edu/diary/32866).

```
                             ⬡ PassGen
  ┌─────────────┬────────────────────┬─────────────────┐
  │ Word-based  │  Character-based   │ Sentence phrase │
  │ EFF-inspired│  upper/lower/num/  │ article+adj+    │
  │ 2–8 words   │  special, 8–64     │ noun+verb+adv   │
  └─────────────┴────────────────────┴─────────────────┘
                     Cloudflare Pages + Functions
                     Discord webhook metadata log
```

---

## Features

- **Three password types** — word-based (Diceware-style), character-based, sentence passphrases
- **Cryptographically random** — `crypto.getRandomValues()` throughout, no `Math.random()`
- **All generation is client-side** — passwords never leave the browser
- **SANS ISC anti-pattern engine** — detects and warns on years, sequential numbers, season+year combos
- **Real entropy display** — bits, strength label (Weak → Excellent), crack-time estimate at 100B guesses/sec
- **Variable separators** — 15 separator options including Random mode for phrases
- **REST API** — all three generators available via `POST /api/generate`
- **Discord metadata logging** — IP, country, browser, timestamp, password style (never the value)
- **Security headers** — CSP, HSTS, X-Frame-Options, Permissions-Policy via middleware
- **No build step** — pure HTML/CSS/ES Modules, deploy-ready

---

## Project Structure

```
passgen/
├── public/                        # Static site (served by Cloudflare Pages)
│   ├── index.html                 # Main UI
│   ├── css/
│   │   └── style.css              # Cryptex aesthetic — Syne + Fira Code
│   ├── js/
│   │   ├── wordlists.js           # EFF-inspired word list + sentence part pools
│   │   ├── generators.js          # Three password generators
│   │   ├── entropy.js             # Entropy calc + anti-pattern detection
│   │   └── ui.js                  # DOM/interaction layer
│   ├── robots.txt
│   ├── humans.txt
│   └── .well-known/
│       └── security.txt           # RFC 9116 security disclosure
├── functions/                     # Cloudflare Pages Functions (edge API)
│   ├── _middleware.js             # Security headers for all routes
│   └── api/
│       └── generate.js            # POST /api/generate
├── wrangler.toml                  # Cloudflare config
├── package.json
└── README.md
```

---

## Deployment

### Prerequisites

- A [GitHub](https://github.com) account
- A [Cloudflare](https://cloudflare.com) account (free tier works)
- [Node.js](https://nodejs.org) 18+ and npm (for local development only)

---

### Step 1 — Fork / Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/passgen.git
cd passgen
npm install          # installs wrangler for local dev
```

---

### Step 2 — Connect to Cloudflare Pages

1. Log in to the [Cloudflare dashboard](https://dash.cloudflare.com)
2. Go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Select your forked `passgen` repository
4. Set the build configuration:

| Setting | Value |
|---|---|
| Build command | *(leave empty)* |
| Build output directory | `public` |
| Root directory | *(leave empty)* |

5. Click **Save and Deploy** — Cloudflare will auto-detect the `functions/` directory and deploy edge functions alongside the static site.

---

### Step 3 — Set up the Discord webhook

The API logs metadata (never passwords) to a Discord channel on each request.

1. In your Discord server, go to the channel you want logs in → **Edit Channel** → **Integrations** → **Webhooks** → **New Webhook**
2. Name it (e.g. `PassGen Logs`), copy the **Webhook URL**
3. In the Cloudflare dashboard: **Workers & Pages** → your project → **Settings** → **Environment variables**
4. Add a new variable:
   - **Variable name:** `DISCORD_WEBHOOK_URL`
   - **Value:** your webhook URL
   - **Environment:** Production (and Preview if desired)
   - Click **Encrypt** to store it as a secret

> Discord messages include: password type, count, IP address, country (from Cloudflare headers), User-Agent, and timestamp. **Password values are never logged.**

---

### Step 4 — Custom domain (optional)

1. In Cloudflare Pages → your project → **Custom domains** → **Set up a custom domain**
2. Enter your domain (e.g. `passgen.yourdomain.com`)
3. Cloudflare will automatically provision an SSL certificate and configure DNS

Update these files once you have a domain:

| File | What to update |
|---|---|
| `public/robots.txt` | Replace `YOUR_DOMAIN` with your actual domain |
| `public/humans.txt` | Replace `YOUR_USERNAME` and `YOUR_NAME` |
| `public/.well-known/security.txt` | Replace `YOUR_DOMAIN` and `YOUR_USERNAME` |
| `public/index.html` | Replace `YOUR_USERNAME` in GitHub links |

---

### Step 5 — Local development

```bash
npm run dev
# Opens at http://localhost:8788
# Functions served at http://localhost:8788/api/generate
```

The local dev server uses Wrangler to simulate Cloudflare Pages Functions and bindings.  
For Discord logging locally, create a `.dev.vars` file (never commit this):

```ini
# .dev.vars  — local only, add to .gitignore
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK
```

---

### Step 6 — Deploy manually (optional)

```bash
npm run deploy
# Deploys public/ to Cloudflare Pages with functions
```

Alternatively, any push to `main` on GitHub will trigger an automatic Cloudflare Pages deployment.

---

## Security Configuration

### Security headers

All responses receive these headers via `functions/_middleware.js`:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'` — restricts all resource loading |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` — prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` — prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Blocks geolocation, microphone, camera, payment |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-site` |

To tighten the CSP (if you self-host fonts), remove the Google Fonts entries from `_middleware.js`:

```javascript
// Remove these two lines from the CSP:
"style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
"font-src 'self' https://fonts.gstatic.com",

// Replace with:
"style-src 'self'",
"font-src 'self'",
```

Then download the fonts and place them in `public/fonts/`, updating the CSS `@font-face` declarations accordingly.

### HSTS preloading

Once your domain is live and you're confident in the configuration, submit to the [HSTS preload list](https://hstspreload.org). The `preload` directive is already set in the middleware.

### API rate limiting

Cloudflare's built-in rate limiting can be configured in your Cloudflare dashboard:

1. **Security** → **WAF** → **Rate limiting rules**
2. Create a rule: match `http.request.uri.path contains "/api/"`, limit to **30 requests per minute per IP**
3. Action: **Block** with a 429 response

For stricter limits, use **Cloudflare Workers Rate Limiting** binding.

---

## Well-known files

### `robots.txt`

Located at `/robots.txt`. Allows all crawlers on the main site, blocks the API and `.well-known/` paths.

Update `YOUR_DOMAIN` before deploying.

### `humans.txt`

Located at `/humans.txt`. Lists project authors, tech stack, and acknowledgments. Update with your details.

### `security.txt` (RFC 9116)

Located at `/.well-known/security.txt`. Provides a standardised security disclosure contact.

Update all placeholder values before deploying:
- `YOUR_DOMAIN` → your actual domain
- `YOUR_USERNAME` → your GitHub username
- `Expires` → update annually (currently set to 2027-04-15)
- `Contact` → your actual security contact email

To add a PGP key for encrypted reports, export your public key and host it at `https://YOUR_DOMAIN/pgp-key.txt`, then update the `Encryption` field.

---

## API Reference

### `POST /api/generate`

All parameters are optional — defaults are shown.

```json
{
  "type":      "word",
  "count":     1,

  "wordCount":  4,
  "separator":  "-",
  "capitalize": false,
  "injectNum":  false,

  "length":  16,
  "lower":   true,
  "upper":   true,
  "numbers": true,
  "special": true
}
```

**Types:** `word` | `char` | `phrase`  
**Separators:** `-` `.` `_` `~` `!` `@` `#` `$` `%` `^` `&` `*` `=` `+` `|`  
**Count:** 1–10

#### Response

```json
{
  "passwords": [
    {
      "value":    "Cobalt-Forest-7Leaps-Swiftly",
      "bits":     54.2,
      "strength": { "label": "Strong", "level": 3 },
      "time":     "2M years",
      "warnings": [],
      "type":     "word"
    }
  ],
  "meta": {
    "type":        "word",
    "count":       1,
    "generatedAt": "2026-04-15T10:30:00.000Z"
  }
}
```

#### cURL examples

```bash
# Word-based, 5 words, random separator
curl -X POST https://YOUR_DOMAIN/api/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"word","wordCount":5,"capitalize":true,"count":3}'

# Character-based, 24 chars, all complexity
curl -X POST https://YOUR_DOMAIN/api/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"char","length":24,"lower":true,"upper":true,"numbers":true,"special":true}'

# Sentence passphrase, 6 words, random separator
curl -X POST https://YOUR_DOMAIN/api/generate \
  -H "Content-Type: application/json" \
  -d '{"type":"phrase","wordCount":6,"separator":null,"capitalize":true}'
```

---

## Entropy Reference

### Character-based

| Charset | Bits/char | 16 chars | 24 chars |
|---|---|---|---|
| Lowercase only | 4.70 | 75.2b | 112.8b |
| Lower + upper | 5.70 | 91.2b | 136.8b |
| Lower + upper + digits | 5.95 | 95.2b | 142.8b |
| All (+ 32 special) | 6.55 | 104.8b | 157.2b |

### Word-based (512-word list, 9 bits/word)

| Words | Entropy |
|---|---|
| 3 | 27 bits — Weak |
| 4 | 36 bits — Fair |
| 5 | 45 bits — Good |
| 6 | 54 bits — Strong |
| 8 | 72 bits — Excellent |

### SANS ISC Anti-patterns (what we detect and warn about)

Based on analysis of 496,562 unique passwords from DShield honeypots:

- **Year appended to end** (`Spring2026!`, `Admin@2026`) — #1 pattern in honeypot data
- **Sequential digit runs** (`123`, `1234`, `12345`) — top contiguous numbers
- **Current/prior year** — 2024, 2025, 2026 appear in vast majority of weak passwords  
- **Season + year combos** — common forced-rotation pattern (`Summer2025`)
- **Month + year combos** — another rotation pattern (`April2026`)
- **Repeated character runs** (`aaaa`, `1111`) — significantly reduces entropy

---

## Privacy

- **No analytics** — no Google Analytics, no tracking pixels, no cookies
- **Client-side generation** — passwords are generated in your browser using `crypto.getRandomValues()`
- **API metadata only** — the API logs: type, count, IP, country, browser agent, timestamp. Never the password.
- **No persistent storage** — nothing is stored server-side
- **Open source** — audit the code yourself

---

## Extending the wordlist

The word list in `public/js/wordlists.js` and `functions/api/generate.js` contains ~512 curated words (9 bits/word). To use the full [EFF Large Wordlist](https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt) (7776 words, 12.9 bits/word):

1. Download the EFF list and strip the dice numbers:
   ```bash
   curl https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt | \
     awk '{print $2}' | \
     sed 's/.*/"&"/' | \
     paste -sd ',' > eff_words.txt
   ```
2. Replace the `WORD_LIST` array in both `wordlists.js` and `functions/api/generate.js`
3. Update entropy display — each word now provides 12.9 bits instead of 9

---

## License

MIT — see [LICENSE](LICENSE) for details.

The word list is inspired by the [EFF Long Wordlist](https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases) (CC BY 3.0).
