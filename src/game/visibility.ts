import type { Level } from "./types";
import { blocks } from "./grid";
import { WALL_HEIGHT, TALL_HEIGHT } from "./constants";

/**
 * Is a cookie hidden from the default camera by a wall or tall furniture?
 * The phone camera looks from the south (+z) at 55°; the desktop camera of tall
 * levels looks from the west (-x). We march from the cookie towards the camera.
 */
export function cookieOccluded(
  L: Level,
  i: number,
  from: "south" | "west" = "south",
  pitchDeg = 55,
): boolean {
  const c = L.cookies[i];
  const y0 = c.onSolid ? 1.05 : 0.48;
  const k = Math.tan((pitchDeg * Math.PI) / 180);
  const dx = from === "west" ? -1 : 0,
    dz = from === "south" ? 1 : 0;
  let cx = Math.floor(c.x),
    cz = Math.floor(c.z);
  for (let s = 0.02; s < 2.5; s += 0.02) {
    const x = c.x + dx * s,
      z = c.z + dz * s;
    const nx = Math.floor(x),
      nz = Math.floor(z);
    const h = y0 + s * k;
    if (h > TALL_HEIGHT) return false;
    if (nx !== cx) {
      const line = Math.max(nx, cx);
      if (
        nz >= 0 &&
        nz < L.d &&
        line >= 0 &&
        line <= L.w &&
        blocks(L.ev[nz * (L.w + 1) + line]) &&
        h < WALL_HEIGHT
      )
        return true;
    }
    if (nz !== cz) {
      const line = Math.max(nz, cz);
      if (
        nx >= 0 &&
        nx < L.w &&
        line >= 0 &&
        line <= L.d &&
        blocks(L.eh[line * L.w + nx]) &&
        h < WALL_HEIGHT
      )
        return true;
    }
    cx = nx;
    cz = nz;
    if (cx < 0 || cz < 0 || cx >= L.w || cz >= L.d) return false;
    if (L.tall[cz * L.w + cx] && h < TALL_HEIGHT) return true;
  }
  return false;
}

/** Required (non-bonus) cookies that the phone camera cannot see. */
export function hiddenRequiredCookies(L: Level): number[] {
  return L.cookies
    .map((_, i) => i)
    .filter((i) => i !== L.bonus && cookieOccluded(L, i, "south"));
}
