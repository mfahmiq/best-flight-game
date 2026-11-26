// random.js — deterministic seeded randomness and smooth value noise.
// One job: numbers that are the same every run for a given seed, so the
// valley, the fields and the screenshots never change between sessions.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash of integer grid coordinates -> [0,1). Stable for any (x, z).
export function hash2(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 974634211) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

function smooth(t) { return t * t * (3 - 2 * t); }

// Smooth 2D value noise in [-1, 1], bilinear over a grid of `cell` metres.
export function valueNoise(x, z, cell, seed) {
  const gx = Math.floor(x / cell), gz = Math.floor(z / cell);
  const fx = smooth(x / cell - gx), fz = smooth(z / cell - gz);
  const a = hash2(gx, gz, seed) * 2 - 1;
  const b = hash2(gx + 1, gz, seed) * 2 - 1;
  const c = hash2(gx, gz + 1, seed) * 2 - 1;
  const d = hash2(gx + 1, gz + 1, seed) * 2 - 1;
  const top = a + (b - a) * fx;
  const bot = c + (d - c) * fx;
  return top + (bot - top) * fz;
}

// Fractal noise: several octaves, amplitude falling off.
export function fbm(x, z, cell, octaves, seed) {
  let sum = 0, amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x, z, cell, seed + o * 101) * amp;
    total += amp;
    amp *= 0.5;
    cell *= 0.5;
  }
  return sum / total;
}
