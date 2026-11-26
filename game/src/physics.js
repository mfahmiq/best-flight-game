// physics.js — the flight model: throttle, bank, pitch, stall, fuel, damage,
// landings and crashes. One job: move the plane and decide what a touchdown
// means. It reads input, it does not draw.
import { PLANE } from './config.js';
import { groundHeight, runwayAt } from './terrain.js';

export function makePlaneState(mission) {
  const s = mission.start;
  return {
    x: s.x, z: s.z, y: s.y, heading: s.heading,
    bank: 0, pitch: 0, speed: 0, throttle: 0,
    fuel: mission.fuel, damage: 0,
    gearDown: true, flaps: false,
    verticalSpeed: 0, onGround: true, airborne: false,
    stalled: false, crashed: false, landed: false,
    rollOut: 0,
  };
}

// Returns an event string for the game to react to: '', 'takeoff',
// 'touchdown-clean', 'touchdown-rough', 'crash-terrain', 'crash-hard',
// 'stall', 'unstalled', 'out-of-fuel'.
export function stepPlane(p, input, dt, sound) {
  if (p.crashed) return '';

  // Throttle.
  p.throttle = Math.max(0, Math.min(1, p.throttle + input.throttleDelta(dt)));

  // Target speed from throttle; climbing bleeds speed, diving gains it.
  const target = PLANE.minSpeed + p.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
  let speedRate = (target - p.speed) * 0.45;
  speedRate -= Math.sin(p.pitch) * 14; // climb costs speed
  if (p.flaps) speedRate -= 6;
  if (p.gearDown && p.speed > PLANE.gearSpeedLimit) speedRate -= 8; // gear drag
  p.speed = Math.max(0, p.speed + speedRate * dt);

  // Bank and pitch ease toward the commanded values — the plane feels
  // weighty, but answers at every speed.
  const bankTarget = input.bankCommand() * PLANE.maxBank;
  const pitchTarget = input.pitchCommand() * PLANE.maxPitch;
  const ease = 1 - Math.exp(-dt * 3.2);
  p.bank += (bankTarget - p.bank) * ease;
  p.pitch += (pitchTarget - p.pitch) * ease;

  // Stall: below min speed the wing quits. Nose drops, controls go soft.
  const wasStalled = p.stalled;
  p.stalled = p.airborne && p.speed < PLANE.minSpeed;
  if (p.stalled && !wasStalled && sound) sound.stallWarn();

  // Turn: heading follows bank, faster when faster.
  p.heading += Math.sin(p.bank) * PLANE.turnRate * (0.35 + 0.65 * (p.speed / PLANE.cruiseSpeed)) * dt;

  // Vertical speed: pitch times speed, minus a stall sink.
  let vs = Math.sin(p.pitch) * p.speed;
  if (p.stalled) vs -= 7;
  if (!p.airborne) vs = 0;
  p.verticalSpeed = vs;

  // Move.
  p.x += Math.sin(p.heading) * p.speed * dt;
  p.z += Math.cos(p.heading) * p.speed * dt;
  p.y += vs * dt;
  if (p.y < 0.5) p.y = 0.5;

  // Fuel: throttle drinks it; flaps and gear add a little.
  const burn = PLANE.fuelBurnBase + PLANE.fuelBurnThrottle * p.throttle * p.throttle;
  p.fuel = Math.max(0, p.fuel - burn * dt);
  if (p.fuel <= 0 && p.throttle > 0) p.throttle = 0;

  // Takeoff.
  if (p.onGround && p.speed > PLANE.minSpeed + 4 && p.pitch > 0.06) {
    p.onGround = false; p.airborne = true;
    return 'takeoff';
  }
  // Ground roll: friction while on the runway.
  if (p.onGround) {
    p.speed = Math.max(0, p.speed - (p.flaps ? 14 : 7) * dt);
    p.y = groundHeight(p.x, p.z) + 0.4;
  }

  // Terrain contact. The margin is small on purpose: right after takeoff
  // the plane sits only 0.4 m above the strip, so a generous margin would
  // read a clean rotation as a crash.
  const gh = groundHeight(p.x, p.z);
  if (p.airborne && p.y <= gh + 0.15) {
    const rw = runwayAt(p.x, p.z);
    const gentle = Math.abs(vs) <= PLANE.safeTouchdown;
    const rough = Math.abs(vs) <= PLANE.hardTouchdown;
    const aligned = !rw || Math.abs(angleDiff(p.heading, rw.heading)) < 0.45;
    const level = Math.abs(p.bank) < 0.35;
    if (rw && gentle && aligned && level && p.gearDown) {
      p.onGround = true; p.airborne = false; p.y = gh + 0.4; p.pitch = 0;
      if (sound) sound.touchdown();
      return 'touchdown-clean';
    }
    if (rw && rough && aligned && level && p.gearDown) {
      p.onGround = true; p.airborne = false; p.y = gh + 0.4; p.pitch = 0;
      p.damage = Math.min(100, p.damage + 18);
      if (sound) sound.bounce();
      return 'touchdown-rough';
    }
    // Anything else at ground level is a crash — and it reads as one.
    p.crashed = true; p.airborne = false; p.y = gh + 0.4;
    p.damage = 100;
    if (sound) sound.crash();
    return Math.abs(vs) > PLANE.hardTouchdown ? 'crash-hard' : 'crash-terrain';
  }

  // Out of fuel while airborne: glide down, then the ground decides.
  if (p.fuel <= 0 && p.airborne && p.speed < PLANE.minSpeed) {
    p.pitch = Math.min(p.pitch, -0.08);
  }
  if (p.fuel <= 0 && !p.airborne && !p.onGround) return 'out-of-fuel';
  return '';
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Refuel and patch up on a completed leg (only at a runway, on the ground).
export function servicePlane(p) {
  p.fuel = 100;
  p.damage = Math.max(0, p.damage - 40);
}
