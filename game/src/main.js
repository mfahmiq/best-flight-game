// main.js — bootstrap and the render loop. One job: wire the pieces
// together and draw one frame at a time. No game rules live here.
import { Game } from './game.js';
import { Input } from './input.js';
import { SoundEngine } from './audio.js';
import { drawSky, drawGround, drawRunway, drawRings, drawBeacon, groundHeight } from './terrain.js';
import { drawPlane, drawPlaneShadow } from './aircraft.js';
import { drawHUD, drawTitle, drawBriefing, drawPaused, drawCrashed, drawComplete } from './hud.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
}
window.addEventListener('resize', resize);
resize();

const sound = new SoundEngine();
const input = new Input(canvas);
const game = new Game(sound);
window.__skymail = game; // handy for play-testing from the console

// Screenshot mode: ?shot=cover|low|land|rescue|menu freezes a real frame.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) applyShot(game, shot);

// First gesture unlocks audio (browsers require it).
window.addEventListener('pointerdown', () => sound.ensure(), { once: true });
window.addEventListener('keydown', () => sound.ensure(), { once: true });

function horizonY(plane) {
  // The horizon sits where the pilot looks: pitch moves it, bank tilts it.
  return H * 0.44 - plane.pitch * H * 0.28;
}

function render(time) {
  const p = game.plane;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const cam = game.state === 'title'
    ? { x: -60, z: -320, y: 95 } // scenic overlook: runway below, peaks ahead
    : game.camera();
  const viewHeading = game.state === 'title' ? 0.05 : p.heading;
  const hy = game.state === 'title' ? H * 0.42 : horizonY(p);

  // The world is drawn inside a banked frame: the horizon tilts with the
  // plane while the HUD stays level, so the camera never fights the pilot.
  ctx.save();
  ctx.translate(W / 2, hy);
  ctx.rotate(game.state === 'title' ? 0 : -p.bank * 0.32);
  ctx.translate(-W / 2, -hy);
  drawSky(ctx, W, H, hy, viewHeading, time);
  drawGround(ctx, cam, viewHeading, W, H, hy);
  // Runways in view, nearest first is fine — they are drawn over ground.
  for (const r of game.mission.runways) {
    const d = Math.hypot(r.x - p.x, r.z - p.z);
    if (d < 1500) drawRunway(ctx, cam, viewHeading, W, H, hy, r);
  }
  if (game.mission.goal === 'rings') {
    drawRings(ctx, cam, viewHeading, W, H, hy, game.mission.rings, game.ringIndex);
  }
  if (game.mission.goal === 'rescue' && game.rescueStage === 'out') {
    drawBeacon(ctx, cam, viewHeading, W, H, hy, game.mission.beacon, time);
  }
  if (game.state !== 'title') drawPlaneShadow(ctx, cam, viewHeading, W, H, hy, p);
  ctx.restore();

  // The aircraft and the instruments are never banked.
  if (game.state !== 'title') {
    drawPlane(ctx, W, H, p, time);
  }

  if (game.state === 'title') {
    drawTitle(ctx, W, H, time);
  } else if (game.state === 'briefing') {
    drawBriefing(ctx, W, H, game.mission);
  } else if (game.state === 'paused') {
    drawHUD(ctx, W, H, game, time);
    drawPaused(ctx, W, H);
  } else if (game.state === 'crashed') {
    drawHUD(ctx, W, H, game, time);
    drawCrashed(ctx, W, H, game);
  } else if (game.state === 'complete') {
    drawHUD(ctx, W, H, game, time);
    drawComplete(ctx, W, H, game);
  } else {
    drawHUD(ctx, W, H, game, time);
  }

  // Screen-reader status, updated only when it changes.
  const label = game.state === 'flying'
    ? `Flying ${game.mission.name}. Speed ${Math.round(p.speed * 1.94)} knots, altitude ${Math.round((p.y - 14) * 3.28)} feet, heading ${Math.round(((p.heading * 180 / Math.PI) % 360 + 360) % 360)} degrees. ${game.objectiveText()}`
    : game.state;
  if (statusEl.textContent !== label) statusEl.textContent = label;
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  if (!game.frozen) game.update(input, dt);
  input.endFrame();
  render(t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
