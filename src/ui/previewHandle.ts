/**
 * The shop / thumbnail renderer (pipPreview) is a lazy chunk: `loadPreview()` fetches it in the background after
 * the first level is on screen; until then `preview()` is null and callers fall back to plain icons.
 */
type Mod = typeof import('./pipPreview');
let mod: Mod | null = null;
let loading: Promise<void> | null = null;
export const loadPreview = () => (loading ??= import('./pipPreview').then((m) => void (mod = m)).catch(() => {}));
export const preview = () => mod?.sharedPreview() ?? null;
