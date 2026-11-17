/* three.js scene: sun, sky, ground, roads, buildings, props, water.
   Car and pedestrian meshes are built here too, so vehicles.js and
   pedestrians.js stay simulation-only. */
import { WORLD, CARS } from './config.js';
import { mulberry32 } from './utils.js';

let THREE = null;
export function three() { return THREE; }

function facadeTexture(hue, floors, lit) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = `hsl(${Math.round(hue * 360)}, 32%, ${lit ? 58 : 42}%)`;
  g.fillRect(0, 0, 128, 256);
  const rows = Math.max(4, Math.min(24, floors));
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < 6; col++) {
      const x = 8 + col * 20, y = 10 + r * (236 / rows);
      const warm = Math.random() < 0.28;
      g.fillStyle = warm ? '#ffd98a' : (Math.random() < 0.5 ? '#9fc4e8' : '#2c3e55');
      g.fillRect(x, y, 13, 9);
    }
  }
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, 128, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function signTexture(text) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#101418'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = '#ff4d6d'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createWorld3D(city, seed) {
  THREE = window.THREE;
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87bfe8);
  scene.fog = new THREE.Fog(0xa8c8e0, 260, 900);
  const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 2200);
  camera.position.set(0, 30, 60);
  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('view'), antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const sun = new THREE.DirectionalLight(0xfff0d0, 2.6);
  sun.position.set(220, 320, 140);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -450; sun.shadow.camera.right = 450;
  sun.shadow.camera.top = 450; sun.shadow.camera.bottom = -450;
  sun.shadow.camera.far = 1000; sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x8a7a5a, 0.9));

  const half = city.half;
  // Ground: sand-coloured slab, roads drawn as dark strips on top.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 500, half * 2 + 500),
    new THREE.MeshLambertMaterial({ color: 0xc9b285 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2e3138 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e });
  for (const l of city.lines) {
    for (const [w, d, x, z] of [[half * 2 + 60, WORLD.roadHalf * 2, 0, l], [WORLD.roadHalf * 2, half * 2 + 60, l, 0]]) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
      r.rotation.x = -Math.PI / 2; r.position.set(x, 0.05, z); r.receiveShadow = true;
      scene.add(r);
    }
    // Centre dashes.
    for (let t = -half; t < half; t += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), lineMat);
      dash.rotation.x = -Math.PI / 2; dash.position.set(t, 0.09, l); scene.add(dash);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), lineMat);
      dash2.rotation.x = -Math.PI / 2; dash2.position.set(l, 0.09, t); scene.add(dash2);
    }
  }
  // Sidewalks: light strips beside every road.
  const walkMat = new THREE.MeshLambertMaterial({ color: 0xb9ac93 });
  for (const l of city.lines) {
    for (const off of [-WORLD.roadHalf - 2.2, WORLD.roadHalf + 2.2]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, 4.4), walkMat);
      s.rotation.x = -Math.PI / 2; s.position.set(0, 0.07, l + off); s.receiveShadow = true; scene.add(s);
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(4.4, half * 2), walkMat);
      s2.rotation.x = -Math.PI / 2; s2.position.set(l + off, 0.07, 0); s2.receiveShadow = true; scene.add(s2);
    }
  }
  // Sea: big blue planes east and south.
  const seaMat = new THREE.MeshPhongMaterial({ color: 0x1e7fa8, shininess: 120, specular: 0x99ddff });
  const seaE = new THREE.Mesh(new THREE.PlaneGeometry(420, half * 2 + 500), seaMat);
  seaE.rotation.x = -Math.PI / 2; seaE.position.set(half + 210, -0.4, 0); scene.add(seaE);
  const seaS = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 920, 420), seaMat);
  seaS.rotation.x = -Math.PI / 2; seaS.position.set(0, -0.4, half + 210); scene.add(seaS);
  // Beach strip.
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 500, 26), new THREE.MeshLambertMaterial({ color: 0xead9a8 }));
  beach.rotation.x = -Math.PI / 2; beach.position.set(0, 0.06, half + 8); scene.add(beach);

  // Buildings: one mesh per building (few dozen) with procedural facades.
  const facadeCache = new Map();
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);
  for (const b of city.buildings) {
    const key = `${b.hue.toFixed(2)}-${b.floors}`;
    if (!facadeCache.has(key)) facadeCache.set(key, facadeTexture(b.hue, b.floors, b.district === 'downtown'));
    const mat = new THREE.MeshLambertMaterial({ map: facadeCache.get(key) });
    const m = new THREE.Mesh(boxGeo, mat);
    m.scale.set(b.w, b.h, b.d);
    m.position.set(b.x, 0, b.z);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    // Rooftop AC box.
    const ac = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 3), new THREE.MeshLambertMaterial({ color: 0x8a929c }));
    ac.position.set(b.x + b.w * 0.2, b.h + 0.7, b.z); scene.add(ac);
    if (b.district === 'downtown' && b.h > 100) {
      // Meridian Tower beacon.
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 2.2, b.h * 1.6, 8, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xff4d6d, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
      beam.position.set(b.x, b.h * 0.8, b.z); scene.add(beam);
    }
  }
  for (const s of city.signs) {
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(16, 4),
      new THREE.MeshBasicMaterial({ map: signTexture(s.text) }));
    sm.position.set(s.x, s.h + 8, s.z); scene.add(sm);
  }
  // Palms: instanced trunk + fronds.
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 7, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
  const frondGeo = new THREE.ConeGeometry(2.6, 1.2, 6);
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2f9e44 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, city.palms.length);
  const fronds = new THREE.InstancedMesh(frondGeo, frondMat, city.palms.length);
  const dummy = new THREE.Object3D();
  city.palms.forEach((p, i) => {
    dummy.position.set(p.x, 3.5 * p.s, p.z); dummy.scale.setScalar(p.s); dummy.rotation.set(0, rng() * 6.28, 0);
    dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(p.x, 7.4 * p.s, p.z); dummy.updateMatrix(); fronds.setMatrixAt(i, dummy.matrix);
  });
  trunks.castShadow = true; scene.add(trunks); scene.add(fronds);
  // Street lamps: instanced poles + emissive heads.
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 8, 6);
  const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshLambertMaterial({ color: 0x3a3f44 }), city.lamps.length);
  city.lamps.forEach((p, i) => {
    dummy.position.set(p.x, 4, p.z); dummy.scale.setScalar(1); dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix(); poles.setMatrixAt(i, dummy.matrix);
  });
  scene.add(poles);
  const lampHeadGeo = new THREE.SphereGeometry(0.45, 8, 6);
  const lampHeads = new THREE.InstancedMesh(lampHeadGeo, new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), city.lamps.length);
  city.lamps.forEach((p, i) => {
    dummy.position.set(p.x, 8.1, p.z); dummy.updateMatrix(); lampHeads.setMatrixAt(i, dummy.matrix);
  });
  scene.add(lampHeads);

  // Mission beacon: a tall glowing column moved by missions.js.
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 90, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
  beacon.position.set(0, 45, -9999); scene.add(beacon);
  const beaconRing = new THREE.Mesh(new THREE.RingGeometry(2.2, 3.0, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  beaconRing.rotation.x = -Math.PI / 2; beaconRing.position.set(0, 0.15, -9999); scene.add(beaconRing);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  return { scene, camera, renderer, sun, beacon, beaconRing, resize };
}

/* Build a car mesh group. style: sport/muscle/van/sedan/taxi/police. */
export function buildCarMesh(styleKey, color) {
  const def = CARS[styleKey] || CARS.brisa;
  const g = new THREE.Group();
  const paint = new THREE.MeshPhongMaterial({ color: def.color ?? color, shininess: 90, specular: 0x666666 });
  const glass = new THREE.MeshPhongMaterial({ color: 0x1a2a3a, shininess: 140, specular: 0xaaaaaa });
  const dark = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const isVan = def.style === 'van';
  const bodyLen = isVan ? 5.6 : 4.4, bodyW = 2.0, bodyH = isVan ? 1.5 : 0.75;
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyLen), paint);
  body.position.y = 0.65; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.82, isVan ? 1.1 : 0.62, isVan ? 4.6 : 2.1), isVan ? paint : glass);
  cabin.position.set(0, isVan ? 1.7 : 1.25, isVan ? 0 : -0.25); cabin.castShadow = true; g.add(cabin);
  if (def.style === 'sport') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.5), dark);
    spoiler.position.set(0, 1.25, bodyLen / 2 - 0.1); g.add(spoiler);
  }
  if (def.style === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
    sign.position.set(0, 1.7, -0.25); g.add(sign);
  }
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.position.set(wx, 0.36, wz); w.castShadow = true; g.add(w); wheels.push(w);
  }
  // Headlights + taillights.
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const sx of [-0.65, 0.65]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.08), hl);
    h.position.set(sx, 0.7, -bodyLen / 2 - 0.02); g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.08), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    t.position.set(sx, 0.7, bodyLen / 2 + 0.02); g.add(t);
  }
  // Police light bar.
  let lightBar = null;
  if (def.style === 'police') {
    lightBar = new THREE.Group();
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    r.position.x = -0.35; const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    b.position.x = 0.35; lightBar.add(r); lightBar.add(b);
    lightBar.position.set(0, 1.62, -0.25); g.add(lightBar);
    const star = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    star.rotation.x = -Math.PI / 2; star.position.set(0, 1.03, 0.4); g.add(star);
  }
  g.userData = { wheels, lightBar, bodyLen };
  return g;
}

/* Simple articulated pedestrian: torso, head, legs that swing while walking. */
export function buildPedMesh(shirt, pants, skin) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.32), shirtMat);
  torso.position.y = 1.05; torso.castShadow = true; g.add(torso);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.32), skinMat);
  head.position.y = 1.62; head.castShadow = true; g.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.7, 0.22), pantsMat);
  legL.position.set(-0.15, 0.35, 0); legL.geometry.translate(0, -0.35, 0); legL.position.y = 0.7; g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.15; g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.18), shirtMat);
  armL.position.set(-0.38, 1.05, 0); armL.geometry.translate(0, -0.3, 0); armL.position.y = 1.35; g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.38; g.add(armR);
  g.userData = { legL, legR, armL, armR };
  return g;
}
/* Player mesh: Dario in a teal jacket, distinct from every ped. */
export function buildPlayerMesh() {
  const g = buildPedMesh(0x0e7c7b, 0x22262e, 0xc98d64);
  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.36), new THREE.MeshLambertMaterial({ color: 0xffd23f }));
  jacket.position.y = 1.32; g.add(jacket);
  return g;
}
