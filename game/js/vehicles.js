/* Arcade car physics + stealing/driving. One car = sim state + three.js mesh. */
import { CARS, STEP } from './config.js';
import { clamp, damp, angleLerp } from './utils.js';
import { buildCarMesh } from './world.js';

let nextId = 1;
export function createCar(scene, styleKey, x, z, heading, opts = {}) {
  const def = CARS[styleKey];
  const mesh = buildCarMesh(styleKey, opts.color);
  mesh.position.set(x, 0, z); mesh.rotation.y = heading;
  scene.add(mesh);
  const car = {
    id: nextId++, style: styleKey, def, mesh,
    x, z, heading, speed: 0, steer: 0,
    health: 100, maxHealth: 100, driver: null, // 'player' | 'traffic' | 'police' | null
    wanted: false, smoke: 0, brakeLight: 0,
    parked: !!opts.parked, mission: opts.mission || null,
    despawnAt: 0, sirenPhase: Math.random() * 6,
  };
  return car;
}
export function removeCar(scene, car) {
  scene.remove(car.mesh);
  car.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
}
/* Arcade drive step: throttle, steering that weakens with speed, handbrake slide. */
export function driveCar(car, input, dt, colliders) {
  const def = car.def;
  const throttle = (input.keys.has('KeyW') ? 1 : 0) - (input.keys.has('KeyS') ? 0.55 : 0);
  const steerIn = (input.keys.has('KeyA') ? 1 : 0) - (input.keys.has('KeyD') ? 1 : 0);
  const handbrake = input.keys.has('Space');
  const boost = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
  const targetSteer = steerIn * clamp(1 - Math.abs(car.speed) / (def.top * 1.4), 0.35, 1);
  car.steer = damp(car.steer, targetSteer, 8, dt);
  const accel = def.accel * (boost ? 1.25 : 1);
  if (throttle > 0) car.speed += accel * throttle * dt;
  else if (throttle < 0) car.speed += accel * throttle * dt * 1.4; // reverse / brake
  else car.speed = damp(car.speed, 0, handbrake ? 4 : 0.7, dt);
  if (handbrake) car.speed = damp(car.speed, 0, 2.2, dt);
  car.speed = clamp(car.speed, -def.top * 0.4, def.top * (boost ? 1.08 : 1));
  const grip = handbrake ? def.grip * 0.35 : def.grip;
  car.heading += car.steer * (car.speed / def.top) * grip * dt * (car.speed < 0 ? -1 : 1);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  // Building collision: slide along walls, take damage on hard hits.
  let hit = false;
  for (const box of colliders) {
    const cx = clamp(nx, box.minX - 1, box.maxX + 1), cz = clamp(nz, box.minZ - 1, box.maxZ + 1);
    if (Math.abs(nx - cx) < 1.1 && Math.abs(nz - cz) < 1.6) { hit = true; break; }
  }
  if (hit) {
    if (Math.abs(car.speed) > 9) car.health = Math.max(0, car.health - Math.abs(car.speed) * 0.55);
    car.speed *= -0.25;
  } else {
    car.x = nx; car.z = nz;
  }
  const half = 392;
  car.x = clamp(car.x, -half, half); car.z = clamp(car.z, -half, half);
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  // Wheel spin + front-wheel steer (visual only).
  const wheels = car.mesh.userData.wheels;
  if (wheels) {
    for (let i = 0; i < wheels.length; i++) {
      wheels[i].rotation.x += car.speed * dt * 0.9;
      if (i < 2) wheels[i].rotation.y = car.steer * 0.4;
    }
  }
  car.smoke = car.health < 45 ? 1 : car.health < 70 ? 0.4 : 0;
  return hit;
}
/* AI steering helper: steer a car toward a target point. */
export function steerToward(car, tx, tz, throttle, dt) {
  const want = Math.atan2(tx - car.x, tz - car.z);
  let d = ((want - car.heading + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  car.steer = damp(car.steer, clamp(d * 1.6, -1, 1), 6, dt);
  car.speed = damp(car.speed, throttle, 1.4, dt);
  car.heading += car.steer * (car.speed / car.def.top) * car.def.grip * dt * (car.speed < 0 ? -1 : 1);
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  const wheels = car.mesh.userData.wheels;
  if (wheels) for (let i = 0; i < wheels.length; i++) wheels[i].rotation.x += car.speed * dt * 0.9;
}
export function carSpeedKmh(car) { return Math.abs(car.speed) * 3.6; }
