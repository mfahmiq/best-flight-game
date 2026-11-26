// input.js — keyboard and mouse, nothing else.
// One job: turn physical input into a single control state the flight
// model reads every frame. Mouse steering and keys blend, never fight.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 0.5;      // 0..1 across the canvas
    this.mouseY = 0.5;      // 0..1 down the canvas
    this.mouseActive = false;
    this.mouseSeenAt = 0;
    this.pressed = new Set(); // edge-triggered keys, consumed by the game
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) / r.width;
      this.mouseY = (e.clientY - r.top) / r.height;
      this.mouseActive = true;
      this.mouseSeenAt = performance.now();
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.pressed.add('click');
      this.mouseActive = true;
    });
    // Touch: drag steers like the mouse.
    canvas.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      const r = canvas.getBoundingClientRect();
      this.mouseX = (t.clientX - r.left) / r.width;
      this.mouseY = (t.clientY - r.top) / r.height;
      this.mouseActive = true;
      e.preventDefault();
    }, { passive: false });
  }

  down(...names) { return names.some((n) => this.keys.has(n)); }
  wasPressed(name) { return this.pressed.has(name); }
  endFrame() { this.pressed.clear(); }

  // -1..1 bank command: keys win when held, otherwise the mouse position
  // relative to centre (with a dead zone so the plane flies straight when
  // the pointer rests near the middle).
  bankCommand() {
    let v = 0;
    if (this.down('a', 'arrowleft')) v -= 1;
    if (this.down('d', 'arrowright')) v += 1;
    if (v !== 0) return v;
    if (this.mouseActive && performance.now() - this.mouseSeenAt < 4000) {
      const d = this.mouseX - 0.5;
      if (Math.abs(d) > 0.04) return Math.max(-1, Math.min(1, d * 2.4));
    }
    return 0;
  }

  // -1..1 pitch command: up is positive (climb). Keys win over mouse.
  pitchCommand() {
    let v = 0;
    if (this.down('arrowup')) v += 1;
    if (this.down('arrowdown')) v -= 1;
    if (v !== 0) return v;
    if (this.mouseActive && performance.now() - this.mouseSeenAt < 4000) {
      const d = 0.5 - this.mouseY;
      if (Math.abs(d) > 0.05) return Math.max(-1, Math.min(1, d * 2.2));
    }
    return 0;
  }

  throttleDelta(dt) {
    let d = 0;
    if (this.down('w')) d += 1;
    if (this.down('s')) d -= 1;
    return d * dt * 0.55;
  }
}
