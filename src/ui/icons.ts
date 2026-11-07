/** Inline SVG icons (original artwork, drawn in code). */
export const ICONS = {
  cookie: (filled = true) => `
    <svg viewBox="0 0 48 48" class="ic-cookie ${filled ? 'on' : 'off'}">
      <circle cx="24" cy="25" r="19" fill="${filled ? '#8c4a22' : 'rgba(20,12,50,.55)'}"/>
      <circle cx="24" cy="23" r="19" fill="${filled ? '#e9a55a' : 'rgba(255,244,220,.10)'}" stroke="${filled ? '#8c4a22' : 'rgba(255,244,220,.45)'}" stroke-width="2.5" ${filled ? '' : 'stroke-dasharray="5 4"'}/>
      ${
        filled
          ? `<path d="M10 17 Q16 9 26 7" stroke="#ffd59a" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
      <circle cx="17" cy="20" r="3.4" fill="#5a2e1a"/><circle cx="29" cy="15" r="2.8" fill="#5a2e1a"/>
      <circle cx="31" cy="28" r="3.6" fill="#5a2e1a"/><circle cx="20" cy="31" r="2.6" fill="#5a2e1a"/><circle cx="25" cy="23" r="1.8" fill="#5a2e1a"/>`
          : ''
      }
    </svg>`,
  goldCookie: (filled = true) => `
    <svg viewBox="0 0 48 48" class="ic-cookie gold ${filled ? 'on' : 'off'}">
      <circle cx="24" cy="25" r="19" fill="${filled ? '#a8740b' : 'rgba(20,12,50,.55)'}"/>
      <circle cx="24" cy="23" r="19" fill="${filled ? '#ffcf3d' : 'rgba(255,210,94,.12)'}" stroke="${filled ? '#a8740b' : 'rgba(255,210,94,.75)'}" stroke-width="2.5" ${filled ? '' : 'stroke-dasharray="5 4"'}/>
      <path d="M24 12l3.2 6.6 7.2 1-5.2 5 1.3 7.2L24 28.4l-6.5 3.4 1.3-7.2-5.2-5 7.2-1z" fill="${filled ? '#fff6c8' : 'rgba(255,210,94,.75)'}" stroke="${filled ? '#a8740b' : 'none'}" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`,
  bed: `<svg viewBox="0 0 48 48"><rect x="5" y="14" width="6" height="24" rx="2" fill="#8a5434"/><rect x="9" y="24" width="34" height="9" rx="3" fill="#6c8cff"/><rect x="12" y="19" width="10" height="6" rx="3" fill="#fff"/><rect x="40" y="22" width="4" height="16" rx="2" fill="#8a5434"/></svg>`,
  pause: `<svg viewBox="0 0 48 48"><rect x="14" y="12" width="7" height="24" rx="3" fill="currentColor"/><rect x="27" y="12" width="7" height="24" rx="3" fill="currentColor"/></svg>`,
  moon: `<svg viewBox="0 0 48 48"><path d="M31 7a17 17 0 1 0 10 27A15 15 0 0 1 31 7z" fill="#ffe28a"/><circle cx="20" cy="22" r="2.5" fill="#f2c25a"/><circle cx="26" cy="33" r="2" fill="#f2c25a"/></svg>`,
  coin: `<svg viewBox="0 0 48 48"><circle cx="24" cy="26" r="17" fill="#c9861f"/><circle cx="24" cy="23" r="17" fill="#ffd25e" stroke="#c9861f" stroke-width="2.5"/><circle cx="24" cy="23" r="11" fill="none" stroke="#f0a92e" stroke-width="2.5"/><path d="M16 15 Q20 10 27 9" stroke="#fff3c4" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  duck: `<svg viewBox="0 0 64 64">
      <ellipse cx="32" cy="50" rx="20" ry="4" fill="rgba(0,0,0,.18)"/>
      <path d="M12 36 Q12 50 30 50 Q50 50 52 36 Q52 30 44 30 L38 30 Q44 24 42 17 Q38 8 28 10 Q19 12 20 22 Q20 27 24 30 L20 30 Q12 30 12 36z" fill="#ffd43b" stroke="#c98a12" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M41 18 Q50 17 52 21 Q48 25 41 23z" fill="#ff8a3d" stroke="#c9541f" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="33" cy="17" r="3" fill="#2a1a33"/><circle cx="34" cy="16" r="1" fill="#fff"/>
      <path d="M22 38 Q30 44 40 37" stroke="#f0b20f" stroke-width="3" fill="none" stroke-linecap="round"/>
    </svg>`,
  bulb: `<svg viewBox="0 0 48 48"><circle cx="24" cy="20" r="13" fill="#ffe27a" stroke="#2a1a33" stroke-width="3"/><path d="M18 31h12v6a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3z" fill="#b9c2d6" stroke="#2a1a33" stroke-width="3"/><path d="M20 20q4-5 8 0" fill="none" stroke="#fff8d6" stroke-width="3" stroke-linecap="round"/></svg>`,
  binoculars: `<svg viewBox="0 0 48 48"><rect x="7" y="16" width="14" height="22" rx="6" fill="#3346a8" stroke="#2a1a33" stroke-width="3"/><rect x="27" y="16" width="14" height="22" rx="6" fill="#3346a8" stroke="#2a1a33" stroke-width="3"/><rect x="19" y="20" width="10" height="8" rx="3" fill="#ffd45c" stroke="#2a1a33" stroke-width="3"/><circle cx="14" cy="32" r="4" fill="#9fdcff"/><circle cx="34" cy="32" r="4" fill="#9fdcff"/></svg>`,
  eye: `<svg viewBox="0 0 48 48"><path d="M4 24 Q24 6 44 24 Q24 42 4 24z" fill="#fff4dc" stroke="#2a1a33" stroke-width="3"/><circle cx="24" cy="24" r="7" fill="#2a1a33"/><circle cx="26" cy="22" r="2" fill="#fff"/></svg>`,
  hide: `<svg viewBox="0 0 48 48"><path d="M6 22 Q24 38 42 22" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M12 29 l-4 5 M24 33 v6 M36 29 l4 5" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`,
  creak: `<svg viewBox="0 0 64 64"><rect x="6" y="26" width="52" height="12" rx="4" fill="#a8693f" stroke="#5a2e1a" stroke-width="3" transform="rotate(-6 32 32)"/><path d="M14 18 q4 -6 8 0 M28 14 q4 -6 8 0 M42 18 q4 -6 8 0" stroke="#fff4dc" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M10 48 l8 -2 M46 46 l8 2" stroke="#fff4dc" stroke-width="3" stroke-linecap="round"/></svg>`,
  star: (on = true) => `<svg viewBox="0 0 48 48"><path d="M24 4l5.9 12.6 13.6 1.7-10 9.4 2.6 13.5L24 34.6 11.9 41.2l2.6-13.5-10-9.4 13.6-1.7z" fill="${on ? '#ffd25e' : 'rgba(255,244,220,.15)'}" stroke="${on ? '#c9861f' : 'rgba(255,244,220,.5)'}" stroke-width="3" stroke-linejoin="round"/></svg>`,
  gear: `<svg viewBox="0 0 48 48"><path d="M24 15a9 9 0 1 0 0 18a9 9 0 1 0 0-18z" fill="none" stroke="currentColor" stroke-width="5"/><g stroke="currentColor" stroke-width="6" stroke-linecap="round"><path d="M24 4v5M24 39v5M4 24h5M39 24h5M9.9 9.9l3.5 3.5M34.6 34.6l3.5 3.5M9.9 38.1l3.5-3.5M34.6 13.4l3.5-3.5"/></g></svg>`,
  bag: `<svg viewBox="0 0 48 48"><path d="M10 17h28l-2 25H12z" fill="currentColor"/><path d="M17 17v-4a7 7 0 0 1 14 0v4" stroke="currentColor" stroke-width="4" fill="none"/></svg>`,
  map: `<svg viewBox="0 0 48 48"><path d="M6 12l11-4 14 5 11-4v27l-11 4-14-5-11 4z" fill="currentColor"/><path d="M17 8v27M31 13v27" stroke="rgba(0,0,0,.25)" stroke-width="3"/></svg>`,
  gift: `<svg viewBox="0 0 48 48"><rect x="7" y="20" width="34" height="22" rx="4" fill="#ff7aa8"/><rect x="5" y="14" width="38" height="9" rx="3" fill="#ff5c8f"/><rect x="21" y="14" width="6" height="28" fill="#ffd25e"/><path d="M24 14c-4-8-13-8-11-2 1 3 7 2 11 2zm0 0c4-8 13-8 11-2-1 3-7 2-11 2z" fill="#ffd25e" stroke="#c9861f" stroke-width="2"/></svg>`,
  sound: `<svg viewBox="0 0 48 48"><path d="M8 18h8l10-8v28l-10-8H8z" fill="currentColor"/><path d="M32 16q6 8 0 16M37 11q10 13 0 26" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
  play: `<svg viewBox="0 0 48 48"><path d="M15 9l25 15-25 15z" fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></svg>`,
};
