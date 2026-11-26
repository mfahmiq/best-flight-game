// game.js — the state machine and the mission rules. One job: what the
// sortie is, what counts as progress, and what each screen means.
// States: title, briefing, flying, paused, crashed, complete.
import { MISSIONS, SCORING } from './config.js';
import { makePlaneState, stepPlane, servicePlane, angleDiff } from './physics.js';
import { groundHeight } from './terrain.js';

export class Game {
  constructor(sound) {
    this.sound = sound;
    this.state = 'title';
    this.missionIndex = 0;
    this.mission = MISSIONS[0];
    this.plane = makePlaneState(this.mission);
    this.score = 0;
    this.elapsed = 0;
    this.ringIndex = 0;
    this.legIndex = 0;
    this.rescueStage = 'out'; // out -> picked -> home
    this.toast = '';
    this.toastUntil = 0;
    this.crashReason = '';
    this.completeText = '';
    this.time = 0;
    this.best = { rings: null, courier: null, rescue: null };
  }

  selectMission(i) {
    this.missionIndex = i;
    this.mission = MISSIONS[i];
    this.reset();
    this.state = 'briefing';
  }

  reset() {
    this.plane = makePlaneState(this.mission);
    this.score = 0;
    this.elapsed = 0;
    this.ringIndex = 0;
    this.legIndex = 0;
    this.rescueStage = 'out';
    this.toast = '';
    this.crashReason = '';
    this.completeText = '';
  }

  startFlying() {
    this.reset();
    this.state = 'flying';
    this.plane.throttle = 0.35;
    this.setToast('Full throttle — rotate at 50 knots!');
  }

  setToast(text, seconds = 3) {
    this.toast = text;
    this.toastUntil = this.time + seconds;
  }

  timeText() {
    const s = Math.floor(this.elapsed);
    return String(Math.floor(s / 60)) + ':' + String(s % 60).padStart(2, '0');
  }

  missionProgressText() {
    if (this.mission.goal === 'rings') return 'RINGS ' + this.ringIndex + '/8';
    if (this.mission.goal === 'deliveries') return 'LEG ' + Math.min(this.legIndex + 1, 3) + '/3';
    return this.rescueStage === 'out' ? 'TO BEACON' : this.rescueStage === 'picked' ? 'HIKER ABOARD' : 'HOME';
  }

  objectiveText() {
    if (this.mission.goal === 'rings') {
      return this.ringIndex >= 8 ? 'Course clear — land at Skymail Field!' : 'Fly ring ' + (this.ringIndex + 1) + ' of 8';
    }
    if (this.mission.goal === 'deliveries') {
      const leg = this.mission.legs[Math.min(this.legIndex, 2)];
      return 'Deliver to ' + leg.name;
    }
    if (this.rescueStage === 'out') return 'Reach the beacon at Pine Ridge';
    if (this.rescueStage === 'picked') return 'Hiker aboard — fly home to Skymail Field';
    return 'Land at Skymail Field';
  }

  objectiveDistanceText() {
    const t = this.nextTarget();
    if (!t) return '';
    const d = Math.hypot(t.x - this.plane.x, t.z - this.plane.z);
    const bearing = Math.atan2(t.x - this.plane.x, t.z - this.plane.z);
    const rel = angleDiff(bearing, this.plane.heading);
    const arrow = rel > 0.3 ? '↻ right' : rel < -0.3 ? '↺ left' : '▲ ahead';
    return 'TARGET ' + Math.round(d) + ' m  ' + arrow + '  ·  ' + (t.name || ('RING ' + (this.ringIndex + 1)));
  }

  damageText() {
    return this.plane.damage > 0 ? 'DAMAGE ' + Math.round(this.plane.damage) + '%' : '';
  }

  nextTarget() {
    if (this.mission.goal === 'rings') {
      if (this.ringIndex < this.mission.rings.length) return this.mission.rings[this.ringIndex];
      return { x: 0, z: 0, name: 'SKYMAIL FIELD' };
    }
    if (this.mission.goal === 'deliveries') {
      return this.mission.legs[Math.min(this.legIndex, 2)];
    }
    if (this.rescueStage === 'out') return this.mission.beacon;
    return { x: 0, z: 0, name: 'SKYMAIL FIELD' };
  }

  // The camera sits behind and above the plane, easing after it so turns
  // never whip the view around.
  camera() {
    const p = this.plane;
    const back = 26, up = 7;
    return {
      x: p.x - Math.sin(p.heading) * back,
      z: p.z - Math.cos(p.heading) * back,
      y: p.y + up,
    };
  }

