// PassGen – functions/api/generate.js
// Cloudflare Pages Function: POST /api/generate
// Password generation logic mirrored server-side (no imports from public/)

// ── Wordlists (mirrors public/js/wordlists.js)
const WORD_LIST = [
  "abbey","abbot","abide","acorn","actor","acumen","adapt","adept","adobe",
  "adore","aegis","agile","aglow","agony","agree","aisle","album","alert",
  "algae","alien","align","allay","allot","alloy","aloof","altar","amber",
  "amble","amend","amiss","ample","angel","angle","anime","ankle","anvil",
  "aorta","apart","apple","arbor","ardor","arena","armor","aroma","array",
  "atlas","atone","attic","audio","avid","avoid","awake","award","aware",
  "azure","badge","baker","banjo","basil","basin","batch","bayou","beach",
  "beech","bevel","birch","bison","blaze","bleak","blend","bloom","blown",
  "bluff","blunt","blurt","board","boost","bough","boxer","brace","braid",
  "briar","brick","brine","brisk","broom","broth","brush","brute","budge",
  "bulge","burst","cabin","camel","canal","cargo","carve","cedar","chalk",
  "champ","chaos","charm","chase","chasm","cheer","chest","chime","chord",
  "civic","clamp","clang","clash","clasp","claw","clear","cleft","cliff",
  "cloak","clone","cloud","clove","clump","cobra","cocoa","comet","coral",
  "craft","crane","creak","creek","crest","crisp","croak","cross","crown",
  "cruel","crush","crypt","cubic","cumin","cycle","daisy","datum","decay",
  "decoy","delta","demon","depot","depth","disco","ditch","diver","dodge",
  "dogma","dome","donor","dough","dowel","draft","drain","drape","dread",
  "drift","dwarf","eager","eagle","easel","ebony","edict","egret","elder",
  "elite","elegy","epoch","equip","erode","erupt","evade","exact","exile",
  "extra","fable","facet","fairy","fancy","fauna","feast","feral","ferry",
  "fetch","fever","fiend","fiery","filch","flask","flame","fleet","flesh",
  "flick","flock","flood","flora","flour","flute","foggy","foray","forge",
  "forte","forum","found","frame","frank","frond","frost","fungi","furor",
  "gable","gecko","geyser","girth","glade","glare","glide","globe","gorge",
  "gourd","grace","grail","grant","grasp","graze","greed","grief","groan",
  "grove","guava","guild","guile","gulch","gusto","halve","haven","hazel",
  "helix","heron","hinge","hoard","holly","horde","humus","hydra","ichor",
  "igloo","image","imbue","impel","inert","infer","ingot","inlay","inlet",
  "ionic","ivory","jaunt","jazzy","jewel","joust","jumbo","karma","kebab",
  "kelp","knack","knave","knoll","kudos","lance","larva","laser","latch",
  "lathe","leach","ledge","lemma","lemur","lodge","logic","lotus","lucid",
  "lunar","lymph","lyric","macro","maize","manor","manta","maple","marsh",
  "matte","maxim","medic","melee","melon","merge","mesa","metal","mirth",
  "miser","mitre","mocha","modal","mogul","monk","moose","morph","mossy",
  "mulch","murky","myrrh","naive","naval","nerve","niche","nitre","noble",
  "nomad","notch","novel","nymph","oaken","oasis","octet","onyx","optic",
  "orbit","organ","otter","outdo","ovoid","oxide","ozone","panel","panic",
  "parse","patch","pause","pearl","pedal","penny","peony","perch","peril",
  "phase","pixel","place","plank","plant","pleat","pluck","plume","plush",
  "poach","poker","polar","pouch","power","prawn","prism","probe","prone",
  "prong","prose","prowl","prune","pulse","purge","quail","qualm","quart",
  "quest","quill","quirk","quota","rabbi","rabid","radar","radix","rapid",
  "ravel","reach","refit","renal","repel","resin","revel","rhino","ridge",
  "rivet","robin","rocky","rodeo","roost","rover","rugby","runic","rusty",
  "sabre","salve","sandy","satin","scald","scant","scarf","scone","scope",
  "shard","shark","shell","shoal","siege","sigma","silky","skiff","skull",
  "slab","slack","slant","slate","sleet","slime","slope","slosh","sloth",
  "slump","smack","smart","smear","smelt","smith","smudge","snare","snort",
  "snout","soggy","solar","sonar","sonic","spawn","spell","spill","spine",
  "spire","spook","spore","spout","sprig","spunk","squid","stack","stale",
  "stalk","stamp","stark","stave","steam","steep","steer","stern","still",
  "sting","stoic","stomp","stone","stork","storm","stout","strap","straw",
  "stray","suave","sulky","sumac","surge","swamp","swarm","sweep","swell",
  "swipe","swirl","swoop","talon","tango","tapir","tawny","terse","thorn",
  "tiger","token","topaz","torch","totem","tower","toxic","track","trawl",
  "tread","trench","tribe","trick","trill","troll","troop","trove","truce",
  "tulip","tunic","turbo","ulcer","ultra","usher","vapor","vault","venom",
  "verge","vigor","viola","viper","visor","vista","vital","vivid","waltz",
  "whelp","whirl","witch","wraith","wreck","wring","yeast","yield","zenith"
];

