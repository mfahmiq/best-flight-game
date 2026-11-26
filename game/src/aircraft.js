// aircraft.js — draws the Skymail bush plane in chase view, and its soft
// shadow on the ground below. One job: the aircraft that looks built.
// The plane is drawn in screen space, banked and pitched, at the centre
// of the frame; the world moves around it.
import { groundHeight, makeProjector } from './terrain.js';

export function drawPlaneShadow(ctx, cam, heading, w, h, horizonY, plane) {
  const project = makeProjector(cam, heading, w, h, horizonY);
  const gy = groundHeight(plane.x, plane.z);
  const p = project(plane.x, gy + 0.5, plane.z);
  if (!p || p.depth < 8) return;
  const s = Math.max(0.15, Math.min(1, 26 / (plane.y - gy + 6)));
  ctx.save();
  ctx.globalAlpha = 0.28 * s;
  ctx.fillStyle = '#1a2a1a';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, 46 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawPlane(ctx, w, h, plane, time) {
  const cx = w / 2;
  const cy = h * 0.60 - plane.pitch * h * 0.10;
  const S = Math.min(w, h) * 0.33; // overall size of the aircraft
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(plane.bank * 0.85);

  // Propeller blur disc (spins: the blades are a rotating translucent disc
  // with two faint blade streaks).
  const propR = S * 0.34;
  ctx.save();
  ctx.translate(0, -S * 0.02);
  ctx.fillStyle = 'rgba(200,210,220,0.20)';
  ctx.beginPath(); ctx.ellipse(0, 0, propR, propR * 0.96, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(120,130,140,0.45)';
  ctx.lineWidth = 2;
  const a = time * 22;
  ctx.beginPath();
  ctx.moveTo(Math.cos(a) * propR, Math.sin(a) * propR * 0.96);
  ctx.lineTo(-Math.cos(a) * propR, -Math.sin(a) * propR * 0.96);
  ctx.moveTo(Math.cos(a + 1.1) * propR * 0.7, Math.sin(a + 1.1) * propR * 0.67);
  ctx.lineTo(-Math.cos(a + 1.1) * propR * 0.7, -Math.sin(a + 1.1) * propR * 0.67);
  ctx.stroke();
  ctx.fillStyle = '#c33';
  ctx.beginPath(); ctx.arc(0, 0, S * 0.045, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Main wings: long, slightly swept, cream tops with red tips.
  ctx.fillStyle = '#f3ead2';
  ctx.strokeStyle = '#b8a888';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-S * 0.62, S * 0.10);
  ctx.lineTo(-S * 0.10, S * 0.02);
  ctx.lineTo(S * 0.10, S * 0.02);
  ctx.lineTo(S * 0.62, S * 0.10);
  ctx.lineTo(S * 0.56, S * 0.16);
  ctx.lineTo(-S * 0.56, S * 0.16);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // Red wingtips.
  ctx.fillStyle = '#d23b2e';
  ctx.beginPath();
  ctx.moveTo(-S * 0.62, S * 0.10); ctx.lineTo(-S * 0.50, S * 0.075);
  ctx.lineTo(-S * 0.485, S * 0.145); ctx.lineTo(-S * 0.56, S * 0.16);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(S * 0.62, S * 0.10); ctx.lineTo(S * 0.50, S * 0.075);
  ctx.lineTo(S * 0.485, S * 0.145); ctx.lineTo(S * 0.56, S * 0.16);
  ctx.closePath(); ctx.fill();

  // Tailplane.
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath();
  ctx.moveTo(-S * 0.30, S * 0.30); ctx.lineTo(-S * 0.06, S * 0.24);
  ctx.lineTo(S * 0.06, S * 0.24); ctx.lineTo(S * 0.30, S * 0.30);
  ctx.lineTo(S * 0.26, S * 0.34); ctx.lineTo(-S * 0.26, S * 0.34);
  ctx.closePath(); ctx.fill();

  // Fuselage: red top fading to cream belly, tapered nose to tail.
  const fg = ctx.createLinearGradient(0, -S * 0.16, 0, S * 0.20);
  fg.addColorStop(0, '#c8352a');
  fg.addColorStop(0.55, '#d94a35');
  fg.addColorStop(1, '#f3ead2');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(0, -S * 0.17);
  ctx.quadraticCurveTo(S * 0.11, -S * 0.10, S * 0.115, S * 0.10);
  ctx.quadraticCurveTo(S * 0.10, S * 0.30, S * 0.035, S * 0.38);
  ctx.lineTo(-S * 0.035, S * 0.38);
  ctx.quadraticCurveTo(-S * 0.10, S * 0.30, -S * 0.115, S * 0.10);
  ctx.quadraticCurveTo(-S * 0.11, -S * 0.10, 0, -S * 0.17);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(90,20,12,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Belly stripe and panel lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-S * 0.10, S * 0.13); ctx.lineTo(S * 0.10, S * 0.13); ctx.stroke();
  ctx.strokeStyle = 'rgba(90,20,12,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-S * 0.09, S * 0.22); ctx.lineTo(S * 0.09, S * 0.22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-S * 0.06, S * 0.30); ctx.lineTo(S * 0.06, S * 0.30); ctx.stroke();

  // Cockpit glass with a sky shine.
  const cg = ctx.createLinearGradient(0, -S * 0.13, 0, S * 0.05);
  cg.addColorStop(0, '#bfe6ff');
  cg.addColorStop(1, '#4d8fc4');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.moveTo(0, -S * 0.13);
  ctx.quadraticCurveTo(S * 0.075, -S * 0.08, S * 0.07, S * 0.04);
  ctx.lineTo(-S * 0.07, S * 0.04);
  ctx.quadraticCurveTo(-S * 0.075, -S * 0.08, 0, -S * 0.13);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-S * 0.03, -S * 0.09); ctx.lineTo(S * 0.015, -S * 0.02); ctx.stroke();

  // Vertical tail fin with the Skymail mark.
  ctx.fillStyle = '#c8352a';
  ctx.beginPath();
  ctx.moveTo(-S * 0.045, S * 0.24);
  ctx.lineTo(0, S * 0.42);
  ctx.lineTo(S * 0.045, S * 0.24);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(8, S * 0.055)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(0, S * 0.33);
  ctx.fillText('S', 0, 0);
  ctx.restore();

  // Landing gear: two legs and wheels when the gear is down.
  if (plane.gearDown) {
    ctx.strokeStyle = '#3a3f46';
    ctx.lineWidth = Math.max(2, S * 0.02);
    ctx.beginPath();
    ctx.moveTo(-S * 0.07, S * 0.16); ctx.lineTo(-S * 0.13, S * 0.30);
    ctx.moveTo(S * 0.07, S * 0.16); ctx.lineTo(S * 0.13, S * 0.30);
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(-S * 0.13, S * 0.31, S * 0.035, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(S * 0.13, S * 0.31, S * 0.035, 0, Math.PI * 2); ctx.fill();
  }

  // Navigation lights: red left, green right, gently pulsing.
  const pulse = 0.65 + 0.35 * Math.sin(time * 4);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ff2e2e';
  ctx.beginPath(); ctx.arc(-S * 0.60, S * 0.12, S * 0.028, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2eff6a';
  ctx.beginPath(); ctx.arc(S * 0.60, S * 0.12, S * 0.028, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.restore();
}
