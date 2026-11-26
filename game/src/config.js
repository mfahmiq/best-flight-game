// config.js — every tunable number and every mission definition for Skymail.
// One job: constants. Nothing here draws, moves or sounds.
export const WORLD = {
  seed: 20261126,
  waterLevel: 6,          // terrain height below this is river/lake
  groundScale: 1,         // world units are metres-ish
  viewDistance: 1400,     // how far ahead the terrain renderer reaches
  gravity: 9.8,
};

export const PLANE = {
  minSpeed: 26,           // m/s — below this the wing stops flying (stall)
  maxSpeed: 95,           // m/s at full throttle, level
  cruiseSpeed: 62,
  climbRate: 9,           // m/s gained at full throttle + full pitch up
  turnRate: 0.55,         // rad/s at full bank
  maxBank: 1.05,          // rad (~60 deg)
  maxPitch: 0.42,         // rad
  fuelCapacity: 100,
  fuelBurnBase: 0.22,     // units/s at idle
  fuelBurnThrottle: 1.05, // extra units/s at full throttle
  gearSpeedLimit: 55,     // above this, gear down is draggy and risky
  safeTouchdown: 3.2,     // m/s vertical speed — gentler is a clean landing
  hardTouchdown: 6.5,     // m/s vertical speed — harder is damage, then crash
};

export const SCORING = {
  ring: 100,
  landingClean: 250,
  landingRough: 120,
  delivery: 400,
  rescuePickup: 500,
  rescueReturn: 600,
  timeBonusPerSecond: 5,
};

// Missions: three sorties sharing one valley. Runways and rings are placed
// in world coordinates; x is lateral, z is forward along the valley.
export const MISSIONS = [
  {
    id: 'rings',
    name: 'RING RUN',
    tagline: 'Thread all 8 rings over the valley. Fast and clean wins.',
    briefing: 'Take off from Skymail Field, fly the ring course down the valley. Each ring is +100. Finish under par time for a bonus. Mind your fuel — full throttle drinks it.',
    start: { x: 0, z: 0, y: 14, heading: 0 },
    fuel: 100,
    rings: [
      { x: 0, z: 420, y: 55 }, { x: -90, z: 780, y: 70 }, { x: 120, z: 1150, y: 60 },
      { x: -40, z: 1520, y: 85 }, { x: 180, z: 1900, y: 65 }, { x: -160, z: 2280, y: 90 },
      { x: 60, z: 2650, y: 70 }, { x: 0, z: 3020, y: 55 },
    ],
    runways: [{ x: 0, z: 0, heading: 0, length: 260, name: 'SKYMAIL FIELD' }],
    parTime: 150,
    goal: 'rings',
  },
  {
    id: 'courier',
    name: 'ISLAND COURIER',
    tagline: 'Deliver parcels to three airstrips. Land, refuel, next leg.',
    briefing: 'Three parcels, three strips: Otter Lake, Fox Hollow, then home. Land gently on each runway to deliver and refuel. A hard landing damages the plane; running dry ends the sortie.',
    start: { x: 0, z: 0, y: 14, heading: 0 },
    fuel: 100,
    legs: [
      { x: -260, z: 1500, name: 'OTTER LAKE' },
      { x: 300, z: 2900, name: 'FOX HOLLOW' },
      { x: 0, z: 0, name: 'SKYMAIL FIELD' },
    ],
    runways: [
      { x: 0, z: 0, heading: 0, length: 260, name: 'SKYMAIL FIELD' },
      { x: -260, z: 1500, heading: 0.35, length: 220, name: 'OTTER LAKE' },
      { x: 300, z: 2900, heading: -0.3, length: 220, name: 'FOX HOLLOW' },
    ],
    parTime: 420,
    goal: 'deliveries',
  },
  {
    id: 'rescue',
    name: 'MOUNTAIN RESCUE',
    tagline: 'A hiker is stranded at the high beacon. Bring them home.',
    briefing: 'Fly up-valley into the peaks to the beacon at Pine Ridge strip. The strip is short and the air is thin — come in slow, gear down, flaps out. Pick up the hiker, then fly them home to Skymail Field.',
    start: { x: 0, z: 0, y: 14, heading: 0 },
    fuel: 100,
    beacon: { x: -120, z: 3400, name: 'PINE RIDGE' },
    runways: [
      { x: 0, z: 0, heading: 0, length: 260, name: 'SKYMAIL FIELD' },
      { x: -120, z: 3400, heading: 0.15, length: 170, name: 'PINE RIDGE' },
    ],
    parTime: 360,
    goal: 'rescue',
  },
];

export const COLOURS = {
  skyTop: '#2f6fd0',
  skyMid: '#7fb2e8',
  skyLow: '#cfe6f7',
  sun: '#fff3c4',
  grass: ['#5d9b4a', '#6aa854', '#548c41', '#77b25e'],
  field: ['#c9a86a', '#b98d4f', '#a8b45e', '#8fae5a'],
  rock: '#8d8578',
  snow: '#eef3f6',
  sand: '#d9c48f',
  water: '#3f7fb8',
  waterDeep: '#2f6394',
  runway: '#3a3f46',
  runwayMark: '#f2f2e8',
  ring: '#ffb020',
  ringNext: '#ffcf4d',
  hudGlass: 'rgba(8, 18, 32, 0.55)',
  hudLine: '#9fe8ff',
  hudAmber: '#ffb020',
  hudRed: '#ff5346',
  hudGreen: '#7dffa8',
};
