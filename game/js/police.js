/* Police: patrol cruisers that investigate, pursue, ram and (on foot) chase;
   roadblocks at 3+ stars; sirens flash. Cops are cars + a few on-foot units. */
import { CARS } from './config.js';
import { mulberry32, clamp } from './utils.js';
import { createCar, removeCar, steerToward } from './vehicles.js';
import { buildPedMesh } from './world.js';
import { damagePlayer } from './player.js';

export function createPolice(scene, city, seed) {
  return { scene, city, rng: mulberry32(seed ^ 0xc0ffee), cruisers: [], foot: [], roadblock: null, spawnAt: 0 };
}
export function policeCountForStars(stars) {
  return stars === 0 ? 2 : stars === 1 ? 3 : stars === 2 ? 4 : stars === 3 ? 5 : 6;
}
function spawnCruiser(pol, px, pz, stars) {
  const rng = pol.rng;
  const ang = rng() * Math.PI * 2;
  const d = 70 + rng() * 60;
  let x = px + Math.sin(ang) * d, z = pz + Math.cos(ang) * d;
  x = clamp(x, -380, 380); z = clamp(z, -380, 380);
  const car = createCar(pol.scene, 'cruiser', x, z, Math.atan2(px - x, pz - z), {});
  car.driver = 'police'; car.speed = 10 + stars * 2;
  pol.cruisers.push(car);
  return car;
}
export function updatePolice(pol, game, dt, now) {
  const { player, wanted, city } = game;
  const px = player.inCar ? player.inCar.x : player.x;
  const pz = player.inCar ? player.inCar.z : player.z;
  const stars = wanted.stars;
  const want = policeCountForStars(stars);
  // Maintain the fleet: patrol cruisers when clean, pursuit units when wanted.
  if (pol.cruisers.length < want && now > pol.spawnAt) {
    spawnCruiser(pol, px, pz, stars);
    pol.spawnAt = now + 1.2;
  }
  let seen = false;
  for (const car of pol.cruisers) {
    const d = Math.hypot(car.x - px, car.z - pz);
    if (d < 120) seen = true;
    if (stars === 0) {
      // Patrol: cruise the roads near the player.
      const tx = car.x + Math.sin(car.heading) * 30;
      const tz = car.z + Math.cos(car.heading) * 30;
      steerToward(car, tx, tz, 10, dt);
      if (Math.random() < 0.002) car.heading += (Math.random() - 0.5) * 1.2;
    } else {
      // Pursuit: chase, and ram when close.
      const lead = player.inCar ? 0.35 : 0;
      const tx = px + (player.inCar ? Math.sin(player.inCar.heading) * player.inCar.speed * lead : 0);
      const tz = pz + (player.inCar ? Math.cos(player.inCar.heading) * player.inCar.speed * lead : 0);
      const top = Math.min(46, 30 + stars * 4);
      steerToward(car, tx, tz, top, dt);
      if (d < 4.5 && now - (car.lastRamAt || 0) > 0.6) {
        car.lastRamAt = now;
        // Ram: shove the player's car / hurt the player on foot.
        if (player.inCar) {
          player.inCar.speed *= 0.82;
          player.inCar.health = Math.max(0, player.inCar.health - 6 * dt);
          if (Math.random() < dt * 0.5) game.events.push({ type: 'crash', x: px, z: pz });
        } else if (now - (car.lastHit || 0) > 1.5) {
          car.lastHit = now;
          damagePlayer(player, 12, now);
          game.events.push({ type: 'hurt', x: px, z: pz });
        }
      }
      // On-foot cops: bail out when the player is slow on foot nearby.
      if (!player.inCar && d < 12 && pol.foot.length < 3 && Math.random() < dt * 0.4) {
        spawnFootCop(pol, car.x, car.z, px, pz);
      }
    }
    // Siren light bar flash.
    const bar = car.mesh.userData.lightBar;
    if (bar) {
      const ph = Math.floor(now * 6 + car.id) % 2;
      bar.children[0].material.color.setHex(ph === 0 ? 0xff2222 : 0x551111);
      bar.children[1].material.color.setHex(ph === 1 ? 0x2244ff : 0x111155);
    }
    // Despawn cruisers that fell far behind.
    if (d > 340) {
      const i = pol.cruisers.indexOf(car);
      removeCar(pol.scene, car);
      pol.cruisers.splice(i, 1);
    }
  }
  // Roadblock at 3+ stars: two cruisers parked across the road ahead.
  if (stars >= 3 && !pol.roadblock && now > (pol.roadblockAt || 0)) {
    pol.roadblock = makeRoadblock(pol, px, pz, player.inCar ? player.inCar.heading : player.heading);
    pol.roadblockAt = now + 25;
  }
  if (pol.roadblock && (stars < 3 || now > pol.roadblock.expiresAt)) {
    for (const c of pol.roadblock.cars) removeCar(pol.scene, c);
    pol.roadblock = null;
  }
  // On-foot cops chase and punch.
  for (let i = pol.foot.length - 1; i >= 0; i--) {
    const cop = pol.foot[i];
    const d = Math.hypot(cop.x - player.x, cop.z - player.z);
    if (player.inCar || d > 90 || stars === 0) {
      pol.scene.remove(cop.mesh); pol.foot.splice(i, 1); continue;
    }
    cop.heading = Math.atan2(player.x - cop.x, player.z - cop.z);
    cop.x += Math.sin(cop.heading) * 5.2 * dt;
    cop.z += Math.cos(cop.heading) * 5.2 * dt;
    cop.walkPhase += dt * 8;
    cop.mesh.position.set(cop.x, 0, cop.z);
    cop.mesh.rotation.y = cop.heading;
    const swing = Math.sin(cop.walkPhase) * 0.5;
    cop.mesh.userData.legL.rotation.x = swing; cop.mesh.userData.legR.rotation.x = -swing;
    if (d < 1.6 && now - (cop.lastHit || 0) > 1.2) {
      cop.lastHit = now;
      damagePlayer(player, 9, now);
      game.events.push({ type: 'hurt', x: player.x, z: player.z });
    }
  }
  return seen;
}
function spawnFootCop(pol, x, z, px, pz) {
  const mesh = buildPedMesh(0x101418, 0x101418, 0xc98d64);
  mesh.position.set(x, 0, z);
  pol.scene.add(mesh);
  pol.foot.push({ mesh, x, z, heading: Math.atan2(px - x, pz - z), walkPhase: 0, lastHit: 0 });
}
function makeRoadblock(pol, px, pz, heading) {
  // Two cruisers parked across the road, 55 m ahead of the player.
  const ax = px + Math.sin(heading) * 55, az = pz + Math.cos(heading) * 55;
  const cars = [];
  for (const off of [-4, 4]) {
    const perp = heading + Math.PI / 2;
    const car = createCar(pol.scene, 'cruiser', ax + Math.sin(perp) * off, az + Math.cos(perp) * off, heading + Math.PI / 2, {});
    car.driver = 'police'; car.speed = 0;
    cars.push(car);
  }
  return { cars, expiresAt: 0, x: ax, z: az };
}
export function clearPolice(pol) {
  for (const c of pol.cruisers) removeCar(pol.scene, c);
  pol.cruisers = [];
  for (const f of pol.foot) pol.scene.remove(f.mesh);
  pol.foot = [];
  if (pol.roadblock) { for (const c of pol.roadblock.cars) removeCar(pol.scene, c); pol.roadblock = null; }
}
