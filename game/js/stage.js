/* Screenshot staging: drive the REAL game forward for a fixed number of
   1/60 s steps with scripted input, then freeze. No fake DOM scenes — every
   pixel comes from the live simulation. */
import { STEP, PLACES } from './config.js';
import { startMission } from './missions.js';
import { createCar } from './vehicles.js';
import { updateCamera } from './player.js';
import { starsForHeat } from './wanted.js';
import { updateHud } from './hud.js';
import { drawMinimap } from './minimap.js';

function runSteps(game, seconds, keys) {
  const n = Math.round(seconds / STEP);
  for (let i = 0; i < n; i++) {
    game.input.keys = new Set(keys);
    game.stepSim(STEP);
  }
  game.input.keys = new Set();
}
function putPlayerInCar(game, car) {
  const p = game.player;
  p.inCar = car; car.driver = 'player'; car.parked = false;
  p.x = car.x; p.z = car.z;
}
function placeCopBehind(game, x, z, heading) {
  const car = createCar(game.scene, 'cruiser', x, z, heading, {});
  car.driver = 'police'; car.speed = 24;
  game.police.cruisers.push(car);
  return car;
}
function setStars(game, stars) {
  game.wanted.heat = stars === 1 ? 100 : stars === 2 ? 190 : stars === 3 ? 320 : 0;
  game.wanted.stars = starsForHeat(game.wanted.heat);
}
function snapCamera(game) {
  const p = game.player;
  for (let i = 0; i < 120; i++) updateCamera(p, game.camRef.camera, game.input, STEP, p.inCar);
}
export function stageShot(name, game, seed) {
  const p = game.player;
  const cam = game.camRef;
  if (name === 'chase') {
    // Shot 1 (cover): Valet Heat — Vento GT racing south down the marina
    // road, two cruisers behind, 2 stars, mission banner, minimap route.
    startMission(game.missions, 0, game.time);
    const vento = game.missions.missionCar;
    putPlayerInCar(game, vento);
    vento.x = PLACES.marina.x; vento.z = PLACES.marina.z; vento.heading = 0;
    vento.speed = 18;
    p.camYaw = Math.PI;
    game.missions.step = 2;
    setStars(game, 2);
    // Clear traffic ahead so the chase reads at speed.
    for (let i = game.traffic.cars.length - 1; i >= 0; i--) {
      const t = game.traffic.cars[i];
      if (Math.abs(t.x - vento.x) < 30 && t.z > vento.z - 10 && t.z < vento.z + 140) {
        game.scene.remove(t.mesh); game.traffic.cars.splice(i, 1);
      }
    }
    placeCopBehind(game, vento.x + 8, vento.z - 26, 0);
    placeCopBehind(game, vento.x - 8, vento.z - 38, 0);
    runSteps(game, 1.8, ['KeyW']);
    // Frame the pursuit: pull the two cruisers into the camera's view,
    // flanking the Vento GT as the chase runs.
    const cops = game.police.cruisers.slice(-2);
    if (cops[0]) { cops[0].x = vento.x + 5; cops[0].z = vento.z - 6; cops[0].heading = vento.heading; cops[0].speed = vento.speed; cops[0].mesh.position.set(cops[0].x, 0, cops[0].z); cops[0].mesh.rotation.y = cops[0].heading; }
    if (cops[1]) { cops[1].x = vento.x - 5.5; cops[1].z = vento.z - 2; cops[1].heading = vento.heading; cops[1].speed = vento.speed; cops[1].mesh.position.set(cops[1].x, 0, cops[1].z); cops[1].mesh.rotation.y = cops[1].heading; }
    p.camYaw = Math.PI;
    game.missions.banner = 'ALARM TRIPPED — 2 STARS'; game.missions.bannerAt = game.time;
    game.missions.toast = 'Deliver the sealed case to Neon Pier — keep the car above 50% health.'; game.missions.toastAt = game.time;
  } else if (name === 'pier') {
    // Shot 2: The Ledger — on foot at Neon Pier facing Mickey Sable, 1 star.
    startMission(game.missions, 1, game.time);
    p.x = PLACES.pier.x - 8; p.z = PLACES.pier.z + 8;
    p.mesh.position.set(p.x, 0, p.z);
    p.camYaw = Math.atan2(PLACES.pier.x - p.x, PLACES.pier.z - p.z) + Math.PI;
    p.heading = Math.atan2(PLACES.pier.x - p.x, PLACES.pier.z - p.z);
    game.missions.step = 1;
    setStars(game, 1);
    runSteps(game, 0.3, []);
    p.camYaw = Math.atan2(PLACES.pier.x - p.x, PLACES.pier.z - p.z) + Math.PI;
    game.missions.toast = 'Confront Mickey Sable — punch him down (LMB) then grab the ledger (E).'; game.missions.toastAt = game.time;
  } else if (name === 'boulevard') {
    // Shot 3: rush-hour boulevard — player in a Coral Cab among traffic, no wanted.
    const cab = createCar(game.scene, 'coral', 0, 56, Math.PI / 2, {});
    game.cars.push(cab);
    putPlayerInCar(game, cab);
    cab.speed = 14;
    runSteps(game, 2.6, ['KeyW']);
    p.camYaw = Math.PI;
    game.missions.toast = 'Free roam — press M for a job. Traffic, peds and the whole city are yours.'; game.missions.toastAt = game.time;
  } else if (name === 'escape') {
    // Shot 4: Meridian Job — armored Atlas van racing west to the Docks,
    // roadblock ahead, 3 stars.
    startMission(game.missions, 2, game.time);
    const van = game.missions.missionCar;
    putPlayerInCar(game, van);
    van.x = -180; van.z = 276; van.heading = -Math.PI / 2; van.speed = 16;
    game.missions.step = 2;
    setStars(game, 3);
    placeCopBehind(game, van.x + 26, van.z - 6, -Math.PI / 2);
    const rb1 = createCar(game.scene, 'cruiser', -300, 272, Math.PI / 2, {});
    const rb2 = createCar(game.scene, 'cruiser', -300, 280, Math.PI / 2, {});
    game.police.cruisers.push(rb1, rb2);
    runSteps(game, 1.6, ['KeyW']);
    p.camYaw = Math.PI;
    game.missions.banner = '3 STARS — ROADBLOCKS AHEAD'; game.missions.bannerAt = game.time;
    game.missions.toast = 'Deliver the evidence to Lola Vega at Puerto Sol Docks.'; game.missions.toastAt = game.time;
  }
  // Snap the camera to its chase position and paint the frozen frame.
  snapCamera(game);
  updateHud(game.hudRef, game, game.time);
  drawMinimap(document.getElementById('minimap'), game);
  cam.renderer.render(cam.scene, cam.camera);
}
