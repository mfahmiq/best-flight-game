// terrain.js — the valley itself: its heightfield, its sky, and how both
// are drawn in pseudo-3D from the chase camera. One job: the world you see.
// No game rules live here; physics.js asks groundHeight() and runwayAt().
import { WORLD, COLOURS, MISSIONS } from './config.js';
import { fbm, hash2, valueNoise, mulberry32 } from './random.js';

const SEED = WORLD.seed;

// The river meanders down the valley; the terrain dips to meet it.
export function riverX(z) {
  return 260 * Math.sin(z * 0.0009 + 1.3) + 120 * Math.sin(z * 0.00023 + 0.4);
}

function rawHeight(x, z) {
  // Valley walls rise with |x|; the peaks rise with z up-valley.
  const wall = Math.pow(Math.min(1, Math.abs(x) / 700), 2) * 62;
  const peaks = Math.pow(Math.max(0, (z - 1800) / 2400), 2) * 95;
  // The valley floor stays gentle so a plane flying level after takeoff
  // is not ambushed by a hill: relief grows away from the centre line
  // and up-valley, where the mountains belong.
  const relief = 0.30 + 0.70 * Math.min(1, Math.abs(x) / 520);
  const hills = (fbm(x, z, 260, 3, SEED) * 11 + fbm(x, z, 90, 2, SEED + 7) * 4) * relief;
  let h = 14 + wall + peaks + hills;
  // River carve.
  const d = Math.abs(x - riverX(z));
  if (d < 70) {
    const t = d / 70;
    h = h * (0.35 + 0.65 * t * t) + (WORLD.waterLevel - 3) * (1 - t * t);
  }
  return h;
}

// Flatten the ground under each runway so the strip sits level — and keep
// a wide, gently graded apron around it, so a plane rolling off the end
// of the strip or rotating just past it never meets a step in the ground.
function runwayBlend(x, z) {
  for (const m of MISSIONS) {
    for (const r of m.runways) {
      const dx = x - r.x, dz = z - r.z;
      const along = dx * Math.sin(r.heading) + dz * Math.cos(r.heading);
      const across = dx * Math.cos(r.heading) - dz * Math.sin(r.heading);
      if (Math.abs(along) < r.length / 2 + 200 && Math.abs(across) < 90) {
        const edge = Math.max(Math.abs(along) / (r.length / 2 + 200), Math.abs(across) / 90);
        return { h: rawHeight(r.x, r.z), w: Math.max(0, 1 - edge * edge) };
      }
    }
  }
  return null;
}

export function groundHeight(x, z) {
  const base = rawHeight(x, z);
  const rb = runwayBlend(x, z);
  if (!rb) return base;
  return base * (1 - rb.w) + rb.h * rb.w;
}

export function runwayAt(x, z) {
  for (const m of MISSIONS) {
    for (const r of m.runways) {
      const dx = x - r.x, dz = z - r.z;
      const along = dx * Math.sin(r.heading) + dz * Math.cos(r.heading);
      const across = dx * Math.cos(r.heading) - dz * Math.sin(r.heading);
      if (Math.abs(along) < r.length / 2 && Math.abs(across) < 16) return r;
    }
  }
  return null;
}

// ---- projection ---------------------------------------------------------
// Camera space: forward = (sin h, cos h), right = (cos h, -sin h).
// project() turns a world point into screen space at the camera.
export function makeProjector(cam, heading, w, h, horizonY) {
  const focal = (w / 2) / Math.tan((72 * Math.PI) / 360);
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const rx = Math.cos(heading), rz = -Math.sin(heading);
  return function project(wx, wy, wz) {
    const dx = wx - cam.x, dz = wz - cam.z;
    const depth = dx * fx + dz * fz;
    if (depth < 4) return null;
    const lat = dx * rx + dz * rz;
    return {
      x: w / 2 + (lat / depth) * focal,
      y: horizonY + ((cam.y - wy) / depth) * focal,
      depth,
      scale: focal / depth,
    };
  };
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a, b, t) {
  return [
    Math.round(a[0] * (1 - t) + b[0] * t),
    Math.round(a[1] * (1 - t) + b[1] * t),
    Math.round(a[2] * (1 - t) + b[2] * t),
  ];
}

