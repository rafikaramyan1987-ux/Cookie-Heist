import { getLevel } from "../../src/levels/index";
import {
  hiddenRequiredCookies,
  cookieOccluded,
} from "../../src/game/visibility";
for (let h = 0; h < 5; h++)
  for (let i = 0; i < 12; i++) {
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
