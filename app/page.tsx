import fs from "fs";
import path from "path";
import Link from "next/link";

interface Story {
  id: string;
  title: string;
  description: string;
  link: string;
  source: string;
  publishedAt: string;
  image: string | null;
  tag?: string | null;
}

interface NewsData {
  lastUpdated: string | null;
  trending: Story[];
  drops: Story[];
}

interface PageEntry {
  page: number;
  date: string;
  file: string;
}

interface PageIndex {
  pages: PageEntry[];
}

function getIndex(): PageIndex {
  const indexPath = path.join(process.cwd(), "public/data/index.json");
  if (!fs.existsSync(indexPath)) return { pages: [] };
  try { return JSON.parse(fs.readFileSync(indexPath, "utf-8")); } catch { return { pages: [] }; }
}

function getNews(pageNum: number): { news: NewsData; entry: PageEntry | null } {
  const index = getIndex();
  const entry = index.pages.find((p) => p.page === pageNum) ?? index.pages[0] ?? null;

  if (!entry) return { news: { lastUpdated: null, trending: [], drops: [] }, entry: null };

  const filePath = path.join(process.cwd(), "public/data", entry.file);
  if (!fs.existsSync(filePath)) {
    // fallback to news.json
    const fallback = path.join(process.cwd(), "public/data/news.json");
    if (!fs.existsSync(fallback)) return { news: { lastUpdated: null, trending: [], drops: [] }, entry };
    try { return { news: JSON.parse(fs.readFileSync(fallback, "utf-8")), entry }; } catch {}
  }
  try { return { news: JSON.parse(fs.readFileSync(filePath, "utf-8")), entry }; }
  catch { return { news: { lastUpdated: null, trending: [], drops: [] }, entry }; }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

// ── Story image wrapper ──────────────────────────────────────────────────────
function StoryImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`overflow-hidden bg-rule ${className ?? ""} story-img-wrap`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full h-full object-cover story-img" />
    </div>
  );
}

// ── Source pill ──────────────────────────────────────────────────────────────
const TAG_STYLES: Record<string, string> = {
  "trend forecast": "text-amber-600 border-amber-400",
  "collab":         "text-violet-600 border-violet-400",
  "emerging":       "text-emerald-600 border-emerald-500",
  "runway":         "text-ink border-ink",
  "industry":       "text-blue-600 border-blue-400",
  "street style":   "text-stone-500 border-stone-400",
  "editorial":      "text-rose-500 border-rose-400",
};

function Meta({ source, publishedAt, tag }: { source: string; publishedAt: string; tag?: string | null }) {
  const tagStyle = tag ? (TAG_STYLES[tag] ?? "text-muted border-rule") : null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tag && (
        <span className={`font-body text-[9px] uppercase tracking-[0.15em] font-semibold
                          border px-1.5 py-0.5 leading-none ${tagStyle}`}>
          {tag}
        </span>
      )}
      <p className="font-body text-[10px] uppercase tracking-[0.15em] text-muted font-medium">
        {source} <span className="text-rule mx-1">·</span> {timeAgo(publishedAt)}
      </p>
    </div>
  );
}

// ── Hero story ───────────────────────────────────────────────────────────────
function HeroStory({ story }: { story: Story }) {
  return (
    <a href={story.link} target="_blank" rel="noopener noreferrer"
       className="group block">
      <div className={`grid gap-0 ${story.image ? "md:grid-cols-2" : "grid-cols-1"}`}>
        {story.image && (
          <StoryImage src={story.image} alt={story.title} className="h-64 md:h-[420px]" />
        )}
        <div className={`flex flex-col justify-between py-6 ${story.image ? "md:pl-10" : ""}`}>
          <div>
            <Meta source={story.source} publishedAt={story.publishedAt} tag={story.tag} />
            <h2 className="font-display text-4xl md:text-5xl font-normal italic leading-[1.1] mt-3 mb-4 story-link">
              {story.title}
            </h2>
            {story.description && (
              <p className="font-body text-sm text-muted leading-relaxed line-clamp-3">
                {story.description}
              </p>
            )}
          </div>
          <span className="font-body text-xs uppercase tracking-widest text-ink mt-6 font-medium
                           opacity-0 group-hover:opacity-100 transition-opacity">
            Read →
          </span>
        </div>
      </div>
    </a>
  );
}

