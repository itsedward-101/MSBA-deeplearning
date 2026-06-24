import { useCallback, useState } from "react";

const VIBE_API_URL = "/api/vibe";

const SLIDERS = [
  { key: "mood", label: "Mood", left: "Dark", right: "Light" },
  { key: "pace", label: "Pace", left: "Slow", right: "Fast" },
  { key: "depth", label: "Depth", left: "Surface", right: "Intense" },
];

const DEFAULT_SLIDER = { mood: 42, pace: 38, depth: 67 };

/**
 * Normalizes API JSON (handles minor shape drift).
 */
function normalizeVibePayload(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    book: raw.book ?? {},
    movie: raw.movie ?? {},
    place: raw.place ?? {},
    place_image: raw.place_image ?? {},
    music: raw.music ?? {},
    mood_tags: Array.isArray(raw.mood_tags) ? raw.mood_tags : [],
    tone: typeof raw.tone === "string" ? raw.tone : "",
    why_this_matches: typeof raw.why_this_matches === "string" ? raw.why_this_matches : "",
  };
}

export default function App() {
  const [title, setTitle] = useState("");
  const [sliders, setSliders] = useState(DEFAULT_SLIDER);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vibe, setVibe] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  const onSlide = useCallback((key, v) => {
    setSliders((s) => ({ ...s, [key]: v }));
  }, []);

  const runVibe = useCallback(async () => {
    if (loading) return;
    setStarted(true);
    setLoading(true);
    setFetchError(null);
    setVibe(null);

    const body = {
      book_title: title.trim(),
      mood: sliders.mood,
      pace: sliders.pace,
      depth: sliders.depth,
    };

    try {
      const res = await fetch(VIBE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error("The server returned invalid JSON.");
      }

      if (!res.ok) {
        const isObj = data && typeof data === "object";

        if (
          res.status === 400 &&
          isObj &&
          Object.prototype.hasOwnProperty.call(data, "error")
        ) {
          const raw = data.error;
          const errText =
            typeof raw === "string"
              ? raw.trim()
              : raw != null && raw !== ""
                ? String(raw).trim()
                : "";
          if (errText) {
            setFetchError({ kind: "api400", message: errText });
            return;
          }
        }

        const msg =
          (isObj && data.message != null && String(data.message).trim()) ||
          (isObj && data.error != null && String(data.error).trim()) ||
          text.slice(0, 200) ||
          `Request failed (${res.status})`;
        throw new Error(String(msg || `Request failed (${res.status})`));
      }

      const normalized = normalizeVibePayload(data);
      if (!normalized) {
        throw new Error("Unexpected response shape from the vibe API.");
      }
      setVibe(normalized);
    } catch (e) {
      setFetchError({
        kind: "general",
        message: e instanceof Error ? e.message : "Something went wrong.",
      });
    } finally {
      setLoading(false);
    }
  }, [loading, title, sliders.mood, sliders.pace, sliders.depth]);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-ink)]">
      <main className="mx-auto max-w-[900px] px-5 py-12 sm:px-8 sm:py-16">
        <header className="text-center">
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-[2.75rem]">
            ShelfCare
          </h1>
          <p className="mt-3 text-lg text-[var(--color-muted)] sm:text-xl">
            Enter a book. Get a whole vibe.
          </p>
        </header>

        <label htmlFor="book" className="sr-only">
          Book title
        </label>
        <input
          id="book"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Gone Girl"
          className="mt-10 w-full rounded-xl border border-stone-200/90 bg-[var(--color-paper)] px-5 py-4 text-base shadow-sm outline-none ring-amber-900/10 transition placeholder:text-stone-400 focus:border-amber-800/40 focus:ring-2"
        />

        <div className="mt-10 space-y-8">
          {SLIDERS.map(({ key, label, left, right }) => (
            <div key={key}>
              <div className="mb-2 flex items-baseline justify-between gap-2 text-xs font-medium uppercase tracking-wider text-stone-500">
                <span>
                  {label} ({left} ←→ {right})
                </span>
                <span className="tabular-nums text-sm font-semibold text-amber-800">
                  {sliders[key]}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={sliders[key]}
                onChange={(e) => onSlide(key, Number(e.target.value))}
                className="h-2 w-full cursor-pointer rounded-full bg-stone-200 accent-amber-700"
                aria-label={`${label}: ${left} to ${right}`}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={runVibe}
          disabled={loading}
          className="mt-12 w-full rounded-xl bg-gradient-to-b from-amber-700 to-amber-800 py-4 text-base font-medium tracking-wide text-white shadow-[var(--shadow-card)] transition hover:from-amber-600 hover:to-amber-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-amber-900/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)] disabled:cursor-not-allowed disabled:opacity-85"
        >
          Get My Vibe →
        </button>

        {started && (
          <section className="mt-16 border-t border-stone-200/80 pt-16" aria-live="polite">
            {loading && (
              <div className="flex flex-col items-center py-8">
                <div
                  className="h-10 w-10 animate-spin rounded-full border-2 border-stone-200 border-t-amber-700"
                  role="status"
                  aria-label="Loading"
                />
                <p className="mt-6 font-display text-lg italic text-[var(--color-muted)]">
                  Curating your vibe…
                </p>
              </div>
            )}

            {fetchError && !loading && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200/90 bg-red-50/90 px-5 py-4 text-center text-sm text-red-900"
              >
                {fetchError.kind === "api400" ? (
                  <p className="font-medium text-red-800">{fetchError.message}</p>
                ) : (
                  <>
                    <p className="font-medium text-red-900">Could not load your vibe</p>
                    <p className="mt-2 text-red-800/90">{fetchError.message}</p>
                  </>
                )}
              </div>
            )}

            {vibe && !loading && (
              <Dashboard data={vibe} />
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function Dashboard({ data }) {
  const { book, movie, place, place_image, music, mood_tags, tone, why_this_matches } =
    data;

  const headline =
    place?.name && place?.country
      ? `${place.name}, ${place.country}`
      : place?.name || place?.country || "Your place";

  const spotifyHref =
    music?.spotify_query?.trim?.() &&
    `https://open.spotify.com/search/${encodeURIComponent(music.spotify_query.trim())}`;

  const coverAlt = book?.title ? `Cover: ${book.title}` : "Book cover";
  const posterAlt = movie?.title ? `Poster: ${movie.title}` : "Movie poster";
  const placeAlt = place?.name
    ? `Photo: ${place.name}`
    : "Place illustration";

  return (
    <div className="space-y-10">
      <figure className="overflow-hidden rounded-2xl border border-stone-200/90 bg-[var(--color-paper)] shadow-[var(--shadow-card)]">
        <div className="relative aspect-[900/280] max-h-[280px] w-full bg-stone-200">
          {place_image?.image_url ? (
            <img
              src={place_image.image_url}
              alt={placeAlt}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted)]">
              No image
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/85 via-transparent to-stone-900/10" />
          <figcaption className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <p className="font-display text-3xl text-white sm:text-4xl">{headline}</p>
            {place?.vibe ? (
              <p className="mt-2 font-display text-sm italic text-white/80 sm:text-base">
                {place.vibe}
              </p>
            ) : null}
          </figcaption>
        </div>
        {why_this_matches ? (
          <p className="px-6 py-5 text-center font-display text-lg italic leading-relaxed text-[var(--color-muted)] sm:text-xl">
            {why_this_matches}
          </p>
        ) : null}
        {place_image?.photographer ? (
          <p className="border-t border-stone-100 px-6 pb-5 text-center text-xs text-[var(--color-muted)]">
            Photo: {place_image.photographer}
          </p>
        ) : null}
      </figure>

      <div className="grid gap-6 sm:grid-cols-3">
        <Card kicker="Book">
          <div className="mx-auto mb-4 overflow-hidden rounded-lg shadow-sm ring-1 ring-stone-900/5">
            {book?.cover_url ? (
              <img
                src={book.cover_url}
                alt={coverAlt}
                width={120}
                height={180}
                className="h-[180px] w-[120px] object-cover"
              />
            ) : (
              <div className="flex h-[180px] w-[120px] items-center justify-center bg-stone-100 text-xs text-[var(--color-muted)]">
                No cover
              </div>
            )}
          </div>
          <h3 className="text-center font-display text-lg font-semibold">
            {book?.title ?? "—"}
          </h3>
          <p className="mt-1 text-center text-sm text-[var(--color-muted)]">
            {[book?.author, book?.year].filter(Boolean).join(" · ") || "—"}
          </p>
        </Card>

        <Card kicker="Movie">
          <div className="mx-auto mb-4 overflow-hidden rounded-lg shadow-sm ring-1 ring-stone-900/5">
            {movie?.poster_url ? (
              <img
                src={movie.poster_url}
                alt={posterAlt}
                width={120}
                height={180}
                className="h-[180px] w-[120px] object-cover"
              />
            ) : (
              <div className="flex h-[180px] w-[120px] items-center justify-center bg-stone-100 text-xs text-[var(--color-muted)]">
                No poster
              </div>
            )}
          </div>
          <h3 className="text-center font-display text-base font-semibold leading-snug">
            {movie?.title ?? "—"}
          </h3>
          {movie?.year != null ? (
            <p className="mt-2 text-center text-sm tabular-nums text-[var(--color-muted)]">
              {movie.year}
            </p>
          ) : null}
          {movie?.overview ? (
            <p className="mt-3 line-clamp-5 text-center text-xs leading-relaxed text-[var(--color-muted)]">
              {movie.overview}
            </p>
          ) : null}
        </Card>

        <Card kicker="Music">
          <h3 className="mb-3 text-center font-display text-lg font-semibold">
            {music?.playlist_name ?? "Playlist"}
          </h3>
          {music?.spotify_query?.trim?.() ? (
            <div className="rounded-lg bg-[var(--color-canvas)] px-3 py-3 text-center text-sm">
              <p className="font-medium">{music.spotify_query.trim()}</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">Open in Spotify search</p>
              {spotifyHref ? (
                <a
                  href={spotifyHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block rounded-lg border border-amber-800/40 bg-amber-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-amber-900"
                >
                  Search Spotify
                </a>
              ) : null}
            </div>
          ) : (
            <p className="text-center text-sm text-[var(--color-muted)]">
              No playlist metadata returned.
            </p>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {mood_tags.length > 0 ? (
          mood_tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-stone-200/90 bg-[var(--color-paper)] px-3.5 py-1.5 text-xs font-medium text-stone-700 shadow-sm"
            >
              {t}
            </span>
          ))
        ) : (
          <span className="text-sm text-[var(--color-muted)]">No mood tags.</span>
        )}
      </div>

      <p className="text-center text-sm text-[var(--color-muted)]">
        Tone —{" "}
        {tone ? (
          <span className="font-medium text-[var(--color-ink)]">&ldquo;{tone}&rdquo;</span>
        ) : (
          <span className="text-[var(--color-muted)]">—</span>
        )}
      </p>
    </div>
  );
}

function Card({ kicker, children }) {
  return (
    <article className="flex flex-col rounded-2xl border border-stone-200/90 bg-[var(--color-paper)] p-6 shadow-[var(--shadow-card)]">
      <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
        {kicker}
      </p>
      {children}
    </article>
  );
}
