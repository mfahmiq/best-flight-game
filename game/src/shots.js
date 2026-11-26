// shots.js — deterministic screenshot states. One job: put the game into
// a photogenic, fully-playing state for each screenshot, from a URL query
// like ?shot=cover. These are real renders of the game code, frozen in
// flight so the browser can capture them exactly.
export function applyShot(game, shot) {
  if (shot === 'menu') {
    game.state = 'title';
    return;
  }
  // setPlane re-reads game.plane AFTER the mission is selected, because
  // selecting a mission builds a fresh plane.
  const setPlane = (missionIndex, score, elapsed, patch) => {
    game.selectMission(missionIndex);
    game.state = 'flying';
    game.score = score;
    game.elapsed = elapsed;
    Object.assign(game.plane, patch);
  };

  if (shot === 'cover') {
    // Chasing the next ring with the home runway ahead, instruments lit.
    setPlane(0, 300, 64, {
      x: 60, z: 1080, y: 62, heading: 0.08, bank: -0.18, pitch: 0.02,
      speed: 68, throttle: 0.78, fuel: 71, damage: 0,
      gearDown: false, flaps: false, onGround: false, airborne: true,
      verticalSpeed: 1.4, stalled: false,
    });
    game.ringIndex = 2;
  } else if (shot === 'low') {
    // Low over the river and the fields, valley walls on both sides.
    setPlane(1, 650, 132, {
      x: 240, z: 2050, y: 34, heading: -0.12, bank: 0.22, pitch: -0.01,
      speed: 74, throttle: 0.85, fuel: 58, damage: 0,
      gearDown: false, flaps: false, onGround: false, airborne: true,
      verticalSpeed: -0.8, stalled: false,
    });
    game.legIndex = 1;
  } else if (shot === 'land') {
    // On final approach: gear down, flaps out, runway ahead to the right
    // of the nose so the strip itself is visible in the frame.
    setPlane(1, 1050, 214, {
      x: -120, z: -480, y: 52, heading: 0.16, bank: 0.03, pitch: -0.06,
      speed: 42, throttle: 0.35, fuel: 44, damage: 6,
      gearDown: true, flaps: true, onGround: false, airborne: true,
      verticalSpeed: -2.6, stalled: false,
    });
    game.legIndex = 2;
  } else if (shot === 'rescue') {
    // Into the peaks: the red SOS beacon ahead, snow on the ridges.
    setPlane(2, 500, 178, {
      x: -160, z: 3100, y: 108, heading: 0.10, bank: -0.12, pitch: 0.05,
      speed: 58, throttle: 0.7, fuel: 36, damage: 0,
      gearDown: false, flaps: false, onGround: false, airborne: true,
      verticalSpeed: 2.9, stalled: false,
    });
    game.rescueStage = 'out';
  }
  game.setToast('', 0);
  game.frozen = true; // physics holds still; the render loop keeps drawing
}