const SKY_LOW_RGB = hexRgb(COLOURS.skyLow);

// Colour of the ground at a world point, before haze, as [r, g, b].
// Colours vary smoothly with the terrain (no hard per-cell jumps), so the
// strips read as land, not as a grid: grass shades roll with the hills,
// farmland patches are hundreds of metres across with soft edges.
function groundColour(wx, wy, wz) {
  if (wy < WORLD.waterLevel + 0.4) return hexRgb(COLOURS.water);
  if (wy < WORLD.waterLevel + 1.6) return hexRgb(COLOURS.sand);
  if (wy > 88) return hexRgb(COLOURS.snow);
  if (wy > 58) return hexRgb(COLOURS.rock);
  const roll = fbm(wx, wz, 200, 2, SEED + 41) * 0.5 + 0.5;
  const grass = mixRgb(hexRgb(COLOURS.grass[0]), hexRgb(COLOURS.grass[2]), roll);
  // Farmland: large soft patches, one crop colour per patch.
  const fn = fbm(wx, wz, 480, 2, SEED + 73) * 0.5 + 0.5;
  if (fn > 0.62) {
    const crop = hexRgb(COLOURS.field[Math.floor(hash2(Math.floor(wx / 480), Math.floor(wz / 480), SEED + 31) * 97) % COLOURS.field.length]);
    const edge = Math.min(1, (fn - 0.62) / 0.12);
    return mixRgb(grass, crop, edge);
  }
  return grass;
}

// ---- sky ----------------------------------------------------------------
const clouds = [];
{
  const rnd = mulberry32(SEED + 99);
  for (let i = 0; i < 18; i++) {
    clouds.push({
      // Evenly spread around the compass, so a few are always in view.
      angle: (i / 18) * Math.PI * 2 + (rnd() - 0.5) * 0.3,
      yFrac: 0.16 + rnd() * 0.45,         // height within the sky band
      scale: 0.7 + rnd() * 0.9,
      speed: 0.004 + rnd() * 0.006,
    });
  }
}

