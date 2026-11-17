/* Pedestrians: sidewalk wanderers who stop, stroll, and panic (flee) when
   they hear gunshots, crashes or sirens nearby. */
import { mulberry32, pick, clamp } from './utils.js';
import { buildPedMesh } from './world.js';

const SHIRTS = [0xd7263d, 0x2e6fdb, 0xf2b705, 0x12b5a5, 0xe8e3d8, 0x8a5cf6, 0xff8c42, 0x3ddc84];
const PANTS = [0x22262e, 0x3a3f44, 0x5a4a3a, 0x1f3a5f];
const SKINS = [0xc98d64, 0x8a5a3b, 0xe8b98a, 0x6b4423, 0xf0c8a0];
export function createPedestrians(scene, city, seed, count) {
  const rng = mulberry32(seed ^ 0x77aa);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const mesh = buildPedMesh(pick(rng, SHIRTS), pick(rng, PANTS), pick(rng, SKINS));
    const p = randomSidewalkSpot(city, rng);
    mesh.position.set(p.x, 0, p.z);
    scene.add(mesh);
    peds.push({
      mesh, x: p.x, z: p.z, heading: rng() * Math.PI * 2,
      speed: 0, walkPhase: rng() * 6, state: 'walk', // walk | idle | panic
      stateUntil: 0, tx: p.x, tz: p.z, panicFromX: 0, panicFromZ: 0,
    });
  }
  return { peds, rng };
}
function randomSidewalkSpot(city, rng) {
  const l = pick(rng, city.lines);
  const horiz = rng() < 0.5;
  const along = -city.half + rng() * city.half * 2;
  const off = (rng() < 0.5 ? -1 : 1) * (7 + 2.2);
  return horiz ? { x: along, z: l + off } : { x: l + off, z: along };
}
export function panicPeds(ps, x, z, radius) {
  for (const p of ps.peds) {
    const d2 = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d2 < radius * radius) {
      p.state = 'panic'; p.stateUntil = 0;
      p.panicFromX = x; p.panicFromZ = z;
      p.heading = Math.atan2(p.x - x, p.z - z);
    }
  }
}
export function updatePedestrians(ps, city, dt, now) {
  for (const p of ps.peds) {
    let targetSpeed = 0;
    if (p.state === 'panic') {
      targetSpeed = 6.5;
      // Flee away from the scare point; after 6 s calm down.
      p.stateUntil += dt;
      if (p.stateUntil > 6) { p.state = 'walk'; p.stateUntil = 0; }
      const away = Math.atan2(p.x - p.panicFromX, p.z - p.panicFromZ);
      p.heading = away;
      p.tx = p.x + Math.sin(away) * 30; p.tz = p.z + Math.cos(away) * 30;
    } else if (p.state === 'idle') {
      if (now > p.stateUntil) { p.state = 'walk'; pickNewTarget(p, city, ps.rng); }
    } else {
      targetSpeed = 1.6;
      const d = Math.hypot(p.tx - p.x, p.tz - p.z);
      if (d < 2) {
        if (ps.rng() < 0.35) { p.state = 'idle'; p.stateUntil = now + 2 + ps.rng() * 5; }
        else pickNewTarget(p, city, ps.rng);
      } else {
        p.heading = Math.atan2(p.tx - p.x, p.tz - p.z);
      }
    }
    p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 4);
    p.x += Math.sin(p.heading) * p.speed * dt;
    p.z += Math.cos(p.heading) * p.speed * dt;
    p.x = clamp(p.x, -city.half, city.half); p.z = clamp(p.z, -city.half, city.half);
    p.walkPhase += p.speed * dt * 2.2;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    const swing = p.speed > 0.2 ? Math.sin(p.walkPhase * 2) * 0.5 : 0;
    const u = p.mesh.userData;
    u.legL.rotation.x = swing; u.legR.rotation.x = -swing;
    u.armL.rotation.x = -swing * 0.7; u.armR.rotation.x = swing * 0.7;
  }
}
function pickNewTarget(p, city, rng) {
  const spot = randomSidewalkSpot(city, rng);
  p.tx = spot.x; p.tz = spot.z;
}
export function nearestPed(ps, x, z, maxD) {
  let best = null, bd = maxD * maxD;
  for (const p of ps.peds) {
    const d2 = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d2 < bd) { bd = d2; best = p; }
  }
  return best;
}
