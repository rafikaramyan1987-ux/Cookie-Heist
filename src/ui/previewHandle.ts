import { importRetry } from '../app/lazy';
/**
 * The shop / thumbnail renderer (pipPreview) is a lazy chunk: `loadPreview()` fetches it in the background after
 * the first level is on screen; until then `preview()` is null and callers fall back to plain icons.
 */
type Mod = typeof import('./pipPreview');
let mod: Mod | null = null;
let loading: Promise<void> | null = null;
/** the shop / boost-thumbnail renderer (with retries); never rejects: without it the shop shows no 3D previews */
export const loadPreview = () =>
  (loading ??= importRetry(() => import('./pipPreview')).then(
    (m) => void (mod = m),
    () => void (loading = null),
  ));
export const preview = () => mod?.sharedPreview() ?? null;