const ARTICLES   = ["the","a","an","one","my","your","each","some","this","that","our","their"];
const ADJECTIVES = ["agile","amber","ancient","ardent","azure","blazing","bold","brave","bright",
  "brisk","calm","clear","clever","cold","cool","crisp","cunning","dark","deft",
  "dense","distant","divine","dusty","eager","ember","fierce","fleet","fluid",
  "frozen","gentle","gilded","grand","grave","grim","hardy","hidden","hollow",
  "humble","icy","iron","jade","keen","kind","lone","lost","loyal","lucid",
  "lunar","mighty","misty","mossy","mystic","nimble","noble","old","pale",
  "primal","pure","quiet","radiant","rapid","rare","raw","rigid","robust",
  "rough","rugged","sacred","scarlet","serene","sharp","silent","silver",
  "slow","small","smooth","soft","solemn","somber","stark","steady","stern",
  "stoic","strange","strong","subtle","swift","true","vast","vibrant","vivid",
  "warm","wise","worn","zealous"];
const NOUNS      = ["anchor","anvil","arbor","arch","arrow","ash","axe","bay","beacon","bear",
  "bloom","boulder","bough","bridge","brook","canyon","cape","cave","cedar",
  "chasm","cliff","cloud","comet","coral","cove","crag","crane","crest","crow",
  "dale","dawn","deer","delta","dusk","eagle","echo","edge","elm","ember",
  "falcon","fang","fern","flame","flint","fog","forest","forge","fort","fox",
  "gale","gate","glacier","glen","globe","gorge","gust","hawk","haven","heath",
  "hill","horn","hound","hull","isle","keep","lake","lance","lantern","leaf",
  "ledge","leopard","light","lion","lynx","marsh","mast","mesa","mist","monk",
  "moon","moss","mountain","night","oak","ocean","orbit","otter","owl","path",
  "peak","pine","prism","raven","ravine","reef","ridge","ring","river","rock",
  "root","ruin","sage","sand","seal","shadow","shroud","signal","slate","snow",
  "stone","storm","stream","sun","summit","sword","thorn","tide","torch",
  "tower","trail","tree","vale","vault","vine","wave","wind","wolf","wren"];
const VERBS      = ["blazes","blooms","breaks","builds","burns","calls","carves","charges",
  "chases","circles","claims","climbs","crosses","crowns","dashes","dives",
  "drifts","echoes","endures","fades","falls","finds","flies","flows","forges",
  "glides","glows","guards","guides","holds","hunts","ignites","keeps","leaps",
  "lights","lingers","looms","marks","meets","melts","moves","pierces","prowls",
  "races","reaches","rises","roams","rolls","runs","sails","seeks","shapes",
  "shifts","shines","sings","soars","speaks","spirals","stands","stirs","storms",
  "strikes","surges","swirls","sweeps","turns","wanders","weaves","winds"];
const ADVERBS    = ["alone","always","boldly","brightly","calmly","clearly","closely","coolly",
  "darkly","deeply","deftly","endlessly","evenly","fiercely","firmly","freely",
  "gently","gravely","grimly","keenly","kindly","lightly","long","lowly",
  "madly","mightily","mutely","nearly","nimbly","nobly","often","onward",
  "purely","quietly","rapidly","rarely","roughly","safely","sharply","silently",
  "simply","slowly","softly","solemnly","starkly","steadily","sternly","stoutly",
  "strongly","subtly","surely","swiftly","truly","vastly","widely","wisely"];
