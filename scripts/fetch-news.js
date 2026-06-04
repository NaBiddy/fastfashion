const Parser = require("rss-parser");
const fs = require("fs");
const path = require("path");

const parser = new Parser({
  customFields: {
    item: [
      ["media:content",   "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
    ],
  },
  timeout: 12000,
});

// ── Layer 1: Established publications ────────────────────────────────────────
const MAINSTREAM_FEEDS = [
  { name: "WWD",           url: "https://wwd.com/feed/",                       category: "trending", limit: 4 },
  { name: "Vogue",         url: "https://www.vogue.com/feed/rss",              category: "trending", limit: 4 },
  { name: "Highsnobiety",  url: "https://www.highsnobiety.com/feed/",          category: "auto",     limit: 4 },
  { name: "Hypebeast",     url: "https://hypebeast.com/feed",                  category: "auto",     limit: 4 },
  { name: "Hypebae",       url: "https://hypebae.com/feed",                    category: "auto",     limit: 4 },
  { name: "The Cut",       url: "https://www.thecut.com/feed/rss",             category: "trending", limit: 4 },
  { name: "i-D",           url: "https://i-d.co/rss/",                        category: "auto",     limit: 4 },
  { name: "AnOther",       url: "https://www.anothermag.com/feed/rss",         category: "auto",     limit: 4 },
  { name: "Wonderland",    url: "https://www.wonderlandmagazine.com/feed/",    category: "auto",     limit: 4 },
  { name: "Fucking Young", url: "https://fuckingyoung.es/feed/",               category: "auto",     limit: 4 },
  { name: "GQ",            url: "https://www.gq.com/feed/rss",                 category: "auto",     limit: 4 },
  // Sneakers — limited & pushed to bottom by sorter
  { name: "Sneaker News",  url: "https://sneakernews.com/feed/",               category: "drops",    limit: 3 },
  { name: "Nice Kicks",    url: "https://www.nicekicks.com/feed/",             category: "drops",    limit: 3 },
];

// ── Layer 2: Underground / niche fashion blogs ────────────────────────────────
const UNDERGROUND_FEEDS = [
  { name: "Permanent Style",   url: "https://www.permanentstyle.com/feed",            category: "trending", limit: 3 },
  { name: "Put This On",       url: "https://putthison.com/feed/",                    category: "trending", limit: 3 },
  { name: "Style Girlfriend",  url: "https://stylegirlfriend.com/feed/",              category: "auto",     limit: 3 },
  { name: "Dazed",             url: "https://www.dazeddigital.com/rss",               category: "auto",     limit: 3 },
  { name: "Document Journal",  url: "https://www.documentjournal.com/feed/",          category: "trending", limit: 3 },
  { name: "032c",              url: "https://032c.com/feed",                          category: "trending", limit: 3 },
];

// ── Layer 3: Google News discovery searches ───────────────────────────────────
// Free, no API key — surfaces the whole web not just known publications
function googleNewsUrl(query) {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`;
}

const DISCOVERY_SEARCHES = [
  { name: "Emerging Brands",       query: "emerging clothing brand fashion 2025",        category: "trending", limit: 3 },
  { name: "Independent Designers", query: "independent fashion designer new collection",  category: "auto",     limit: 3 },
  { name: "Underground Streetwear",query: "underground streetwear brand drop",            category: "auto",     limit: 3 },
  { name: "New Fashion Collabs",   query: "fashion collaboration clothing brand new",     category: "auto",     limit: 3 },
  { name: "Small Brand Buzz",      query: "small clothing brand trending viral",          category: "trending", limit: 3 },
  { name: "Rising Designers",      query: "rising fashion designer debut collection",     category: "trending", limit: 3 },
  // Trend prediction articles
  { name: "Next Trend",            query: "next fashion trend 2025 2026 clothing piece",  category: "trending", limit: 2 },
  { name: "Trend Forecast",        query: "fashion trend forecast what to wear next season", category: "trending", limit: 2 },
  { name: "Trending Piece",        query: "\"will be the next\" OR \"is going to be\" fashion trend clothing", category: "trending", limit: 2 },
];

const DISCOVERY_FEEDS = DISCOVERY_SEARCHES.map((s) => ({
  ...s,
  url: googleNewsUrl(s.query),
}));

// ── Layer 4: Community & culture feeds ───────────────────────────────────────
// (Reddit blocks RSS without auth — using fashion forums & community blogs instead)
const COMMUNITY_FEEDS = [
  { name: "Business of Fashion",  url: "https://www.businessoffashion.com/feed/",       category: "trending", limit: 3 },
  { name: "Fashionista",          url: "https://fashionista.com/.rss",                  category: "auto",     limit: 3 },
  { name: "Refinery29",           url: "https://www.refinery29.com/en-us/fashion/feed", category: "trending", limit: 3 },
  { name: "Who What Wear",        url: "https://www.whowhatwear.com/rss",               category: "trending", limit: 3 },
];

const ALL_FEEDS = [...MAINSTREAM_FEEDS, ...UNDERGROUND_FEEDS, ...DISCOVERY_FEEDS, ...COMMUNITY_FEEDS];

// ── Drop keywords ─────────────────────────────────────────────────────────────
const DROP_KEYWORDS = [
  "drop", "collab", "collaboration", "capsule", "limited edition",
  "new collection", "launch", "restock", "just dropped", "now available",
  "pre-order", "preorder", "available now", "on sale", "release",
  "fw20", "fw21", "fw22", "fw23", "fw24", "fw25",
  "ss20", "ss21", "ss22", "ss23", "ss24", "ss25",
  "resort", "pre-fall", "lookbook", "debut",
];

// ── Sneaker keywords — these stories sort to the bottom ──────────────────────
const SNEAKER_KEYWORDS = [
  "sneaker", "sneakers", "trainer", "trainers",
  "air max", "air jordan", "yeezy", "dunk", "jordan",
  "nike sb", "air force", "colorway", "sole", "midsole",
];

// ── Music-only filters — skip these entirely ──────────────────────────────────
const MUSIC_FILTERS = [
  "new album", "debut album", "studio album", "new single", "music video",
  "tour dates", "on tour", "grammy", "billboard chart", "spotify",
  "new song", "rap song", "new track", "listen to", "stream now",
  "concert review", "festival lineup", "music festival",
];

// ── Per-story tag detection ───────────────────────────────────────────────────
// Pools (in priority order — first match wins):
//   trend forecast · collab · emerging · runway · industry · street style · editorial
function detectTag(title, desc, source) {
  const text = `${title} ${desc}`.toLowerCase();

  if (/trend forecast|next trend|will be trending|next big thing|going to be the next|style prediction|what to wear (this|next)|predicted to be/i.test(text) ||
      ["Next Trend", "Trend Forecast", "Trending Piece"].includes(source)) {
    return "trend forecast";
  }

  if (/\bcollab(oration)?\b/.test(text) || / x /.test(title)) {
    return "collab";
  }

  if (/emerging brand|independent designer|underground brand|rising designer|up.and.coming|small brand|new label|debut collection/i.test(text) ||
      ["Emerging Brands", "Independent Designers", "Underground Streetwear", "Small Brand Buzz", "Rising Designers"].includes(source)) {
    return "emerging";
  }

  if (/runway|fashion week|resort collection|pre.fall|lookbook|spring.summer 2\d|fall.winter 2\d/i.test(text)) {
    return "runway";
  }

  if (/acqui|revenue|\bbillion\b|\bmillion\b|\bCEO\b|IPO|lawsuit|merger|bankruptcy|valuation/i.test(text) ||
      ["WWD", "Business of Fashion"].includes(source)) {
    return "industry";
  }

  if (/street style|off.duty|spotted wearing|street fashion/i.test(text)) {
    return "street style";
  }

  if (["AnOther", "Document Journal", "Wonderland", "i-D", "Dazed", "Fucking Young", "032c"].includes(source)) {
    return "editorial";
  }

  return null;
}

function isMusicOnly(title, desc) {
  const t = `${title} ${desc}`.toLowerCase();
  return MUSIC_FILTERS.some((kw) => t.includes(kw));
}

function isDropStory(title, desc) {
  const t = `${title} ${desc}`.toLowerCase();
  return DROP_KEYWORDS.some((kw) => t.includes(kw));
}

function isSneakerHeavy(title, desc) {
  const t = `${title} ${desc}`.toLowerCase();
  return SNEAKER_KEYWORDS.some((kw) => t.includes(kw));
}

// Reject known generic/placeholder images
function isGenericImage(url) {
  if (!url) return true;
  const blocked = [
    "google.com",
    "googleapis.com",
    "gstatic.com",
    "googleusercontent.com",
    "placeholder",
    "default-image",
    "no-image",
    "noimage",
    "fallback",
    "generic",
    "logo",
  ];
  const lower = url.toLowerCase();
  return blocked.some((b) => lower.includes(b));
}

function extractImage(item) {
  const candidates = [
    item.mediaContent?.$?.url,
    item.mediaThumbnail?.$?.url,
    item.enclosure?.url,
    (() => { const m = (item.content || item.summary || "").match(/<img[^>]+src=["']([^"']+)["']/i); return m?.[1]; })(),
  ];
  return candidates.find((u) => u && !isGenericImage(u)) ?? null;
}

async function fetchOGImage(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; needlenews-bot/1.0)" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (!match) return null;
    const img = match[1];
    return isGenericImage(img) ? null : img;
  } catch {
    return null;
  }
}

async function fillMissingImages(stories, concurrency = 8) {
  const missing = stories.filter((s) => !s.image);
  if (!missing.length) return;

  process.stdout.write(`  Filling ${missing.length} missing images...`);

  // Process in batches to limit concurrency
  for (let i = 0; i < missing.length; i += concurrency) {
    const batch = missing.slice(i, i + concurrency);
    const results = await Promise.all(batch.map((s) => fetchOGImage(s.link)));
    results.forEach((img, j) => { if (img) batch[j].image = img; });
    process.stdout.write(".");
  }
  console.log(" ✓");
}

function cleanDescription(text) {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .trim()
    .slice(0, 280);
}

// ── Main fetch ────────────────────────────────────────────────────────────────
async function fetchAll() {
  const trending = [];
  const drops    = [];
  const seen     = new Set();

  const layers = [
    { label: "Mainstream publications", feeds: MAINSTREAM_FEEDS },
    { label: "Underground blogs",       feeds: UNDERGROUND_FEEDS },
    { label: "Discovery searches",      feeds: DISCOVERY_FEEDS },
    { label: "Community & culture",      feeds: COMMUNITY_FEEDS },
  ];

  for (const { label, feeds } of layers) {
    console.log(`\n  ── ${label}`);
    for (const feed of feeds) {
      process.stdout.write(`     ${feed.name}... `);
      try {
        const parsed = await parser.parseURL(feed.url);

        for (const item of parsed.items.slice(0, feed.limit)) {
          if (!item.title || !item.link) continue;
          if (seen.has(item.link))       continue;
          seen.add(item.link);

          const desc = cleanDescription(item.contentSnippet || item.summary || "");
          if (isMusicOnly(item.title, desc)) continue;

          const story = {
            id:          Buffer.from(item.link).toString("base64").slice(0, 16),
            title:       item.title.trim(),
            description: desc,
            link:        item.link,
            source:      feed.name,
            publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
            image:       extractImage(item),
            tag:         detectTag(item.title.trim(), desc, feed.name),
          };

          const isDrop =
            feed.category === "drops" ||
            (feed.category === "auto" && isDropStory(story.title, story.description));

          if (isDrop) drops.push(story);
          else        trending.push(story);
        }

        console.log("✓");
      } catch (err) {
        console.log(`✗ (${err.message})`);
      }
    }
  }

  // Fill missing images via OG scraping (runs in parallel, 8 at a time)
  console.log("");
  await fillMissingImages([...trending, ...drops]);

  // Clothing first, sneaker-heavy last, then by date within each group
  const byDate = (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt);
  const sneakerLast = (a, b) => {
    const aSneak = isSneakerHeavy(a.title, a.description);
    const bSneak = isSneakerHeavy(b.title, b.description);
    if (aSneak && !bSneak) return 1;
    if (!aSneak && bSneak) return -1;
    return byDate(a, b);
  };

  trending.sort(sneakerLast);
  drops.sort(sneakerLast);

  const output = {
    lastUpdated: new Date().toISOString(),
    trending:    trending.slice(0, 50),
    drops:       drops.slice(0, 50),
  };

  const dataDir = path.join(__dirname, "../public/data");
  fs.mkdirSync(dataDir, { recursive: true });

  // Save dated archive file
  const today = new Date().toISOString().split("T")[0]; // e.g. "2026-05-14"
  const datedPath = path.join(dataDir, `${today}.json`);
  fs.writeFileSync(datedPath, JSON.stringify(output, null, 2));

  // Keep news.json as latest for any fallback readers
  fs.writeFileSync(path.join(dataDir, "news.json"), JSON.stringify(output, null, 2));

  // Update index.json (page registry)
  const indexPath = path.join(dataDir, "index.json");
  let index = { pages: [] };
  if (fs.existsSync(indexPath)) {
    try { index = JSON.parse(fs.readFileSync(indexPath, "utf-8")); } catch {}
  }

  // Add today if not already present
  const known = new Set(index.pages.map((p) => p.date));
  if (!known.has(today)) {
    index.pages.push({ date: today, file: `${today}.json` });
  }

  // Sort newest first, re-number pages
  index.pages.sort((a, b) => b.date.localeCompare(a.date));
  index.pages = index.pages.map((p, i) => ({ ...p, page: i + 1 }));

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));

  console.log(`\n✓ ${output.trending.length} trending · ${output.drops.length} drops`);
  console.log(`  Archived to public/data/${today}.json (page ${index.pages[0].page})`);
  console.log(`  Total pages in index: ${index.pages.length}`);
  console.log(`  ${new Date().toLocaleString()}`);
}

console.log("\nNeedleNews — fetching news...\n");
fetchAll().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
