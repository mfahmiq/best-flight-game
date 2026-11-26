// hud.js — everything the pilot reads: airspeed, altitude, heading,
// artificial horizon, fuel, throttle, gear/flap lights, warnings, the
// mission panel, and the title / briefing / debrief screens. One job: the
// instruments look flown rather than drawn — lit glass, needles, tapes.
import { COLOURS, MISSIONS } from './config.js';
import { angleDiff } from './physics.js';

const MS_TO_KT = 1.94384;
const M_TO_FT = 3.28084;

function panel(ctx, x, y, w, h, alpha = 0.55) {
  ctx.fillStyle = `rgba(8, 18, 32, ${alpha})`;
  ctx.strokeStyle = 'rgba(159, 232, 255, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill(); ctx.stroke();
}

function label(ctx, text, x, y, size, color = COLOURS.hudLine, align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function bigNum(ctx, text, x, y, size, color = '#fff', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px 'Segoe UI', system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

function compassLabel(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

export function drawHUD(ctx, w, h, game, time) {
  const p = game.plane;
  const m = game.mission;
  const headingDeg = ((p.heading * 180 / Math.PI) % 360 + 360) % 360;
  const speedKt = Math.round(p.speed * MS_TO_KT);
  const altFt = Math.round((p.y - 14) * M_TO_FT);
  const vsFpm = Math.round(p.verticalSpeed * M_TO_FT * 60);

  // --- top-left: airspeed ---------------------------------------------
  panel(ctx, 14, 14, 150, 76);
  label(ctx, 'AIRSPEED', 26, 34, 11);
  bigNum(ctx, String(speedKt), 26, 66, 30);
  label(ctx, 'KT', 96, 66, 13, COLOURS.hudLine);
  // speed tape: a thin bar, green in the envelope, red below stall speed
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(26, 74, 126, 5);
  const frac = Math.min(1, p.speed / 95);
  ctx.fillStyle = p.stalled ? COLOURS.hudRed : COLOURS.hudGreen;
  ctx.fillRect(26, 74, 126 * frac, 5);
  ctx.fillStyle = COLOURS.hudRed;
  ctx.fillRect(26 + 126 * (26 / 95), 74, 2, 5);

  // --- top-right: altitude + vertical speed ---------------------------
  panel(ctx, w - 164, 14, 150, 76);
  label(ctx, 'ALTITUDE', w - 152, 34, 11);
  bigNum(ctx, String(Math.max(0, altFt)), w - 152, 66, 30);
  label(ctx, 'FT', w - 66, 66, 13, COLOURS.hudLine);
  label(ctx, (vsFpm >= 0 ? '▲ +' : '▼ ') + Math.abs(vsFpm) + ' FPM', w - 152, 84, 11,
    Math.abs(vsFpm) > 800 ? COLOURS.hudAmber : COLOURS.hudLine);

  // --- top-centre: heading tape ---------------------------------------
  panel(ctx, w / 2 - 150, 14, 300, 44);
  ctx.save();
  ctx.beginPath(); ctx.rect(w / 2 - 150, 14, 300, 44); ctx.clip();
  for (let off = -60; off <= 60; off += 15) {
    const deg = Math.round((headingDeg + off) / 15) * 15;
    const x = w / 2 + (deg - headingDeg) * 2.2;
    const norm = ((deg % 360) + 360) % 360;
    ctx.strokeStyle = 'rgba(159,232,255,0.7)';
    ctx.beginPath(); ctx.moveTo(x, 44); ctx.lineTo(x, 50); ctx.stroke();
    label(ctx, norm % 90 === 0 ? compassLabel(norm) : String(norm), x, 36, 11, '#fff', 'center');
  }
  ctx.restore();
  ctx.fillStyle = COLOURS.hudAmber;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 6, 14); ctx.lineTo(w / 2 + 6, 14); ctx.lineTo(w / 2, 24); ctx.closePath(); ctx.fill();
  bigNum(ctx, String(Math.round(headingDeg)).padStart(3, '0') + '°', w / 2, 56, 13, '#fff', 'center');

  // --- bottom-left: artificial horizon + fuel + throttle ---------------
  const gx = 14, gy = h - 132;
  panel(ctx, gx, gy, 210, 118);
  // Artificial horizon: a lit glass ball.
  const ahx = gx + 52, ahy = gy + 59, ahr = 42;
  ctx.save();
  ctx.beginPath(); ctx.arc(ahx, ahy, ahr, 0, Math.PI * 2); ctx.clip();
  ctx.translate(ahx, ahy);
  ctx.rotate(-p.bank * 0.9);
  ctx.translate(0, p.pitch * ahr * 1.4);
  ctx.fillStyle = '#3f8fd2'; ctx.fillRect(-ahr, -ahr, ahr * 2, ahr);
  ctx.fillStyle = '#8a6b42'; ctx.fillRect(-ahr, 0, ahr * 2, ahr);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-ahr, 0); ctx.lineTo(ahr, 0); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = COLOURS.hudLine; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(ahx, ahy, ahr, 0, Math.PI * 2); ctx.stroke();
  // Fixed wings on the horizon ball.
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(ahx - ahr - 4, ahy); ctx.lineTo(ahx - 12, ahy);
  ctx.moveTo(ahx + 12, ahy); ctx.lineTo(ahx + ahr + 4, ahy);
  ctx.stroke();
  label(ctx, 'ATTITUDE', ahx, gy + 116, 9, COLOURS.hudLine, 'center');

  // Fuel gauge.
  label(ctx, 'FUEL', gx + 108, gy + 26, 11);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(gx + 108, gy + 32, 88, 10);
  ctx.fillStyle = p.fuel < 20 ? COLOURS.hudRed : p.fuel < 45 ? COLOURS.hudAmber : COLOURS.hudGreen;
  ctx.fillRect(gx + 108, gy + 32, 88 * (p.fuel / 100), 10);
  bigNum(ctx, Math.round(p.fuel) + '%', gx + 108, gy + 60, 15);
  // Throttle bar.
  label(ctx, 'THR', gx + 108, gy + 80, 11);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(gx + 108, gy + 86, 88, 10);
  ctx.fillStyle = COLOURS.hudLine;
  ctx.fillRect(gx + 108, gy + 86, 88 * p.throttle, 10);
  // Gear + flaps lights.
  const gearOn = p.gearDown;
  ctx.fillStyle = gearOn ? COLOURS.hudGreen : 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.arc(gx + 116, gy + 108, 5, 0, Math.PI * 2); ctx.fill();
  label(ctx, 'GEAR', gx + 126, gy + 112, 10, gearOn ? COLOURS.hudGreen : COLOURS.hudLine);
  ctx.fillStyle = p.flaps ? COLOURS.hudAmber : 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.arc(gx + 168, gy + 108, 5, 0, Math.PI * 2); ctx.fill();
  label(ctx, 'FLAP', gx + 178, gy + 112, 10, p.flaps ? COLOURS.hudAmber : COLOURS.hudLine);

  // --- bottom-right: mission panel ------------------------------------
  const mx = w - 264, my = h - 132;
  panel(ctx, mx, my, 250, 118);
  label(ctx, m.name + '  ·  ' + game.missionProgressText(), mx + 12, my + 22, 12, COLOURS.hudAmber);
  label(ctx, game.objectiveText(), mx + 12, my + 46, 13, '#fff');
  label(ctx, game.objectiveDistanceText(), mx + 12, my + 68, 12, COLOURS.hudLine);
  label(ctx, 'SCORE ' + game.score + '   ·   TIME ' + game.timeText(), mx + 12, my + 92, 12);
  if (game.damageText()) label(ctx, game.damageText(), mx + 12, my + 112, 11, COLOURS.hudAmber);

  // --- centre: flight-path marker + next-target arrow -----------------
  const tgt = game.nextTarget();
  if (tgt && game.state === 'flying') {
    const dx = tgt.x - p.x, dz = tgt.z - p.z;
    const dist = Math.hypot(dx, dz);
    const bearing = Math.atan2(dx, dz);
    const rel = angleDiff(bearing, p.heading);
    // Off-screen arrow: point toward the target around the screen edge.
    if (Math.abs(rel) > 0.6 || dist > 900) {
      const ax = w / 2 + Math.sin(rel) * (w * 0.36);
      const ay = h * 0.42 - Math.cos(rel) * (h * 0.18);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(rel);
      ctx.fillStyle = COLOURS.hudAmber;
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(12, 10); ctx.lineTo(-12, 10); ctx.closePath(); ctx.fill();
      ctx.restore();
      label(ctx, Math.round(dist) + ' m', ax, ay + 30, 12, COLOURS.hudAmber, 'center');
    }
  }
  // Crosshair.
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.60, 10, 0, Math.PI * 2);
  ctx.moveTo(w / 2 - 16, h * 0.60); ctx.lineTo(w / 2 - 6, h * 0.60);
  ctx.moveTo(w / 2 + 6, h * 0.60); ctx.lineTo(w / 2 + 16, h * 0.60);
  ctx.stroke();

  // --- warnings --------------------------------------------------------
  let wy = 100;
  const blink = Math.sin(time * 8) > 0;
  if (p.stalled && blink) {
    bigNum(ctx, '⚠ STALL — NOSE DOWN, FULL THROTTLE', w / 2, wy, 18, COLOURS.hudRed, 'center');
    wy += 26;
  }
  if (p.fuel < 20 && blink) {
    bigNum(ctx, '⚠ LOW FUEL', w / 2, wy, 18, COLOURS.hudAmber, 'center');
    wy += 26;
  }
  if (p.damage >= 25 && p.damage < 100) {
    label(ctx, 'DAMAGE ' + Math.round(p.damage) + '%', w / 2, wy, 14, COLOURS.hudAmber, 'center');
  }

  // --- transient toast -------------------------------------------------
  if (game.toast && game.toastUntil > time) {
    const a = Math.min(1, (game.toastUntil - time) / 0.5);
    ctx.save();
    ctx.globalAlpha = a;
    panel(ctx, w / 2 - 220, h * 0.24, 440, 46, 0.7);
    bigNum(ctx, game.toast, w / 2, h * 0.24 + 30, 18, '#fff', 'center');
    ctx.restore();
  }
}