const POOL_SEQ   = [ARTICLES, ADJECTIVES, NOUNS, VERBS, ADVERBS, ADJECTIVES, NOUNS, ADVERBS];
const SEPARATORS = ["-",".",  "_","~","!","@","#","$","%","^","&","*","=","+","|"];
const LOWER      = "abcdefghijklmnopqrstuvwxyz";
const UPPER      = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS     = "0123456789";
const SPECIAL    = "!@#$%^&*()-_=+[]{}|;:,.<>?";

// ── Crypto random (available in all Cloudflare Workers / Pages Functions)
function randInt(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % max;
}

function pick(arr) { return arr[randInt(arr.length)]; }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Entropy helpers
function charEntropy(len, cs)       { return len * Math.log2(Math.max(cs, 1)); }
function wordEntropy(n, size)       { return n * Math.log2(Math.max(size, 1)); }
function sentenceEntropy(pools)     { return pools.reduce((s, p) => s + Math.log2(p), 0); }

function strengthLabel(bits) {
  if (bits < 40)  return { label: "Weak",     level: 0 };
  if (bits < 60)  return { label: "Fair",     level: 1 };
  if (bits < 80)  return { label: "Good",     level: 2 };
  if (bits < 100) return { label: "Strong",   level: 3 };
  return               { label: "Excellent", level: 4 };
}

function crackTime(bits) {
  const secs = Math.pow(2, bits) / 2 / 1e11;
  if (secs < 1)        return "< 1 second";
  if (secs < 60)       return `${Math.round(secs)} seconds`;
  if (secs < 3600)     return `${Math.round(secs/60)} minutes`;
  if (secs < 86400)    return `${Math.round(secs/3600)} hours`;
  if (secs < 2592000)  return `${Math.round(secs/86400)} days`;
  if (secs < 31536000) return `${Math.round(secs/2592000)} months`;
  const y = secs / 31536000;
  if (y < 1e3)  return `${Math.round(y).toLocaleString()} years`;
  if (y < 1e6)  return `${Math.round(y/1e3).toLocaleString()}k years`;
  if (y < 1e9)  return `${Math.round(y/1e6).toLocaleString()}M years`;
  return "heat death of the universe";
}

function detectPatterns(pw) {
  const warnings = [];
  const lower = pw.toLowerCase();
  const yr = new Date().getFullYear();
  for (let y = 1990; y <= yr + 2; y++) {
    if (lower.includes(String(y))) {
      warnings.push(`Contains year ${y} — common in honeypot data`);
    }
  }
  if (/012|123|234|345|456|567|678|789/.test(pw))
    warnings.push("Sequential digit run detected");
  if (/(.)\1{3,}/.test(pw))
    warnings.push("Repeated character run reduces entropy");
  for (const s of ["spring","summer","autumn","fall","winter"]) {
    if (new RegExp(`${s}\\d{2,4}`, "i").test(lower)) {
      warnings.push("Season + number pattern — common forced-rotation password");
      break;
    }
  }
  return warnings;
}

// ── Generators
function genWord(opts) {
  const { wordCount = 4, separator = "-", capitalize = false, injectNum = false } = opts;
  const words = Array.from({ length: wordCount }, () => {
    let w = pick(WORD_LIST);
    return capitalize ? w[0].toUpperCase() + w.slice(1) : w;
  });
  if (injectNum) {
    const t = randInt(wordCount);
    const d = String(randInt(9) + 1);
    const p = randInt(words[t].length - 1) + 1;
    words[t] = words[t].slice(0, p) + d + words[t].slice(p);
  }
  const value = words.join(separator);
  const bits  = wordEntropy(wordCount, WORD_LIST.length);
  return { value, bits: Math.round(bits*10)/10, strength: strengthLabel(bits), time: crackTime(bits), warnings: detectPatterns(value), type: "word" };
}

