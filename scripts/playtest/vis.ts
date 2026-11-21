import { getLevel, ALL_LEVELS } from "../../src/levels/all";
import {
  hiddenRequiredCookies,
  cookieOccluded,
} from "../../src/game/visibility";
for (const [h, i] of ALL_LEVELS) {
  const L = getLevel(h, i);
  const bad = hiddenRequiredCookies(L);
  const west = L.cookies
    .map((_, k) => k)
    .filter((k) => cookieOccluded(L, k, "west"));
  if (bad.length || west.length)
    console.log(
      L.id,
      "bonus",
      L.bonus,
      "hidden(south):",
      bad
        .map((k) => `${L.cookies[k].x - 0.5},${L.cookies[k].z - 0.5}`)
        .join(" "),
      "| west:",
      west
        .map((k) => `${L.cookies[k].x - 0.5},${L.cookies[k].z - 0.5}`)
        .join(" "),
    );
}