// ---- screens ------------------------------------------------------------
function screenPanel(ctx, w, h, title, lines, footer, accent = COLOURS.hudAmber) {
  ctx.fillStyle = 'rgba(4, 10, 20, 0.55)';
  ctx.fillRect(0, 0, w, h);
  const pw = Math.min(680, w - 60), ph = 150 + lines.length * 30;
  const px = (w - pw) / 2, py = (h - ph) / 2;
  panel(ctx, px, py, pw, ph, 0.88);
  bigNum(ctx, title, w / 2, py + 52, 34, accent, 'center');
  lines.forEach((ln, i) => {
    label(ctx, ln, w / 2, py + 96 + i * 30, 15, '#fff', 'center');
  });
  if (footer) label(ctx, footer, w / 2, py + ph - 22, 13, COLOURS.hudLine, 'center');
}

export function drawTitle(ctx, w, h, time) {
  // Sky backdrop is drawn by the world renderer behind this panel.
  const pw = Math.min(720, w - 60);
  const px = (w - pw) / 2, py = Math.max(30, h * 0.08);
  panel(ctx, px, py, pw, 132, 0.8);
  bigNum(ctx, 'SKYMAIL', w / 2, py + 56, 52, '#fff', 'center');
  label(ctx, '— BUSH PILOT COURIER —', w / 2, py + 88, 15, COLOURS.hudAmber, 'center');
  label(ctx, 'Fly the valley. Land the strips. Bring everyone home.', w / 2, py + 114, 14, COLOURS.hudLine, 'center');

  const cardW = Math.min(220, (pw - 48) / 3);
  MISSIONS.forEach((m, i) => {
    const cx = px + 16 + i * (cardW + 8);
    const cy = py + 150;
    panel(ctx, cx, cy, cardW, 168, 0.8);
    bigNum(ctx, String(i + 1), cx + 14, cy + 34, 26, COLOURS.hudAmber);
    label(ctx, m.name, cx + 14, cy + 62, 14, '#fff');
    // Wrap the tagline over two lines.
    const words = m.tagline.split(' ');
    let line = '', ly = cy + 88;
    for (const wd of words) {
      if ((line + ' ' + wd).trim().length > 26) { label(ctx, line.trim(), cx + 14, ly, 12, COLOURS.hudLine); line = wd; ly += 18; }
      else line += ' ' + wd;
    }
    label(ctx, line.trim(), cx + 14, ly, 12, COLOURS.hudLine);
    label(ctx, m.goal === 'rings' ? '8 RINGS · PAR 2:30' : m.goal === 'deliveries' ? '3 DELIVERIES' : 'RESCUE + RETURN', cx + 14, cy + 148, 11, COLOURS.hudGreen);
  });
  const fy = py + 150 + 168 + 26;
  panel(ctx, w / 2 - 330, fy - 22, 660, 88, 0.6);
  label(ctx, 'Press 1 / 2 / 3 to pick a sortie — or click a card.  Enter flies.', w / 2, fy, 15, '#fff', 'center');
  label(ctx, 'W/S throttle · A/D or ←/→ bank · ↑/↓ pitch · mouse steers · Space flaps · G gear · R restart · P pause', w / 2, fy + 26, 13, '#fff', 'center');
  label(ctx, 'Land gently on a runway: slow, level, gear down. Fuel and damage decide the sortie.', w / 2, fy + 50, 13, '#fff', 'center');
}

