// Shared "human player" driver for Playwright: drags the virtual joystick like a person would (real pointer
// events on the canvas), steering the kid through world-space waypoints. Used by the e2e tutorial test and the
// first-minute video.

/** screen direction (unit vector) from the kid towards world point (x, z), and the remaining distance in cells */
export async function aim(page, x, z) {
  return page.evaluate(
    ([x, z]) => {
      const g = window.__game;
      const p = g.run.world.player;
      const a = g.screen(p.x, 0.5, p.z);
      const b = g.screen(x, 0.5, z);
      const dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.hypot(dx, dy) || 1;
      return { dx: dx / d, dy: dy / d, dist: Math.hypot(x - p.x, z - p.z), hidden: p.hidden, status: g.run.world.status, mode: g.mode };
    },
    [x, z],
  );
}

/**
 * Walk through waypoints. `step(dt)` advances the game one frame (and may screenshot). The finger goes down at
 * `origin` and stays down, moving the knob at ~55 % of the ring (tiptoe).
 */
export async function walk(page, pts, step, { origin, maxFrames = 900, reach = 0.18 } = {}) {
  const vp = page.viewportSize();
  const o = origin ?? { x: vp.width * 0.5, y: vp.height * 0.72 };
  const R = await page.evaluate(() => window.__game.input.radius);
  await page.mouse.move(o.x, o.y);
  await page.mouse.down();
  let frames = 0;
  for (const [x, z] of pts) {
    for (;;) {
      const a = await aim(page, x, z);
      if (a.dist < reach || a.status !== 'play' || frames++ > maxFrames) break;
      await page.mouse.move(o.x + a.dx * R * 0.55, o.y + a.dy * R * 0.55);
      await step(1 / 30);
    }
  }
  await page.mouse.move(o.x, o.y);
  await page.mouse.up();
  return frames <= maxFrames;
}

/** advance `n` frames without input */
export async function idle(page, seconds, step) {
  for (let i = 0; i < Math.round(seconds * 30); i++) await step(1 / 30);
}

/** the tutorial route on night 1: basket → (mum sweeps by) → cookie jar → bed */
export const TUTORIAL = {
  basket: [[4.5, 6.5]],
  cookie: [
    [1.5, 5.5],
    [1.5, 3.4],
    [0.75, 1.4],
  ],
  bed: [
    [1.5, 3.4],
    [1.5, 5.2],
    [0.6, 5.6],
  ],
};
