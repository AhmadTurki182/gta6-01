/* Combat: melee punches and pistol shots. Shooting is a short-range cone
   test against peds, cops and mission targets — no raycaster needed. */
import { damagePlayer } from './player.js';

export function createCombat() {
  return { cooldown: 0, muzzleAt: -99, lastShotAt: -99, shotsFired: 0, hits: 0 };
}
/* Returns a list of hit descriptions for HUD/audio feedback. */
export function tryAttack(combat, game, dt, now) {
  combat.cooldown -= dt;
  const input = game.input;
  if (!input.attack || combat.cooldown > 0) return [];
  const player = game.player;
  const hits = [];
  const inCar = !!player.inCar;
  const px = inCar ? player.inCar.x : player.x;
  const pz = inCar ? player.inCar.z : player.z;
  const heading = inCar ? player.inCar.heading : player.camYaw + Math.PI;
  // In a car you cannot fight; on foot, LMB punches close or shoots far.
  if (inCar) return hits;
  combat.cooldown = 0.32;
  combat.shotsFired++;
  combat.lastShotAt = now; combat.muzzleAt = now;
  const range = 26, halfAngle = 0.32;
  const fx = Math.sin(heading), fz = Math.cos(heading);
  function tryHit(tx, tz, kind, obj, dmg) {
    const dx = tx - px, dz = tz - pz, d = Math.hypot(dx, dz);
    if (d > range || d < 0.4) return false;
    const dot = (dx * fx + dz * fz) / d;
    if (dot < Math.cos(halfAngle)) return false;
    hits.push({ kind, obj, dmg, d });
    return true;
  }
  // Mission target first (Mickey Sable).
  const mt = game.missions.target;
  if (mt && mt.alive) tryHit(mt.x, mt.z, 'target', mt, 25);
  for (const cop of game.police.foot) {
    if (tryHit(cop.x, cop.z, 'cop', cop, 34)) { cop.hp = (cop.hp ?? 100) - 34; }
  }
  for (const p of game.pedestrians.peds) {
    if (tryHit(p.x, p.z, 'ped', p, 50)) { p.state = 'panic'; p.stateUntil = 0; p.panicFromX = px; p.panicFromZ = pz; }
  }
  if (hits.length > 0) {
    combat.hits++;
    game.events.push({ type: 'shot', x: px, z: pz });
    game.wanted.heat = Math.min(520, game.wanted.heat + 12);
  } else {
    game.events.push({ type: 'shot', x: px, z: pz });
  }
  // Punch when something is very close: instant, no heat if it is the target.
  return hits;
}
/* Melee check used by the mission: is the target down? */
export function targetDown(mt) { return mt && mt.hp <= 0; }