// ── Secondary story card ─────────────────────────────────────────────────────
function StoryCard({ story }: { story: Story }) {
  return (
    <a href={story.link} target="_blank" rel="noopener noreferrer"
       className="group flex flex-col gap-3">
      {story.image && (
        <StoryImage src={story.image} alt={story.title} className="h-44" />
      )}
      <div>
        <Meta source={story.source} publishedAt={story.publishedAt} tag={story.tag} />
        <h3 className="font-display text-xl md:text-2xl font-normal italic leading-snug mt-1.5 story-link">
          {story.title}
        </h3>
        {story.description && (
          <p className="font-body text-xs text-muted leading-relaxed mt-1.5 line-clamp-2">
            {story.description}
          </p>
        )}
      </div>
    </a>
  );
}

// ── Drop card ────────────────────────────────────────────────────────────────
function DropCard({ story }: { story: Story }) {
  return (
    <a href={story.link} target="_blank" rel="noopener noreferrer"
       className="group flex flex-col gap-2.5 border-t border-rule pt-4">
      {story.image && (
        <StoryImage src={story.image} alt={story.title} className="h-36" />
      )}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-body text-[9px] uppercase tracking-[0.15em] font-semibold
                           text-red border border-red px-1.5 py-0.5">
            Drop
          </span>
          <span className="font-body text-[10px] uppercase tracking-[0.1em] text-muted font-medium">
            {story.source} · {timeAgo(story.publishedAt)}
          </span>
        </div>
        <h3 className="font-display text-lg font-normal italic leading-snug story-link">
          {story.title}
        </h3>
        {story.description && (
          <p className="font-body text-xs text-muted leading-relaxed mt-1 line-clamp-2">
            {story.description}
          </p>
        )}
      </div>
    </a>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="py-24 text-center">
      <p className="font-display text-3xl italic text-muted mb-4">No stories yet.</p>
      <p className="font-body text-sm text-muted mb-2">Run the fetch script to pull today&apos;s news:</p>
      <code className="font-body text-sm bg-rule px-3 py-1.5 rounded">npm run fetch</code>
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ current, total }: { current: number; total: number }) {
  if (total <= 1) return null;

  // Build page number list with ellipsis
  const pages: (number | "...")[] = [];
  const delta = 2;
  const left  = Math.max(1, current - delta);
  const right = Math.min(total, current + delta);

  if (left > 1)     { pages.push(1); if (left > 2) pages.push("..."); }
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < total) { if (right < total - 1) pages.push("..."); pages.push(total); }

  const linkClass = (active: boolean) =>
    `font-body text-[11px] font-medium w-8 h-8 flex items-center justify-center border transition-colors
     ${active
       ? "border-ink bg-ink text-cream"
       : "border-rule text-muted hover:border-ink hover:text-ink"}`;

  return (
    <div className="flex items-center justify-center gap-1.5 py-12">
      {current > 1 && (
        <Link href={`/?page=${current - 1}`}
              className="font-body text-[11px] font-medium px-3 h-8 flex items-center border border-rule
                         text-muted hover:border-ink hover:text-ink transition-colors">
          ← Prev
        </Link>
      )}

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`}
                className="font-body text-[11px] text-muted w-6 text-center">
            …
          </span>
        ) : (
          <Link key={p} href={`/?page=${p}`} className={linkClass(p === current)}>
            {p}
          </Link>
        )
      )}

      {current < total && (
        <Link href={`/?page=${current + 1}`}
              className="font-body text-[11px] font-medium px-3 h-8 flex items-center border border-rule
                         text-muted hover:border-ink hover:text-ink transition-colors">
          Next →
        </Link>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function Home({ searchParams }: { searchParams: { page?: string } }) {
  const currentPage = Math.max(1, parseInt(searchParams.page || "1") || 1);
  const index       = getIndex();
  const totalPages  = index.pages.length || 1;
  const { news, entry } = getNews(currentPage);
  const { trending, drops } = news;
  const [hero, ...rest] = trending;
  const today = news.lastUpdated ? formatDate(news.lastUpdated) : entry?.date ? formatDate(entry.date) : formatDate(new Date().toISOString());
  const isArchive = currentPage > 1;

  return (
    <main className="min-h-screen bg-cream">

      {/* ── Dateline strip ── */}
      <div className="border-b border-rule">
        <div className="max-w-6xl mx-auto px-6 py-2 flex items-center justify-between">
          <p className="font-body text-[10px] uppercase tracking-[0.2em] text-muted">{today}</p>
          <p className="font-body text-[10px] uppercase tracking-[0.2em] text-muted hidden sm:block">
            {isArchive ? `Archive · Page ${currentPage} of ${totalPages}` : "Fashion · Drops · Culture"}
          </p>
          {news.lastUpdated && (
            <p className="font-body text-[10px] uppercase tracking-[0.1em] text-muted">
              {isArchive ? `Page ${currentPage}` : `Updated ${timeAgo(news.lastUpdated)}`}
            </p>
          )}
        </div>
      </div>

      {/* ── Masthead ── */}
      <div className="border-b border-rule">
        <div className="max-w-6xl mx-auto px-6 py-6 md:py-10 text-center">
          <h1 className="font-display font-light italic leading-none tracking-tight
                         text-[3.5rem] sm:text-[5rem] md:text-[7rem] lg:text-[9rem] text-ink">
            fastfashion
          </h1>
        </div>
      </div>

      {/* ── Section nav ── */}
      <div className="border-b border-rule sticky top-0 z-10 bg-cream/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-8 h-10">
          <a href="#trending"
             className="font-body text-[10px] uppercase tracking-[0.2em] font-semibold text-ink
                        hover:text-red transition-colors">
            Trending
          </a>
          <a href="#drops"
             className="font-body text-[10px] uppercase tracking-[0.2em] font-medium text-muted
                        hover:text-ink transition-colors">
            New Drops
          </a>
          <div className="flex-1" />
          <span className="font-body text-[10px] uppercase tracking-[0.1em] text-muted hidden md:block">
            {trending.length + drops.length} stories
          </span>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-16">

        {/* Trending first */}
        <section id="trending">
          <div className="flex items-center gap-4 mb-8">
            <p className="font-body text-[10px] uppercase tracking-[0.25em] font-semibold text-ink">
              Trending Now
            </p>
            <div className="flex-1 h-px bg-rule" />
          </div>

          {!hero && trending.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {hero && (
                <>
                  <HeroStory story={hero} />
                  <div className="h-px bg-rule my-10" />
                </>
              )}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
                  {rest.map((story) => (
                    <StoryCard key={story.id} story={story} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Divider */}
        {drops.length > 0 && trending.length > 0 && <div className="h-px bg-rule" />}

        {/* Drops second */}
        {drops.length > 0 && (
          <section id="drops">
            <div className="flex items-center gap-4 mb-8">
              <p className="font-body text-[10px] uppercase tracking-[0.25em] font-semibold text-red">
                New Drops
              </p>
              <div className="flex-1 h-px bg-red/30" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-0">
              {drops.map((story) => (
                <DropCard key={story.id} story={story} />
              ))}
            </div>
          </section>
        )}

      </div>

      {/* ── Pagination ── */}
      <Pagination current={currentPage} total={totalPages} />

      {/* ── Footer ── */}
      <footer className="border-t border-rule mt-0">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <p className="font-display italic text-lg text-muted">fastfashion</p>
          <p className="font-body text-[10px] uppercase tracking-[0.15em] text-muted">
            {news.lastUpdated ? `Last refreshed ${timeAgo(news.lastUpdated)}` : "No data loaded"}
          </p>
        </div>
      </footer>

    </main>
  );
}