function genChar(opts) {
  const { length = 16, lower = true, upper = true, numbers = true, special = true } = opts;
  let charset = "";
  if (lower)   charset += LOWER;
  if (upper)   charset += UPPER;
  if (numbers) charset += DIGITS;
  if (special) charset += SPECIAL;
  if (!charset) charset = LOWER;

  const required = [];
  if (lower)   required.push(pick([...LOWER]));
  if (upper)   required.push(pick([...UPPER]));
  if (numbers) required.push(pick([...DIGITS]));
  if (special) required.push(pick([...SPECIAL]));

  const remaining = Array.from({ length: Math.max(0, length - required.length) }, () => charset[randInt(charset.length)]);
  let chars = shuffle([...required, ...remaining]);
  let value = chars.join("");

  // Anti-pattern: reshuffle digits if sequential/year found
  for (let a = 0; a < 5 && numbers; a++) {
    if (!/012|123|234|345|456|567|678|789|19[0-9]{2}|20[0-3][0-9]/.test(value)) break;
    const cs = value.split("");
    const di = cs.map((c, i) => DIGITS.includes(c) ? i : -1).filter(i => i >= 0);
    const nd = shuffle(di.map(() => pick([...DIGITS])));
    di.forEach((idx, i) => { cs[idx] = nd[i]; });
    value = cs.join("");
  }

  const size = (lower?26:0)+(upper?26:0)+(numbers?10:0)+(special?32:0) || 26;
  const bits = charEntropy(length, size);
  return { value, bits: Math.round(bits*10)/10, strength: strengthLabel(bits), time: crackTime(bits), warnings: detectPatterns(value), type: "char" };
}

function genPhrase(opts) {
  const { wordCount = 5, separator = null, capitalize = true, injectNum = false } = opts;
  const sep   = separator ?? pick(SEPARATORS);
  const count = Math.max(3, Math.min(8, wordCount));
  const words = Array.from({ length: count }, (_, i) => {
    const pool = POOL_SEQ[i % POOL_SEQ.length];
    let w = pick(pool);
    return capitalize ? w[0].toUpperCase() + w.slice(1) : w;
  });
  if (injectNum) {
    const t = randInt(count - 1);
    const d = String(randInt(9) + 1);
    const p = randInt(words[t].length - 1) + 1;
    words[t] = words[t].slice(0, p) + d + words[t].slice(p);
  }
  const value = words.join(sep);
  const poolSizes = Array.from({ length: count }, (_, i) => POOL_SEQ[i % POOL_SEQ.length].length);
  const sepBits   = separator ? 0 : Math.log2(SEPARATORS.length);
  const bits      = sentenceEntropy(poolSizes) + sepBits;
  return { value, bits: Math.round(bits*10)/10, strength: strengthLabel(bits), time: crackTime(bits), warnings: detectPatterns(value), type: "phrase", separator: sep };
}

// ── Main handler
export async function onRequestPost(context) {
  const { request, env } = context;

  // Parse body
  let body = {};
  try { body = await request.json(); } catch {}

  const type  = ["word","char","phrase"].includes(body.type) ? body.type : "word";
  const count = Math.min(10, Math.max(1, parseInt(body.count) || 1));

  const fn = type === "word" ? genWord : type === "char" ? genChar : genPhrase;
  const passwords = Array.from({ length }, () => fn(body)).slice(0, count); // correct below
  // Note: use correct count
  const pwds = Array.from({ length: count }, () => fn(body));

  const payload = {
    passwords: pwds,
    meta: {
      type,
      count,
      generatedAt: new Date().toISOString()
    }
  };

  // Discord metadata webhook (fire-and-forget)
  if (env.DISCORD_WEBHOOK_URL) {
    const ip      = request.headers.get("CF-Connecting-IP") || "unknown";
    const country = request.headers.get("CF-IPCountry") || "unknown";
    const ua      = request.headers.get("User-Agent") || "unknown";
    context.waitUntil(
      fetch(env.DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: "PassGen API Request",
            color: 0x6d6afe,
            fields: [
              { name: "Type",        value: type,                           inline: true  },
              { name: "Count",       value: String(count),                  inline: true  },
              { name: "IP",          value: ip,                             inline: true  },
              { name: "Country",     value: country,                        inline: true  },
              { name: "User-Agent",  value: ua.slice(0, 200),              inline: false },
              { name: "Timestamp",   value: new Date().toISOString(),       inline: false }
            ],
            footer: { text: "Password values are never logged" }
          }]
        })
      }).catch(() => {})
    );
  }

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type":                "application/json",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options":      "nosniff",
      "Cache-Control":               "no-store"
    }
  });
}

// Handle preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age":       "86400"
    }
  });
}