  update(input, dt) {
    this.time += dt;
    if (this.state === 'title') {
      if (input.wasPressed('1')) { this.selectMission(0); this.sound.click(); }
      else if (input.wasPressed('2')) { this.selectMission(1); this.sound.click(); }
      else if (input.wasPressed('3')) { this.selectMission(2); this.sound.click(); }
      else if (input.wasPressed('enter')) { this.selectMission(this.missionIndex); }
      return;
    }
    if (this.state === 'briefing') {
      if (input.wasPressed('enter') || input.wasPressed(' ')) this.startFlying();
      else if (input.wasPressed('escape')) this.state = 'title';
      return;
    }
    if (this.state === 'paused') {
      if (input.wasPressed('p') || input.wasPressed('escape')) this.state = 'flying';
      else if (input.wasPressed('r')) this.startFlying();
      return;
    }
    if (this.state === 'crashed' || this.state === 'complete') {
      if (input.wasPressed('r') || input.wasPressed('enter')) {
        if (this.state === 'complete') this.selectMission((this.missionIndex + 1) % MISSIONS.length);
        else this.startFlying();
      } else if (input.wasPressed('escape')) this.state = 'title';
      return;
    }
    if (this.state !== 'flying') return;

    // In-flight toggles.
    if (input.wasPressed('g')) {
      this.plane.gearDown = !this.plane.gearDown;
      this.setToast(this.plane.gearDown ? 'Gear down' : 'Gear up', 1.5);
      this.sound.click();
    }
    if (input.wasPressed('p')) { this.state = 'paused'; return; }
    if (input.wasPressed('r')) { this.startFlying(); return; }
    if (input.wasPressed('escape')) { this.state = 'title'; return; }
    this.plane.flaps = input.down(' ');

    this.elapsed += dt;
    const event = stepPlane(this.plane, input, dt, this.sound);
    this.sound.update(this.plane.throttle, this.plane.speed, this.plane.airborne);

    if (event === 'crash-terrain' || event === 'crash-hard') {
      this.state = 'crashed';
      const gh = groundHeight(this.plane.x, this.plane.z);
      this.crashReason = event === 'crash-hard'
        ? 'You hit the ground at ' + Math.round(Math.abs(this.plane.verticalSpeed)) + ' m/s — too hard to walk away from.'
        : 'You flew into the terrain at ' + Math.round(this.plane.y - gh) + ' m above the valley floor. Watch the hills — and your altitude.';
      return;
    }
    if (event === 'out-of-fuel' && this.plane.airborne) {
      this.setToast('Out of fuel — glide her down!', 3);
    }
    if (event === 'takeoff') this.setToast('Airborne! ' + this.objectiveText(), 3);

    // Landings: only count when the wheels stop on a runway.
    if ((event === 'touchdown-clean' || event === 'touchdown-rough') && this.plane.onGround) {
      this.onTouchdown(event === 'touchdown-clean');
    }

    // Rings: 3D distance to the next ring's centre.
    if (this.mission.goal === 'rings' && this.ringIndex < this.mission.rings.length) {
      const r = this.mission.rings[this.ringIndex];
      const d = Math.hypot(r.x - this.plane.x, (r.y - this.plane.y) * 0.6, r.z - this.plane.z);
      if (d < 17) {
        this.ringIndex++;
        this.score += SCORING.ring;
        this.sound.ring();
        this.setToast(this.ringIndex >= 8 ? 'Course clear! Land at Skymail Field' : 'Ring ' + this.ringIndex + ' of 8 — +100', 2);
      }
    }

    // Rescue pickup: stopped on the Pine Ridge strip.
    if (this.mission.goal === 'rescue' && this.rescueStage === 'out' && this.plane.onGround) {
      const b = this.mission.beacon;
      if (Math.hypot(b.x - this.plane.x, b.z - this.plane.z) < 110) {
        this.rescueStage = 'picked';
        this.score += SCORING.rescuePickup;
        servicePlane(this.plane);
        this.sound.success();
        this.setToast('Hiker aboard! Fuel topped up — fly home', 4);
      }
    }
  }

  onTouchdown(clean) {
    const p = this.plane;
    const rw = this.mission.runways.find((r) =>
      Math.hypot(r.x - p.x, r.z - p.z) < r.length / 2 + 40);
    if (!rw) return;
    this.sound.touchdown();
    if (this.mission.goal === 'rings') {
      if (this.ringIndex >= 8 && rw.name === 'SKYMAIL FIELD') {
        this.finish('Ring course flown and landed clean. The valley applauds.');
      } else {
        this.score += clean ? SCORING.landingClean : SCORING.landingRough;
        this.setToast((clean ? 'Clean landing +' : 'Rough landing +') + (clean ? 250 : 120) + ' — take off and keep flying', 3);
        // Back in the air: a touch-and-go keeps the sortie alive.
        p.onGround = false; p.airborne = true; p.y += 2;
        p.throttle = Math.max(p.throttle, 0.5);
      }
      return;
    }
    if (this.mission.goal === 'deliveries') {
      const leg = this.mission.legs[this.legIndex];
      if (leg && leg.name === rw.name) {
        this.legIndex++;
        this.score += SCORING.delivery + (clean ? SCORING.landingClean : SCORING.landingRough);
        servicePlane(p);
        if (this.legIndex >= this.mission.legs.length) {
          this.finish('All three parcels delivered, every strip landed. The valley runs on Skymail.');
        } else {
          this.sound.success();
          this.setToast('Delivered to ' + leg.name + ' +400 — refuelled. Next: ' + this.mission.legs[this.legIndex].name, 4);
          p.onGround = false; p.airborne = true; p.y += 2;
          p.throttle = Math.max(p.throttle, 0.5);
        }
      } else {
        this.score += clean ? SCORING.landingClean : 0;
        this.setToast('Wrong strip — the parcel goes to ' + (this.mission.legs[this.legIndex] || {}).name, 3);
        p.onGround = false; p.airborne = true; p.y += 2;
        p.throttle = Math.max(p.throttle, 0.5);
      }
      return;
    }
    if (this.mission.goal === 'rescue') {
      if (this.rescueStage === 'picked' && rw.name === 'SKYMAIL FIELD') {
        this.score += SCORING.rescueReturn;
        this.finish('Hiker home safe. That is why Skymail flies.');
      }
    }
  }

  finish(text) {
    const bonus = Math.max(0, Math.round((this.mission.parTime - this.elapsed) * SCORING.timeBonusPerSecond));
    this.score += bonus;
    this.completeText = text + ' Time bonus +' + bonus + '.';
    this.state = 'complete';
    this.sound.success();
    const key = this.mission.id;
    if (this.best[key] === null || this.score > this.best[key]) this.best[key] = this.score;
  }
}
