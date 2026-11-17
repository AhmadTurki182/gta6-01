/* Puerto Sol — tunables, names, story data. One place for every number the
   rest of the game reads, so balancing never means hunting through files. */
export const STEP = 1 / 60;
export const WORLD = {
  seed: 20261117,
  block: 96,          // metres per city block
  roads: 9,           // roads per axis -> 8x8 blocks
  roadHalf: 7,        // half width of a road
  size: 8 * 96 + 2 * 7, // ~782 m across
};
export const PLAYER = {
  walkSpeed: 6.5, sprintSpeed: 10.5, accel: 40, jumpVel: 8.5,
  radius: 0.55, height: 1.8, maxHealth: 100, maxArmor: 100,
};
export const CARS = {
  // name, top speed (m/s), accel, grip, colour, body style
  vento:   { name: 'Vento GT',   top: 46, accel: 22, grip: 2.6, color: 0xd7263d, style: 'sport' },
  manta:   { name: 'Manta',      top: 40, accel: 18, grip: 2.2, color: 0x2e6fdb, style: 'muscle' },
  atlas:   { name: 'Atlas Van',  top: 32, accel: 12, grip: 1.8, color: 0x3a3f44, style: 'van', armored: true },
  brisa:   { name: 'Brisa',      top: 34, accel: 15, grip: 2.4, color: 0xf2b705, style: 'sedan' },
  coral:   { name: 'Coral Cab',  top: 36, accel: 16, grip: 2.3, color: 0x12b5a5, style: 'taxi' },
  solmar:  { name: 'Solmar',     top: 30, accel: 13, grip: 2.0, color: 0xe8e3d8, style: 'sedan' },
  cruiser: { name: 'Cruiser',    top: 44, accel: 20, grip: 2.5, color: 0x101418, style: 'police' },
};
export const WANTED = {
  // heat thresholds per star, heat added per crime, decay per second unseen
  stars: [0, 80, 180, 300, 420, 520],
  crime: { steal: 90, assault: 60, kill: 120, speeding: 8, crash: 25 },
  decay: 14, unseenDelay: 8,
};
export const MISSIONS = [
  {
    id: 'valet', title: 'MISSION 1 — VALET HEAT',
    brief: 'Steal the Vento GT from the Solara Marina valet. Deliver the sealed case to Neon Pier. Keep the car above 50% health.',
    steps: [
      { key: 'gotoCar', text: 'Reach the Vento GT at Solara Marina', kind: 'car', car: 'vento' },
      { key: 'steal', text: 'Steal the Vento GT (press F)', kind: 'steal' },
      { key: 'deliver', text: 'Deliver the sealed case to Neon Pier — car health above 50%', kind: 'deliver' },
    ],
    reward: 800, rep: 25,
  },
  {
    id: 'ledger', title: 'MISSION 2 — THE LEDGER',
    brief: 'Loan shark Mickey Sable holds Halcyon\'s ledger at Neon Pier. Confront him on foot, grab the ledger, then lose the cops.',
    steps: [
      { key: 'gotoPier', text: 'Reach Neon Pier on foot', kind: 'goto' },
      { key: 'confront', text: 'Confront Mickey Sable — punch him down (LMB) then grab the ledger (E)', kind: 'fight' },
      { key: 'escape', text: 'Escape in a car and lose the cops (3 stars) — or reach the spray shop', kind: 'escape' },
    ],
    reward: 1500, rep: 40,
  },
  {
    id: 'meridian', title: 'MISSION 3 — MERIDIAN JOB',
    brief: 'Break into Meridian Tower\'s garage, steal the armored Atlas van holding Halcyon\'s evidence, and run the roadblocks to Puerto Sol Docks.',
    steps: [
      { key: 'gotoTower', text: 'Reach Meridian Tower garage', kind: 'goto' },
      { key: 'stealVan', text: 'Steal the Atlas armored van (press F)', kind: 'stealVan' },
      { key: 'deliver', text: 'Deliver the evidence to Lola Vega at Puerto Sol Docks — through the roadblocks', kind: 'deliver' },
    ],
    reward: 3000, rep: 60,
  },
];
export const PLACES = {
  marina: { x: 386, z: -274, label: 'Solara Marina' },
  pier: { x: 386, z: 276, label: 'Neon Pier' },
  tower: { x: 166, z: 111, label: 'Meridian Tower' },
  docks: { x: -386, z: 276, label: 'Puerto Sol Docks' },
  spray: { x: -386, z: -274, label: 'Spray Shop' },
  safehouse: { x: 56, z: 276, label: 'Safehouse' },
};
export const NAMES = {
  hero: 'Dario Fuentes', ally: 'Lola Vega', villain: 'Valeria Crass',
  mayor: 'Dorian Pike', shark: 'Mickey Sable', firm: 'Halcyon Group',
};
export const SAVE_KEY = 'puertosol-save-v1';