export function drawBriefing(ctx, w, h, mission) {
  screenPanel(ctx, w, h, mission.name, [
    mission.briefing,
    '',
    'W/S throttle · A/D bank · ↑/↓ pitch · mouse steers · Space flaps · G gear',
    'Gear down + slow + level = a landing. Anything else at ground level is a crash.',
  ], 'Press ENTER to fly  ·  ESC back to the menu');
}

export function drawPaused(ctx, w, h) {
  screenPanel(ctx, w, h, 'PAUSED', ['Take a breath. The valley waits.'], 'P to resume  ·  R to restart  ·  ESC to the menu');
}

export function drawCrashed(ctx, w, h, game) {
  screenPanel(ctx, w, h, 'CRASHED', [
    game.crashReason,
    'Score ' + game.score + '  ·  ' + game.missionProgressText(),
    'The Skymail mechanics will have the plane patched by morning.',
  ], 'R to fly again  ·  ESC to the menu', COLOURS.hudRed);
}

export function drawComplete(ctx, w, h, game) {
  const bonus = Math.max(0, Math.round((game.mission.parTime - game.elapsed) * 5));
  screenPanel(ctx, w, h, 'SORTIE COMPLETE', [
    game.completeText,
    'Score ' + game.score + '  ·  Time ' + game.timeText() + '  ·  Time bonus +' + bonus,
    'Fuel left ' + Math.round(game.plane.fuel) + '%  ·  Damage ' + Math.round(game.plane.damage) + '%',
  ], 'ENTER next sortie  ·  R fly it again  ·  ESC to the menu', COLOURS.hudGreen);
}
