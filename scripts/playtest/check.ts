// Static checks: reachability of cookies, keys, bed from the start (with/without keys).
import { getLevel } from '../../src/levels/all';
import { distanceField, walkable } from '../../src/game/grid';
const only = process.argv[2];
for (let h = 0; h < 5; h++)
  for (let i = 0; i < 12; i++) {
    if (only && only !== `${h}-${i}`) continue;
    const L = getLevel(h, i);
    const pass = walkable(L, false);
    const E = { eh: L.eh.slice(), ev: L.ev.slice() };
    const f0 = distanceField(L, E, pass, L.start);
    const open = { eh: L.eh.map((v) => (v === 3 ? 2 : v)), ev: L.ev.map((v) => (v === 3 ? 2 : v)) };
    const f1 = distanceField(L, open, pass, L.start);
    const reach = (f: Float32Array, p: { x: number; z: number }, solid = false) => {
      if (!solid) return f[Math.floor(p.z) * L.w + Math.floor(p.x)] < Infinity;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = Math.floor(p.x) + dx, z = Math.floor(p.z) + dz;
        if (x >= 0 && z >= 0 && x < L.w && z < L.d && f[z * L.w + x] < Infinity) return true;
      }
      return false;
    };
    const probs: string[] = [];
    const keyOk = L.keys.some((k) => reach(f0, k));
    const f = keyOk ? f1 : f0;
    L.cookies.forEach((c, k) => { if (!reach(f, c, c.onSolid)) probs.push(`cookie${k}@${c.x - 0.5},${c.z - 0.5} unreachable`); });
    L.keys.forEach((k) => { if (!reach(f0, k)) probs.push(`key@${k.x - 0.5},${k.z - 0.5} unreachable`); });
    L.pillows.forEach((k) => { if (!reach(f, k)) probs.push(`pillow unreachable`); });
    const b = L.bed;
    let bedOk = false;
    for (let z = b.z0 - 1; z <= b.z1; z++) for (let x = b.x0 - 1; x <= b.x1; x++) if (x >= 0 && z >= 0 && x < L.w && z < L.d && f[z * L.w + x] < Infinity && ((x >= b.x0 && x < b.x1) || (z >= b.z0 && z < b.z1))) bedOk = true;
    if (!bedOk) probs.push('bed unreachable');
    L.guards.forEach((g, gi) => g.path.forEach((p) => { const c = Math.floor(p.z) * L.w + Math.floor(p.x); if (L.solid[c] && !g.sleep) probs.push(`guard${gi} point ${p.x - 0.5},${p.z - 0.5} on solid`); }));
    if (probs.length || only) {
      console.log(L.id, probs.join('; '));
      if (only) for (let z = 0; z < L.d; z++) { let r = ''; for (let x = 0; x < L.w; x++) { const c = z * L.w + x; r += L.room[c] < 0 ? ' ' : L.solid[c] ? '#' : L.hide[c] ? 'h' : f[c] < Infinity ? '.' : 'x'; } console.log('   ' + r); }
    }
  }
