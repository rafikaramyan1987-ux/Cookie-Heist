/**
 * Lazy chunks (houses 2–5, the title scene, languages, the shop renderer, extra sounds) are loaded with retries.
 * A chunk request can fail on a flaky connection; an unhandled failed `import()` is an unhandled promise rejection
 * (the CrazyGames SDK reports every one as a crash), and the next steps of the game wait for it.
 *
 * Measured (docs/crash-investigation.md): after one failed `import()` of a URL, Chromium keeps returning the same
 * failure for that URL for the life of the page (the module map caches it); WebKit and Firefox fetch again. So the
 * first retry imports the same URL (WebKit / Firefox), the later ones the chunk URL from the error message with a
 * `?retry=n` query (Chromium puts the URL in the message: a new module-map entry, a fresh request).
 */

/** waits before the retries (ms); `importRetry` tries `RETRY_DELAYS.length + 1` times in all */
export const RETRY_DELAYS = [300, 1200, 3000];

const URL_IN_MESSAGE = /(https?:\/\/[^\s'"]+?\.js)(?=[\s'"]|$)/;

/** the chunk URL in a failed dynamic import's error message (Chromium / Firefox), or null (WebKit) */
export function failedChunkUrl(e: unknown): string | null {
  const m = e instanceof Error || (e && typeof e === 'object' && 'message' in e) ? String((e as { message: unknown }).message) : String(e);
  const u = URL_IN_MESSAGE.exec(m);
  return u ? u[1] : null;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * `load()` (a `() => import('./chunk')`), retried on failure. Rejects only after every retry failed (callers
 * handle that: the game plays on without the chunk). Never leaves a rejection unhandled by itself.
 */
export async function importRetry<T>(load: () => Promise<T>, delays: number[] = RETRY_DELAYS): Promise<T> {
  let err: unknown;
  let url: string | null = null;
  for (let n = 0; n <= delays.length; n++) {
    if (n > 0) await wait(delays[n - 1]);
    try {
      if (n >= 2 && url) return (await import(/* @vite-ignore */ `${url}?retry=${n}`)) as T;
      return await load();
    } catch (e) {
      err = e;
      url ??= failedChunkUrl(e);
    }
  }
  throw err;
}