export function drawSky(ctx, w, h, horizonY, heading, time) {
  const g = ctx.createLinearGradient(0, 0, 0, horizonY + 40);
  g.addColorStop(0, COLOURS.skyTop);
  g.addColorStop(0.55, COLOURS.skyMid);
  g.addColorStop(1, COLOURS.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, horizonY + 40);

  // Sun, fixed in the sky ahead-left so the valley is lit.
  const sunX = w * 0.78, sunY = horizonY - h * 0.22;
  const sg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
  sg.addColorStop(0, 'rgba(255,243,196,1)');
  sg.addColorStop(0.25, 'rgba(255,240,190,0.85)');
  sg.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sunX - 100, sunY - 100, 200, 200);
  ctx.fillStyle = COLOURS.sun;
  ctx.beginPath(); ctx.arc(sunX, sunY, 26, 0, Math.PI * 2); ctx.fill();

  // Distant mountain ridges: two parallax silhouettes above the horizon.
  for (let layer = 0; layer < 2; layer++) {
    const base = horizonY - (layer === 0 ? 4 : 26);
    const amp = layer === 0 ? 72 : 128;
    const col = layer === 0 ? '#7d93b2' : '#5b7194';
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, horizonY + 2);
    for (let sx = 0; sx <= w; sx += 16) {
      const ang = heading + ((sx - w / 2) / w) * 1.5 + layer * 2.7;
      const n = valueNoise(ang * 900, layer * 500, 240, SEED + 55 + layer * 13);
      ctx.lineTo(sx, base - (n * 0.5 + 0.5) * amp);
    }
    ctx.lineTo(w, horizonY + 2);
    ctx.closePath(); ctx.fill();
  }

  // Clouds drift slowly across the sky, positioned by bearing so they stay
  // in the sky wherever the pilot looks (screen-space parallax).
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (const c of clouds) {
    let rel = c.angle + time * c.speed - heading;
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;
    const sx = w / 2 + (rel / 1.1) * w;
    if (sx < -260 || sx > w + 260) continue;
    const sy = c.yFrac * horizonY;
    const s = c.scale;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 95 * s, 17 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(sx - 55 * s, sy + 6 * s, 60 * s, 13 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(sx + 58 * s, sy + 7 * s, 66 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- ground -------------------------------------------------------------
export function drawGround(ctx, cam, heading, w, h, horizonY) {
  const project = makeProjector(cam, heading, w, h, horizonY);
  const focal = (w / 2) / Math.tan((72 * Math.PI) / 360);
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const rx = Math.cos(heading), rz = -Math.sin(heading);
  const COLS = 26;

  // Depth slices, far to near, step growing with distance.
  const slices = [];
  let d = 26;
  while (d < WORLD.viewDistance) {
    slices.push(d);
    d += 14 + d * 0.09;
  }
  slices.sort((a, b) => b - a); // far first so near ground overwrites

  let prev = null;
  let prevDepth = 0;
  for (const depth of slices) {
    const halfW = (depth / focal) * (w / 2) * 1.05;
    const pts = [];
    for (let i = 0; i < COLS; i++) {
      const lat = -halfW + (2 * halfW * i) / (COLS - 1);
      const wx = cam.x + rx * lat + fx * depth;
      const wz = cam.z + rz * lat + fz * depth;
      const wy = groundHeight(wx, wz);
      const p = project(wx, wy, wz);
      pts.push({ sx: p ? p.x : w / 2 + (lat / depth) * focal, sy: p ? p.y : horizonY + 200, wy, wx, wz });
    }
    if (prev) {
      for (let i = 0; i < COLS - 1; i++) {
        const a = prev[i], b = prev[i + 1], c = pts[i + 1], e = pts[i];
        const haze = Math.min(0.55, depth / WORLD.viewDistance * 0.7);
        // Slope shading along the flight direction: a strip climbing away
        // from the camera catches less light, so hills get visible relief
        // without the lateral checkerboard of per-column shading.
        const rise = (a.wy - e.wy) / Math.max(10, prevDepth - depth);
        const f = Math.max(0.78, Math.min(1.15, 1 - rise * 0.9));
        const base = mixRgb(groundColour(a.wx, a.wy, a.wz), SKY_LOW_RGB, haze);
        ctx.fillStyle = `rgb(${Math.round(base[0] * f)},${Math.round(base[1] * f)},${Math.round(base[2] * f)})`;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy);
        ctx.lineTo(c.sx, c.sy); ctx.lineTo(e.sx, e.sy);
        ctx.closePath(); ctx.fill();
      }
    }
    prev = pts;
    prevDepth = depth;
  }
  // Fill any gap below the nearest slice down to the bottom of the screen.
  if (prev) {
    const c = groundColour(cam.x, groundHeight(cam.x, cam.z), cam.z);
    ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
    ctx.beginPath();
    ctx.moveTo(prev[0].sx, prev[0].sy);
    for (const p of prev) ctx.lineTo(p.sx, p.sy);
    ctx.lineTo(w, h); ctx.lineTo(0, h);
    ctx.closePath(); ctx.fill();
  }
}

// ---- runway ---------------------------------------------------------------
export function drawRunway(ctx, cam, heading, w, h, horizonY, runway) {
  const project = makeProjector(cam, heading, w, h, horizonY);
  const y = groundHeight(runway.x, runway.z) + 0.3;
  const step = 18;
  const half = 15;
  const dxr = Math.cos(runway.heading), dzr = -Math.sin(runway.heading);
  const fwdx = Math.sin(runway.heading), fwdz = Math.cos(runway.heading);
  let prevL = null, prevR = null, prevC = null;
  for (let s = -runway.length / 2; s <= runway.length / 2; s += step) {
    const cx = runway.x + fwdx * s, cz = runway.z + fwdz * s;
    const lx = cx + dxr * half, lz = cz + dzr * half;
    const rxp = cx - dxr * half, rzp = cz - dzr * half;
    const pl = project(lx, y, lz), pr = project(rxp, y, rzp), pc = project(cx, y, cz);
    if (!pl || !pr) { prevL = prevR = prevC = null; continue; }
    if (prevL && prevR) {
      ctx.fillStyle = COLOURS.runway;
      ctx.beginPath();
      ctx.moveTo(prevL.x, prevL.y); ctx.lineTo(prevR.x, prevR.y);
      ctx.lineTo(pr.x, pr.y); ctx.lineTo(pl.x, pl.y);
      ctx.closePath(); ctx.fill();
      // Centreline dash every other segment.
      if (Math.floor(s / step) % 2 === 0 && prevC && pc) {
        ctx.strokeStyle = COLOURS.runwayMark;
        ctx.lineWidth = Math.max(1, pc.scale * 0.5);
        ctx.beginPath(); ctx.moveTo(prevC.x, prevC.y); ctx.lineTo(pc.x, pc.y); ctx.stroke();
      }
    }
    prevL = pl; prevR = pr; prevC = pc;
  }
  // Threshold bars at the near end.
  const end = project(runway.x - fwdx * runway.length / 2, y, runway.z - fwdz * runway.length / 2);
  if (end && end.depth < WORLD.viewDistance) {
    ctx.fillStyle = COLOURS.runwayMark;
    ctx.font = `bold ${Math.max(11, end.scale * 2.2)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(runway.name, end.x, end.y - 14);
  }
}

// ---- rings ------------------------------------------------------------------
export function drawRings(ctx, cam, heading, w, h, horizonY, rings, nextIndex) {
  const project = makeProjector(cam, heading, w, h, horizonY);
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i];
    const p = project(r.x, r.y, r.z);
    if (!p || p.depth > WORLD.viewDistance) continue;
    const isNext = i === nextIndex;
    const rad = 13 * p.scale;
    if (rad < 2) continue;
    ctx.save();
    ctx.globalAlpha = isNext ? 1 : 0.45;
    ctx.strokeStyle = isNext ? COLOURS.ringNext : COLOURS.ring;
    ctx.lineWidth = Math.max(2, rad * 0.14);
    ctx.shadowColor = COLOURS.ring;
    ctx.shadowBlur = isNext ? 18 : 6;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rad, rad * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = isNext ? 'rgba(255,207,77,0.16)' : 'rgba(255,176,32,0.08)';
    ctx.fill();
    if (isNext) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(11, rad * 0.32)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), p.x, p.y + rad * 0.12);
    }
    ctx.restore();
  }
}

// Beacon for the rescue mission: a pulsing column of light.
export function drawBeacon(ctx, cam, heading, w, h, horizonY, beacon, time) {
  const project = makeProjector(cam, heading, w, h, horizonY);
  const gy = groundHeight(beacon.x, beacon.z);
  const p = project(beacon.x, gy + 26, beacon.z);
  if (!p || p.depth > WORLD.viewDistance) return;
  const pulse = 0.6 + 0.4 * Math.sin(time * 3);
  ctx.save();
  ctx.globalAlpha = 0.35 * pulse;
  ctx.fillStyle = '#ff5346';
  const bw = 26 * p.scale;
  ctx.fillRect(p.x - bw / 2, p.y - 130 * p.scale, bw, 130 * p.scale);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ff5346';
  ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(4, 7 * p.scale), 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(11, p.scale * 1.6)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('SOS — ' + beacon.name, p.x, p.y - 140 * p.scale);
  ctx.restore();
}
