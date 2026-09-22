/* The engine: sea, yacht, islands, games, HUD. Text lives in content.js, island decorations in landmarks.js. */
import * as THREE from 'three';
import { SITE, ARCHIPELAGOS, CARDS } from './content.js?v=19';
import { audio } from './audio.js?v=19';
import { track, trackDwell } from './analytics.js?v=19';
import { LANDMARKS, PLANTS, mat, put, labelSprite, cardTex, cardMesh, chessPiece, hullGeometry } from './landmarks.js?v=19';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
const hex = (css) => parseInt(css.slice(1), 16);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const store = {
  get(k, d) { try { const v = localStorage.getItem('sail.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sail.' + k, JSON.stringify(v)); } catch {} },
};

const coarse = matchMedia('(pointer: coarse)').matches;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- plain (no-sailing) view, also the fallback when WebGL is missing ----------
$('plainName').textContent = SITE.name; $('plainTag').textContent = SITE.tagline;
$('plainSections').innerHTML = ARCHIPELAGOS.map(a => (a.radius ? `<h2 class="arch" style="border-color:${a.colour}">${a.title}</h2>` : '') +
  a.islands.filter(i => i.dock !== false).map(i => `<section><h3>${i.title}</h3>${i.html}</section>`).join('')).join('');
$('skip').onclick = () => { track('skip_sailing'); $('plain').classList.add('show'); };
$('backToSea').onclick = () => $('plain').classList.remove('show');
document.addEventListener('click', (e) => {          // App Store / Play / LinkedIn clicks
  const a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
  if (/apps\.apple\.com/.test(a.href)) track('store_click', { store: 'app_store' });
  else if (/play\.google\.com/.test(a.href)) track('store_click', { store: 'google_play' });
  else if (/linkedin\.com/.test(a.href)) track('contact_click', { via: 'linkedin' });
});
trackDwell();

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('sea'), antialias: true, powerPreference: 'high-performance' }); }
catch (e) { $('plain').classList.add('show'); $('backToSea').style.display = 'none'; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

// ---------- world constants ----------
const WORLD_R = 410;          // soft boundary
const MAX_SPEED = 19;         // units / s (shown as knots * 0.5)
const DOCK_R = 10;
const WAVE = calm ? 0.35 : 1;
const WIND = new THREE.Vector2(0.29, 0.957).normalize();   // direction the wind blows TOWARD (x, z). North is -z.
const HORIZON = 0xcfe9f5;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(HORIZON, 180, 560);
const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 1400);
scene.add(new THREE.HemisphereLight(0xdff3ff, 0x3b7a8c, 1.5));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.6); sun.position.set(-60, 90, -40); scene.add(sun);

// ---------- sky ----------
const sky = new THREE.Mesh(new THREE.SphereGeometry(1200, 24, 12), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color(0x3a86d4) }, horizon: { value: new THREE.Color(HORIZON) } },
  vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vP;
    void main(){ float h = clamp(normalize(vP).y, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.55)), 1.0);
    #include <colorspace_fragment>
    }`,
}));
scene.add(sky);
const clouds = new THREE.Group(); scene.add(clouds);
{ const r = rng(7), cm = mat(0xffffff);
  for (let i = 0; i < 12; i++) { const c = new THREE.Group();
    for (let j = 0; j < 4; j++) put(c, new THREE.IcosahedronGeometry(8 + r() * 8, 0), cm, (j - 1.5) * 11, r() * 4, r() * 8).scale.y = .55;
    c.position.set((r() - .5) * 900, 80 + r() * 40, (r() - .5) * 900); clouds.add(c); } }

// ---------- ocean ----------
const OCEAN_SIZE = 1500, OCEAN_SEG = 150, CELL = OCEAN_SIZE / OCEAN_SEG;
const oceanGeo = new THREE.PlaneGeometry(OCEAN_SIZE, OCEAN_SIZE, OCEAN_SEG, OCEAN_SEG).rotateX(-Math.PI / 2);
const ocean = new THREE.Mesh(oceanGeo, new THREE.MeshPhongMaterial({ color: 0x1b86b8, specular: 0x2c5f78, shininess: 25, flatShading: true }));
scene.add(ocean);
function waveHeight(x, z, t) { return WAVE * (0.55 * Math.sin(0.08 * x + 0.9 * t) + 0.4 * Math.sin(0.11 * z + 0.03 * x + 1.2 * t) + 0.5 * Math.sin(0.05 * (x + z) + 0.6 * t)); }
function updateOcean(t) { const p = oceanGeo.attributes.position, a = p.array, ox = ocean.position.x, oz = ocean.position.z;
  for (let i = 0; i < a.length; i += 3) a[i + 1] = waveHeight(a[i] + ox, a[i + 2] + oz, t); p.needsUpdate = true; }

// ---------- the yacht ----------
const boat = new THREE.Group(); boat.rotation.order = 'YXZ'; scene.add(boat);
const rig = {};
{
  const deck = new THREE.Shape(), k = .93; deck.moveTo(0, 4.8 * k); deck.bezierCurveTo(1.3 * k, 3 * k, 1.75 * k, .5 * k, 1.5 * k, -3.6 * k); deck.lineTo(-1.5 * k, -3.6 * k); deck.bezierCurveTo(-1.75 * k, .5 * k, -1.3 * k, 3 * k, 0, 4.8 * k);
  put(boat, hullGeometry(), mat(0x16324f, { roughness: .5 }));
  put(boat, new THREE.ExtrudeGeometry(deck, { depth: .08, bevelEnabled: false, curveSegments: 8 }).rotateX(Math.PI / 2), mat(0xc99a5b), 0, 1.09, 0);
  put(boat, new THREE.BoxGeometry(1.7, .6, 2.8), mat(0xf3efe6), 0, 1.38, .3); put(boat, new THREE.BoxGeometry(1.75, .08, 2.9), mat(0x16324f), 0, 1.72, .3);
  put(boat, new THREE.BoxGeometry(1.7, .06, 1.7), mat(0x8a6a3c), 0, 1.1, -2.4);
  put(boat, new THREE.BoxGeometry(.14, 1.7, 1.7), mat(0x0e2236), 0, -1.1, .3); put(boat, new THREE.BoxGeometry(.1, 1.2, .6), mat(0x0e2236), 0, -.5, -3.3);
  put(boat, new THREE.CylinderGeometry(.07, .1, 11, 6), mat(0xe9e4d8), 0, 6.5, 1);
  rig.pivot = new THREE.Group(); rig.pivot.position.set(0, 2.4, 1); boat.add(rig.pivot);
  put(rig.pivot, new THREE.CylinderGeometry(.07, .07, 4.3, 6).rotateX(Math.PI / 2), mat(0xe9e4d8), 0, 0, -2.15);
  const sailMat = mat(0xfaf3e3, { side: THREE.DoubleSide, roughness: 1 });
  const sail = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(12), 3)); g.setIndex([0, 3, 1, 1, 3, 2, 2, 3, 0]); return g; };
  rig.main = put(rig.pivot, sail(), sailMat); rig.jib = put(boat, sail(), sailMat);
  rig.flag = new THREE.Group(); rig.flag.position.set(0, 12.1, 1); boat.add(rig.flag);
  const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, .35, 0, 0, -.35, 0, 0, 0, 1.6]), 3));
  put(rig.flag, fg, new THREE.MeshBasicMaterial({ color: 0xe4572e, side: THREE.DoubleSide }));
}
function setSail(mesh, tack, head, clew, belly) {   // 3 corners + a belly point pushed to leeward
  const a = mesh.geometry.attributes.position, cx = (tack[0] + head[0] + clew[0]) / 3 + belly, cy = (tack[1] + head[1] + clew[1]) / 3 - .6, cz = (tack[2] + head[2] + clew[2]) / 3;
  a.setXYZ(0, ...tack); a.setXYZ(1, ...head); a.setXYZ(2, ...clew); a.setXYZ(3, cx, cy, cz); a.needsUpdate = true;
}

// ---------- archipelagos and islands ----------
const islands = [], decor = [], archs = [];   // decor = scenery islets you can't dock at
const ringMat = (color) => new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
  uniforms: { color: { value: new THREE.Color(color) }, pulse: { value: 1 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 color; uniform float pulse; varying vec2 vUv; void main(){ float a = pow(1.0 - vUv.y, 1.5) * .9 * pulse; gl_FragColor = vec4(color, a);
    #include <colorspace_fragment>
    }`,
});
const newDot = (colour) => { const d = document.createElement('div'); d.className = 'dot'; if (colour) { d.style.setProperty('--c', colour); d.classList.add('arch'); } $('rose').appendChild(d); return d; };

function buildIsland(cfg, x, z, arch, dir) {
  const st = { size: 16, shape: 'hill', height: 1.6, sand: 0xf0dca0, mound: 0x57b368, rock: 0x8d9aa3, plants: 'palms', plantCount: 5, rocks: 6, ...cfg.style };
  const n = islands.length + decor.length, canDock = cfg.dock !== false, r = rng(n * 97 + 3), R = st.size, g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  let top = 1.6;
  if (st.shape === 'pontoon') { put(g, new THREE.CylinderGeometry(R, R, .5, 8), mat(0xa47a48), 0, 1.35, 0);
    for (let i = 0; i < 6; i++) put(g, new THREE.CylinderGeometry(.9, .9, 1.3, 8), mat(0x2a6f97), Math.cos(i * 1.047) * R * .75, .5, Math.sin(i * 1.047) * R * .75); st.plants = 'none'; st.rocks = 0; }
  else {
    put(g, new THREE.CylinderGeometry(R, R + 6, 2.6, 11), mat(st.sand), 0, .4, 0);
    if (st.shape === 'plateau') { put(g, new THREE.CylinderGeometry(R * .74, R * .8, st.height, 10), mat(st.mound), 0, 1.6 + st.height / 2, 0).rotation.y = r() * 6; top = 1.6 + st.height; }
    else if (st.shape === 'crag') { put(g, new THREE.CylinderGeometry(R * .62, R * .8, 4.2, 7), mat(st.mound), 0, 3.7, 0).rotation.y = r() * 6; top = 5.8;
      for (let i = 0; i < 6; i++) { const a = r() * 6.28, s = 2 + r() * 2.5; put(g, new THREE.DodecahedronGeometry(s, 0), mat(st.mound), Math.cos(a) * R * .74, 2 + s * .4, Math.sin(a) * R * .74).rotation.set(r() * 3, r() * 3, 0); } }
    else { const m = put(g, new THREE.IcosahedronGeometry(R * .78, 1), mat(st.mound), 0, 1.5, 0); m.scale.y = .36; m.rotation.y = r() * 6; top = 1.5 + R * .78 * .36 - .5;
      if (st.shape === 'peaks') put(g, new THREE.IcosahedronGeometry(R * .45, 1), mat(st.mound), R * .45, 1.5, -R * .3).scale.y = .8; }
  }
  if (st.turn) { const a = Math.atan2(dir[0], dir[1]) - st.turn * Math.PI / 180; dir = [Math.sin(a), Math.cos(a)]; }   // turn: degrees clockwise seen from above (landmark, jetty and dock ring together)
  const isl = { cfg, g, R, x, z, arch, dir, found: false, perches: [] };
  const lm = new THREE.Group(); lm.rotation.y = Math.atan2(dir[0], dir[1]); g.add(lm);
  const h = (LANDMARKS[cfg.landmark] || LANDMARKS.palm)(lm, top, isl, r) * (st.landmarkScale || 1);
  if (st.landmarkScale) { lm.scale.setScalar(st.landmarkScale); lm.position.y = top * (1 - st.landmarkScale); }
  const plant = PLANTS[st.plants];
  for (let i = 0; plant && i < st.plantCount; i++) { const a = r() * 6.28, d = R * (.84 + r() * .1); plant(g, Math.cos(a) * d, 1.6, Math.sin(a) * d, r); }
  for (let i = 0; i < st.rocks; i++) { const a = r() * 6.28, d = R + 1 + r() * 4, s = .8 + r() * 1.6;
    put(g, new THREE.DodecahedronGeometry(s, 0), mat(st.rock), Math.cos(a) * d, .6, Math.sin(a) * d).rotation.set(r() * 3, r() * 3, 0); isl.perches.push([x + Math.cos(a) * d, .6 + s * .85, z + Math.sin(a) * d]); }
  const label = labelSprite(cfg.title); label.position.set(0, top + h + 2.5, 0); g.add(label); isl.label = label;
  isl.dockX = x + dir[0] * (R + 18); isl.dockZ = z + dir[1] * (R + 18);
  if (!canDock) { label.scale.multiplyScalar(.8); decor.push(isl); return isl; }
  const jetty = new THREE.Group(); jetty.rotation.y = Math.atan2(dir[0], dir[1]); g.add(jetty);
  put(jetty, new THREE.BoxGeometry(2.4, .3, 14), mat(0xa47a48), 0, 2, R + 5);
  for (const jz of [R + 1, R + 6, R + 11.5]) for (const jx of [-1, 1]) put(jetty, new THREE.CylinderGeometry(.22, .22, 4.5, 5), mat(0x6e4f2c), jx, .3, jz);
  isl.ring = put(scene, new THREE.CylinderGeometry(DOCK_R, DOCK_R, 7, 40, 1, true), ringMat(0xf2b84b), isl.dockX, 3, isl.dockZ);
  isl.dot = newDot(); islands.push(isl); arch.islands.push(isl); return isl;
}
for (const A of ARCHIPELAGOS) {
  const [cx, cz] = A.centre, far = Math.atan2(cx, cz), ring = A.islands.filter(i => i.entrance == null && i.angle == null && !i.at), sweep = (A.sweep ?? 250) * Math.PI / 180;
  const arch = { cfg: A, x: cx, z: cz, islands: [], reach: (A.radius || 0) + 80, home: [-Math.sin(far), -Math.cos(far)], dot: A.radius ? newDot(A.colour) : null }; archs.push(arch);
  for (const cfg of A.islands) {
    let x = cx, z = cz, dir = [0, 1];
    if (cfg.at) { x = cx + cfg.at[0]; z = cz + cfg.at[1]; const l = Math.hypot(...cfg.at); dir = [-cfg.at[0] / l, -cfg.at[1] / l]; }
    else if (A.radius) {
      if (cfg.entrance != null) { x = cx + arch.home[0] * cfg.entrance; z = cz + arch.home[1] * cfg.entrance; }
      else { const k = ring.indexOf(cfg), a = far + (cfg.angle != null ? cfg.angle * Math.PI / 180 : ring.length > 1 ? (k / (ring.length - 1) - .5) * sweep : 0); x = cx + Math.sin(a) * A.radius; z = cz + Math.cos(a) * A.radius; }
      const l = Math.hypot(cx - x, cz - z); dir = [(cx - x) / l, (cz - z) / l];
    }
    buildIsland(cfg, x, z, arch, dir);
  }
  if (A.radius) { const t = labelSprite(A.title); t.scale.set(84, 21, 1); t.position.set(cx, 62, cz); scene.add(t); arch.title = t; }
}
const byId = (id) => islands.find(i => i.cfg.id === id) || decor.find(i => i.cfg.id === id);
{ // Home island: a marina-style name board over the jetty, a signpost to the four archipelagos, the keeper's cottage, a moored dinghy
  const home = islands[0], R = home.R, f = new THREE.Group(); f.rotation.y = Math.atan2(home.dir[0], home.dir[1]); home.g.add(f);   // local +z points at the dock
  const hillY = (x, z) => 1.2 + .36 * Math.sqrt(Math.max(0, Math.pow(R * .78, 2) - x * x - z * z));
  const textPlane = (text, w, h, fg, font, parent, x, y, z, ry = 0) => { const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w); const k = c.getContext('2d');
    k.fillStyle = fg; k.textAlign = 'center'; k.textBaseline = 'middle'; let px = c.height * .62; do { k.font = `${font} ${px}px Georgia, serif`; px -= 2; } while (k.measureText(text).width > 960 && px > 10); k.fillText(text, 512, c.height / 2 + 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = put(parent, new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true }), x, y, z); m.rotation.y = ry; return m; };
  // the name board: two posts and a navy board with a thin gold trim, readable from both sides
  const navy = mat(0x10263a), gold = mat(0xf2b84b), wood = mat(0x6e4f2c), zb = R - 1.5;
  for (const x of [-5.6, 5.6]) { put(f, new THREE.CylinderGeometry(.28, .34, 9, 8), wood, x, 5.5, zb); put(f, new THREE.SphereGeometry(.42, 8, 6), gold, x, 10.1, zb); }
  put(f, new THREE.BoxGeometry(11.6, 2.5, .3), navy, 0, 8.2, zb); for (const y of [6.9, 9.5]) put(f, new THREE.BoxGeometry(11.6, .14, .36), gold, 0, y, zb);
  textPlane(SITE.name, 10.8, 1.9, '#ffffff', '700', f, 0, 8.2, zb + .17); textPlane(SITE.name, 10.8, 1.9, '#ffffff', '700', f, 0, 8.2, zb - .17, Math.PI);
  // signpost: one coloured arrow per archipelago, pointing the real way
  const sp = new THREE.Group(); sp.position.set(9, 1.6, R - 6); sp.rotation.y = -f.rotation.y; f.add(sp); put(sp, new THREE.CylinderGeometry(.16, .2, 8, 6), wood, 0, 4, 0);
  archs.filter(a => a.cfg.radius).forEach((a, i) => { const arm = new THREE.Group(); arm.position.y = 7.4 - i * 1.15; arm.rotation.y = Math.atan2(-(a.z - home.z), a.x - home.x); sp.add(arm);
    put(arm, new THREE.BoxGeometry(4.6, .9, .14), mat(hex(a.cfg.colour)), 2.5, 0, 0); const tip = put(arm, new THREE.ConeGeometry(.64, .8, 4), mat(hex(a.cfg.colour)), 5.1, 0, 0); tip.rotation.set(0, Math.PI / 4, -Math.PI / 2); tip.scale.z = .16;
    textPlane(a.cfg.title, 4.3, .7, '#10263a', '700', arm, 2.5, 0, .08); textPlane(a.cfg.title, 4.3, .7, '#10263a', '700', arm, 2.5, 0, -.08, Math.PI); });
  // keeper's cottage, bench and telescope on the hill
  const cx = -9, cz = 5, cy = hillY(cx, cz) - .3, cot = new THREE.Group(); cot.position.set(cx, cy, cz); cot.rotation.y = .5; f.add(cot);
  put(cot, new THREE.BoxGeometry(4.4, 2.8, 3.4), mat(0xfaf8f2), 0, 1.4, 0); const rf = put(cot, new THREE.CylinderGeometry(1, 1, 1, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), mat(0xe4572e), 0, 2.8 + .55, 0); rf.scale.set(4.8, 1.1, 2.2);
  put(cot, new THREE.BoxGeometry(.9, 1.8, .1), navy, -.8, .9, 1.72); put(cot, new THREE.BoxGeometry(.9, .8, .1), mat(0x9fd3e6), 1, 1.6, 1.72); put(cot, new THREE.BoxGeometry(.6, 1.6, .6), mat(0x8d9aa3), 1.3, 3.6, -.6);
  const bx = 6, bz = 9, by = hillY(bx, bz) - .25; put(f, new THREE.BoxGeometry(2.4, .16, .7), wood, bx, by + .7, bz); put(f, new THREE.BoxGeometry(2.4, .7, .12), wood, bx, by + 1.15, bz - .32); for (const x of [-1, 1]) put(f, new THREE.BoxGeometry(.14, .7, .6), wood, bx + x, by + .35, bz);
  const tx = 2.5, tz = 12, ty = hillY(tx, tz) - .2; for (let i = 0; i < 3; i++) put(f, new THREE.CylinderGeometry(.05, .05, 1.8, 4), navy, tx + Math.cos(i * 2.1) * .35, ty + .8, tz + Math.sin(i * 2.1) * .35).rotation.set(Math.sin(i * 2.1) * .35, 0, -Math.cos(i * 2.1) * .35);
  const tel = put(f, new THREE.CylinderGeometry(.14, .2, 1.8, 8).rotateX(Math.PI / 2), gold, tx, ty + 1.75, tz + .2); tel.rotation.x = -.18;
  // a dinghy on a mooring beside the jetty
  const dg = new THREE.Group(); dg.position.set(-7, .15, R + 8); dg.rotation.y = .5; dg.scale.setScalar(.42); f.add(dg); put(dg, hullGeometry(), mat(0xffffff)); put(dg, new THREE.CylinderGeometry(.08, .08, 8, 5), mat(0xe9e4d8), 0, 5, 1);
  put(f, new THREE.SphereGeometry(.6, 8, 6), mat(0xe4572e), -7.6, .2, R + 12);
}

// ---------- scenery in the open water: sea stacks, a rock arch, sandbars, wrecks. All solid. ----------
const solids = [...islands, ...decor];
{
  const rock = mat(0x7f8a91), r = rng(41), G = (x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r() * 6; scene.add(g); return g; };
  const stacks = (x, z) => { const g = G(x, z); [[0, 0, 3.2, 15], [4.5, 2, 2.4, 9], [-3, 4, 2, 6], [2, -4.5, 1.6, 4]].forEach(([dx, dz, w, h]) => { put(g, new THREE.CylinderGeometry(w * .7, w, h, 6), rock, dx, h / 2 - 1, dz).rotation.y = r() * 3; put(g, new THREE.ConeGeometry(w * .75, 1.2, 6), mat(0x57b368), dx, h - .5, dz); }); solids.push({ x, z, R: 2 }); };
  const arch = (x, z) => { const g = G(x, z); for (const dx of [-5.5, 5.5]) put(g, new THREE.CylinderGeometry(2.2, 3, 11, 6), rock, dx, 4.5, 0); const top = put(g, new THREE.DodecahedronGeometry(4.5, 0), rock, 0, 11, 0); top.scale.set(2, .55, .9); put(g, new THREE.ConeGeometry(2.5, 1, 6), mat(0x57b368), 0, 13.2, 0).scale.x = 2.2; solids.push({ x, z, R: 3 }); };
  const sandbar = (x, z) => { const g = G(x, z); put(g, new THREE.CylinderGeometry(8, 11, 2, 9), mat(0xf0dca0), 0, 0, 0); PLANTS.palms(g, 1, .9, -1, r); PLANTS.palms(g, -2.5, .9, 2, r);
    put(g, new THREE.BoxGeometry(2.6, .1, 1), mat(0xe4572e), 3, 1.1, 2).rotation.y = .5; put(g, new THREE.ConeGeometry(1.6, .8, 8), mat(0xf2b84b), 3.4, 3, 1.2); put(g, new THREE.CylinderGeometry(.06, .06, 2.4, 4), mat(0xffffff), 3.4, 2, 1.2); solids.push({ x, z, R: 4 }); };
  const wreck = (x, z) => { const g = G(x, z), wood = mat(0x5b4632); const h = put(g, hullGeometry(), wood, 0, -.3, 0); h.scale.setScalar(1.7); h.rotation.set(.25, 0, .5);
    put(g, new THREE.CylinderGeometry(.18, .24, 11, 6), wood, 1.4, 4, 1).rotation.z = -.55; put(g, new THREE.CylinderGeometry(.1, .1, 5, 5), wood, 3.4, 6.6, 1).rotation.z = 1.1;
    const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([2, 4.6, 1, 5.6, 6.3, 1, 3.4, 1.6, 1.4]), 3)); tri.computeVertexNormals(); put(g, tri, new THREE.MeshStandardMaterial({ color: 0xd9d2bd, side: THREE.DoubleSide, flatShading: true }));
    for (let i = 0; i < 3; i++) put(g, new THREE.DodecahedronGeometry(1.6 + r(), 0), rock, -4 + i * 3.5, -.2, -3 + r() * 2); solids.push({ x, z, R: 2 }); };
  stacks(-12, 118); stacks(30, -95); arch(-140, -62); sandbar(-80, 95); sandbar(112, -22); wreck(-265, 215); wreck(255, -175);
}
const spot = (isl, along, side) => [isl.dockX + isl.dir[0] * along - isl.dir[1] * side, isl.dockZ + isl.dir[1] * along + isl.dir[0] * side];   // a point relative to an island's dock

// ---------- floaters: anything the boat can ram. Simple 2D physics on the water surface ----------
const floaters = [], walls = [];
const HULL = [3, 0, -2.6], HULL_R = 1.5;        // the boat as three circles along its centreline
function addWall(x, z, nx, nz, half, th, extra = {}) { const phi = Math.atan2(nx, nz), w = { x, z, nx, nz, tx: Math.cos(phi), tz: -Math.sin(phi), half, th, phi, ...extra }; walls.push(w); return w; }
function addFloater(mesh, x, z, o = {}) {
  const f = { mesh, x, z, px: x, pz: z, vx: 0, vz: 0, r: 1, m: 1, e: .5, drag: 1.3, yOff: 0, tilt: .12, spin: 0, idle: 0, cd: 0, home: [x, z], atHome: true, returning: false, roll: false, ...o };
  scene.add(mesh); floaters.push(f); return f;
}
const wake = []; let wakeI = 0, wakeT = 0;
{ const geo = new THREE.CircleGeometry(1, 10).rotateX(-Math.PI / 2);
  for (let i = 0; i < 48; i++) { const m = put(scene, geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); m.userData.life = 0; wake.push(m); } }
function puff(x, z, grow, scale = .7) { const w = wake[wakeI++ % wake.length]; w.userData.life = 1; w.userData.grow = grow; w.position.set(x, 0, z); w.scale.setScalar(scale); }
const _axis = new THREE.Vector3();
function updateFloaters(dt, s, fx, fz) {
  const bvx = fx * s.speed, bvz = fz * s.speed;
  for (const f of floaters) {
    if (f.dead) continue;
    f.cd -= dt; f.px = f.x; f.pz = f.z;
    for (const off of HULL) {                                                   // boat → floater
      const cx = s.x + fx * off, cz = s.z + fz * off, dx = f.x - cx, dz = f.z - cz, d = Math.hypot(dx, dz), min = f.r + HULL_R;
      if (d >= min || d < 1e-4) continue;
      const nx = dx / d, nz = dz / d, vrel = (bvx - f.vx) * nx + (bvz - f.vz) * nz;
      f.x = cx + nx * min; f.z = cz + nz * min; f.idle = 0; f.returning = false; f.atHome = false;
      if (vrel > 0) { const j = vrel * (1 + f.e) * 8 / (8 + f.m); f.vx += nx * j; f.vz += nz * j; f.spin += (Math.random() - .5) * vrel * .8;
        if (f.cd <= 0) { f.cd = .4; s.speed *= 1 - Math.min(.2, .035 * f.m); if (vrel > 3) { puff(f.x, f.z, 2 + vrel * .25, 1); audio.play('thud', Math.min(1, vrel / 12)); } if (f.onHit) f.onHit(vrel); } }
    }
    const sp = Math.hypot(f.vx, f.vz);
    if (f.returning) {                                                          // drifting back to where it started
      const hx = f.home[0] - f.x, hz = f.home[1] - f.z, hd = Math.hypot(hx, hz);
      if (hd < .2) { f.x = f.home[0]; f.z = f.home[1]; f.vx = f.vz = 0; f.returning = false; f.atHome = true; f.idle = 0; if (f.onHome) f.onHome(); }
      else { const v = Math.min(f.homeSpeed || 3.5, hd + .4); f.vx = hx / hd * v; f.vz = hz / hd * v; }
    } else if (!f.atHome) { f.idle = sp < .4 ? f.idle + dt : 0; if (f.idle > 18) f.returning = true; }
    f.x += f.vx * dt; f.z += f.vz * dt;
    if (!f.returning) { const k = Math.exp(-f.drag * dt); f.vx *= k; f.vz *= k; }
    for (const i of solids) { const dx = f.x - i.x, dz = f.z - i.z, d = Math.hypot(dx, dz), min = i.R + 6.5 + f.r;      // islands and rocks
      if (d < min) { const nx = dx / d, nz = dz / d, vn = f.vx * nx + f.vz * nz; f.x = i.x + nx * min; f.z = i.z + nz * min; if (vn < 0) { f.vx -= 1.6 * vn * nx; f.vz -= 1.6 * vn * nz; } } }
    if (!f.returning) for (const w of walls) { const t = (f.x - w.x) * w.tx + (f.z - w.z) * w.tz, d = (f.x - w.x) * w.nx + (f.z - w.z) * w.nz;   // walls
      if (Math.abs(t) < w.half + f.r * .5 && Math.abs(d) < w.th + f.r) { const sg = d >= 0 ? 1 : -1, vn = f.vx * w.nx + f.vz * w.nz;
        f.x += w.nx * (sg * (w.th + f.r) - d); f.z += w.nz * (sg * (w.th + f.r) - d);
        if (vn * sg < 0) { f.vx -= 1.85 * vn * w.nx; f.vz -= 1.85 * vn * w.nz; if (f.onWall && Math.abs(vn) > 1) f.onWall(w, t); } } }
    f.mesh.position.set(f.x, waveHeight(f.x, f.z, s.t) * .8 + f.yOff, f.z);
    if (f.roll) { if (sp > .05) { _axis.set(f.vz, 0, -f.vx).normalize(); f.mesh.rotateOnWorldAxis(_axis, sp * dt / f.r); } }
    else { f.mesh.rotation.y += f.spin * dt; f.spin *= Math.exp(-1.5 * dt); f.mesh.rotation.x = Math.cos(s.t * 1.1 + f.z) * f.tilt; f.mesh.rotation.z = Math.sin(s.t * 1.3 + f.x) * f.tilt; }
  }
  for (let a = 0; a < floaters.length; a++) { const p = floaters[a]; if (p.returning || p.dead) continue;                                   // floater ↔ floater
    for (let b = a + 1; b < floaters.length; b++) { const q = floaters[b]; if (q.returning || q.dead || (p.atHome && q.atHome)) continue;
      const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz), min = p.r + q.r; if (d >= min || d < 1e-4) continue;
      const nx = dx / d, nz = dz / d, push = (min - d) / 2, vrel = (p.vx - q.vx) * nx + (p.vz - q.vz) * nz, tm = p.m + q.m;
      p.x -= nx * push; p.z -= nz * push; q.x += nx * push; q.z += nz * push; p.atHome = q.atHome = false;
      if (vrel > 0) { const j = vrel * 1.5; p.vx -= nx * j * q.m / tm; p.vz -= nz * j * q.m / tm; q.vx += nx * j * p.m / tm; q.vz += nz * j * p.m / tm; } } }
}

// ---------- route buoys: a colour-coded line from Home towards each archipelago ----------
for (const A of archs) { if (!A.cfg.radius) continue;
  const len = Math.hypot(A.x, A.z), ux = A.x / len, uz = A.z / len, col = hex(A.cfg.colour); let k = 0;
  for (let d = 62; d < len - A.cfg.radius - 30; d += 36, k++) { const g = new THREE.Group(), side = k % 2 ? 7 : -7;
    put(g, new THREE.CylinderGeometry(.9, 1.1, 1.2, 8), mat(col), 0, .3, 0); put(g, new THREE.ConeGeometry(.7, 2.2, 8), mat(col), 0, 2, 0);
    put(g, new THREE.SphereGeometry(.28, 6, 5), mat(0xfff3b0, { emissive: 0xffd24a, emissiveIntensity: 1 }), 0, 3.3, 0);
    addFloater(g, ux * d - uz * side, uz * d + ux * side, { r: 1.1, m: 3, drag: 1.8 }); } }

// ---------- wind streaks ----------
const streaks = [];
{ const geo = new THREE.PlaneGeometry(.12, 5).rotateX(-Math.PI / 2), m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .4, depthWrite: false }), r = rng(11);
  for (let i = 0; i < 70; i++) { const s = put(scene, geo, m, (r() - .5) * 160, 1.2 + r() * 5, (r() - .5) * 160); s.rotation.y = Math.atan2(WIND.x, WIND.y); s.userData.v = 16 + r() * 10; streaks.push(s); } }

// ---------- a small family of rubber ducks by the sailing island ----------
function duck() { const g = new THREE.Group(), yel = mat(0xffd23f);
  put(g, new THREE.SphereGeometry(1, 10, 8), yel).scale.set(1, .8, 1.25); put(g, new THREE.SphereGeometry(.62, 10, 8), yel, 0, .95, .75);
  put(g, new THREE.ConeGeometry(.28, .6, 6).rotateX(Math.PI / 2), mat(0xf27a1a), 0, .85, 1.5); put(g, new THREE.ConeGeometry(.4, .8, 5).rotateX(-2.2), yel, 0, .45, -1.25);
  for (const x of [-.3, .3]) put(g, new THREE.SphereGeometry(.09, 6, 5), mat(0x111111), x, 1.15, 1.22); return g; }
{ const sl = byId('sailing'); if (sl) { const c = spot(sl, 14, -26), r = rng(22);
  for (let i = 0; i < 4; i++) { const m = duck(), s = i ? .7 : 1.15; m.scale.setScalar(s); m.rotation.y = r() * 6; addFloater(m, c[0] + (r() - .5) * 10, c[1] + (r() - .5) * 10, { r: 1.3 * s, m: .5 * s, yOff: .45 * s, drag: .9, e: .7 }); } } }

// ---------- squash: a floating court and a ball cannon on the bow. Space serves; hit the lit target; volley rebounds with the hull ----------
const squash = { on: false, x: 0, z: 0, score: 0, best: store.get('squash', 0), time: 0, lit: 2, cool: 0, balls: [], panels: [], flash: [0, 0, 0, 0, 0] };
{
  const fun = archs.find(a => a.cfg.id === 'fun');
  if (fun && byId('sports')) {
    const u = fun.home, v = [-u[1], u[0]], C = [fun.x, fun.z], g0 = (w) => { const g = new THREE.Group(); g.position.set(w.x, 0, w.z); g.rotation.y = w.phi; scene.add(g); return g; };
    Object.assign(squash, { on: true, x: C[0], z: C[1] });
    const front = addWall(C[0] - u[0] * 16, C[1] - u[1] * 16, u[0], u[1], 18, .5, { front: true }), fg = g0(front), red = mat(0xd23a2a);
    put(fg, new THREE.BoxGeometry(37, 10.5, 1), mat(0xfaf8f2), 0, 4.25, 0); put(fg, new THREE.BoxGeometry(37, .3, .08), red, 0, 8.9, .52); put(fg, new THREE.BoxGeometry(37, 1.1, .1), mat(0xb8c0c6, { metalness: .4 }), 0, 1.5, .52);
    for (let i = 0; i < 5; i++) { const m = mat(0xffffff, { emissive: 0xffb300, emissiveIntensity: 0 }); squash.panels.push(m); put(fg, new THREE.BoxGeometry(6.6, 5.2, .12), m, (i - 2) * 7.2, 5.4, .54);
      put(fg, new THREE.TorusGeometry(1.5, .16, 5, 20), red, (i - 2) * 7.2, 5.4, .62); put(fg, new THREE.CircleGeometry(.5, 12), red, (i - 2) * 7.2, 5.4, .62); }
    const glass = new THREE.MeshStandardMaterial({ color: 0xbfe9ff, transparent: true, opacity: .42, roughness: .1, depthWrite: false, side: THREE.DoubleSide });
    for (const sd of [1, -1]) {
      const w = addWall(C[0] + v[0] * 18 * sd - u[0] * 2, C[1] + v[1] * 18 * sd - u[1] * 2, -v[0] * sd, -v[1] * sd, 14, .5), g = g0(w);
      const hiPlus = (w.tx * -u[0] + w.tz * -u[1]) > 0, hR = hiPlus ? 9 : 4.5, hL = hiPlus ? 4.5 : 9, sh = new THREE.Shape(); sh.moveTo(-14, -1); sh.lineTo(14, -1); sh.lineTo(14, hR); sh.lineTo(-14, hL);
      put(g, new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }).translate(0, 0, -.5), glass);
      put(g, new THREE.BoxGeometry(Math.hypot(28, hR - hL), .3, 1.06), red, 0, (hR + hL) / 2 + .1, 0).rotation.z = Math.atan2(hR - hL, 28);
      for (const x of [-14, 14]) put(g, new THREE.CylinderGeometry(1.1, 1.1, 1.4, 8), mat(0xf27a1a), x, .2, 0);
    }
    for (let i = 0; i < 3; i++) { const ball = new THREE.Group(); put(ball, new THREE.SphereGeometry(1.2, 12, 9), mat(0x1c1c1c)); for (const x of [-.27, .27]) put(ball, new THREE.SphereGeometry(.18, 6, 5), mat(0xffd800), x, .4, 1.08); ball.visible = false;
      const b = addFloater(ball, C[0], C[1], { r: 1.2, m: .4, e: .75, drag: .22, yOff: .7, roll: true, dead: true, life: 0, volley: false, atHome: false });
      b.onHit = () => { if (squash.time > 0 && !b.volley) { b.volley = true; b.life = Math.max(b.life, 5); toast('Volley! Next hit counts double.', 1200); } };
      b.onWall = (w, t) => { if (!w.front || squash.time <= 0) return; const k = clamp(Math.floor((t + 18) / 7.2), 0, 4), hit = k === squash.lit; let pts = hit ? 3 : 1; if (b.volley) pts *= 2; b.volley = false;
        squash.score += pts; squash.flash[k] = 1; audio.play(hit ? 'ding2' : 'ding'); puff(b.x, b.z, 4, 1); if (hit) { let n; do n = Math.floor(Math.random() * 5); while (n === squash.lit); squash.lit = n; } };
      squash.balls.push(b); }
  }
}
function serve() { const s = state; if (!squash.on || squash.cool > 0 || s.docked || Math.hypot(s.x - squash.x, s.z - squash.z) > 75) return;
  const fx = Math.sin(s.heading), fz = Math.cos(s.heading), b = squash.balls.find(q => q.dead) || squash.balls.reduce((a, q) => q.life < a.life ? q : a);
  Object.assign(b, { x: s.x + fx * 6.4, z: s.z + fz * 6.4, vx: fx * (30 + s.speed), vz: fz * (30 + s.speed), dead: false, life: 7, volley: false, returning: false, idle: 0 }); b.mesh.visible = true; squash.cool = .45; audio.play('pop'); puff(b.x, b.z, 3, .8);
  if (squash.time <= 0) { squash.time = 45; squash.score = 0; toast('45 seconds. Hit the glowing target!', 2200); } }
function updateSquash(dt, s) { if (!squash.on) return; squash.cool -= dt;
  squash.panels.forEach((m, i) => { squash.flash[i] = Math.max(0, squash.flash[i] - dt * 3); m.emissiveIntensity = squash.flash[i] * 1.5 + (i === squash.lit && squash.time > 0 ? .75 + Math.sin(s.t * 6) * .25 : 0); });
  for (const b of squash.balls) { if (b.dead) continue; b.life -= dt; if (b.life <= 0 || (b.life < 5.5 && Math.hypot(b.vx, b.vz) < 1.5)) { b.dead = true; b.mesh.visible = false; puff(b.x, b.z, 3, 1); } }
  if (squash.time > 0) { squash.time -= dt; if (squash.time <= 0) { track('game', { game: 'squash' }); const best = squash.score > squash.best; if (best) { squash.best = squash.score; store.set('squash', squash.best); } toast(`Time! ${squash.score} points${best ? '. New best!' : squash.best ? ` (best ${squash.best})` : ''}`, 4000); } }
  $('serveBtn').classList.toggle('show', coarse && Math.hypot(s.x - squash.x, s.z - squash.z) < 75 && !s.docked);
}
$('serveBtn').onclick = serve;

// ---------- ball games around the sports lagoon: football, ice hockey, tennis, chess ----------
const games = [];
{
  const W = 0xffffff, add = (id, isl, label, o) => { const gm = { id, label, x: isl.dockX, z: isl.dockZ, count: store.get('g.' + id, 0), cool: 0, balls: [], a: null, b: null, n: null, ...o }; games.push(gm); return gm; };
  const frame = (G, n, half, h, colour) => { const g = new THREE.Group(); g.position.set(G[0], 0, G[1]); g.rotation.y = Math.atan2(n[0], n[1]); scene.add(g);
    for (const x of [-half, half]) { put(g, new THREE.CylinderGeometry(.16, .16, h + .6, 6), mat(colour), x, h / 2 - .2, 0); put(g, new THREE.CylinderGeometry(1, 1, 1.2, 8), mat(0xf27a1a), x, .1, 0); }
    put(g, new THREE.CylinderGeometry(.16, .16, half * 2 + .3, 6).rotateZ(Math.PI / 2), mat(colour), 0, h, 0);
    put(g, new THREE.BoxGeometry(half * 2, h - .2, 3, 6, 3, 2), new THREE.MeshBasicMaterial({ color: W, wireframe: true, transparent: true, opacity: .55 }), 0, h / 2, -1.5); return g; };
  const seg = (G, t, half) => ({ a: [G[0] - t[0] * half, G[1] - t[1] * half], b: [G[0] + t[0] * half, G[1] + t[1] * half] });

  const pitch = byId('pitch'); if (pitch) { const n = pitch.dir, t = [-n[1], n[0]], G = spot(pitch, 8, 0), gm = add('football', pitch, 'Football: nudge the ball into the goal', { n, msg: 'GOAL!', g: frame(G, n, 5, 4.5, W), ...seg(G, t, 5) });
    const ball = new THREE.Group(), r = rng(5); put(ball, new THREE.IcosahedronGeometry(1.3, 1), mat(W)); for (let i = 0; i < 12; i++) { const p = new THREE.Vector3(r() - .5, r() - .5, r() - .5).normalize().multiplyScalar(1.22); put(ball, new THREE.SphereGeometry(.34, 5, 4), mat(0x15181b), p.x, p.y, p.z); }
    gm.balls.push(addFloater(ball, G[0] + n[0] * 13, G[1] + n[1] * 13, { r: 1.3, m: .5, e: .6, drag: .7, yOff: .7, roll: true, homeSpeed: 9 })); }

  const rink = byId('rink'); if (rink) { const n = rink.dir, t = [-n[1], n[0]], G = spot(rink, 8, 0), gm = add('hockey', rink, 'Ice hockey: slide the puck into the net', { n, msg: 'He shoots, he scores!', g: frame(G, n, 3.6, 3, 0xd23a2a), ...seg(G, t, 3.6) });
    const puck = new THREE.Group(); put(puck, new THREE.CylinderGeometry(1.25, 1.25, .55, 16), mat(0x15181b)); put(puck, new THREE.CylinderGeometry(.7, .7, .57, 12), mat(0xd23a2a));
    gm.balls.push(addFloater(puck, G[0] + n[0] * 14, G[1] + n[1] * 14, { r: 1.25, m: .35, e: .8, drag: .2, yOff: .2, tilt: .03, homeSpeed: 9 }));
    const r = rng(9); for (let i = 0; i < 5; i++) { const a = r() * 6.28, d = 14 + r() * 10, floe = put(scene, new THREE.CylinderGeometry(2 + r() * 2, 2.5 + r() * 2, 1.2, 6), mat(0xeaf6ff), 0, 0, 0); addFloater(floe, G[0] + n[0] * 12 + Math.cos(a) * d, G[1] + n[1] * 12 + Math.sin(a) * d, { r: 3, m: 4, drag: 1.6, yOff: 0, tilt: .04 }); } }

  const court = byId('tenniscourt'); if (court) { const n = court.dir, t = [-n[1], n[0]], N = spot(court, 16, 0), gm = add('tennis', court, 'Tennis: knock a ball across the net', { msg: 'Ace!', ...seg(N, t, 7) }), g = new THREE.Group(); g.position.set(N[0], 0, N[1]); g.rotation.y = Math.atan2(n[0], n[1]); scene.add(g); gm.g = g;
    for (const x of [-7, 7]) { put(g, new THREE.CylinderGeometry(.14, .14, 3.4, 6), mat(0x15181b), x, 1.3, 0); put(g, new THREE.CylinderGeometry(1, 1, 1.2, 8), mat(0xf27a1a), x, .1, 0); }
    put(g, new THREE.BoxGeometry(14, 2, .05, 20, 4, 1), new THREE.MeshBasicMaterial({ color: W, wireframe: true, transparent: true, opacity: .7 }), 0, 1.9, 0); put(g, new THREE.BoxGeometry(14, .16, .1), mat(W), 0, 2.95, 0);
    for (const sd of [-1, 1]) { const b = new THREE.Group(); put(b, new THREE.SphereGeometry(1.3, 14, 10), mat(0xd7f03c)); put(b, new THREE.TorusGeometry(1.3, .07, 4, 20), mat(W)).rotation.x = 1; gm.balls.push(addFloater(b, N[0] + n[0] * 8 * sd, N[1] + n[1] * 8 * sd, { r: 1.3, m: .4, e: .85, drag: .5, yOff: .75, roll: true, homeSpeed: 9 })); } }

  const cb = byId('chessboard'); if (cb) { const n = cb.dir, t = [-n[1], n[0]], P = spot(cb, 14, 0), gm = add('chess', cb, 'Chess: tip the king', { msg: 'Checkmate!' });
    ['R', 'B', 'K', 'Q', 'P', 'P'].forEach((ty, i) => { const dark = i % 2 === 0, pc = chessPiece(ty, dark ? 0x22262b : 0xf7f3ea); pc.scale.setScalar(1.15);
      const f = addFloater(pc, P[0] + t[0] * (i - 2.5) * 4.8, P[1] + t[1] * (i - 2.5) * 4.8, { r: 1.4, m: .9, e: .4, drag: 1.1, yOff: -.1, tilt: .1 }); gm.balls.push(f);
      if (ty === 'K') f.onHit = (v) => { if (v > 3 && gm.cool <= 0) { gm.cool = 4; gm.count++; audio.play('fanfare'); track('game', { game: 'chess' }); store.set('g.chess', gm.count); toast(`Checkmate! That's ${gm.count}.`, 2200); } }; }); }
}
function updateGames(dt, s) {
  for (const gm of games) { gm.cool -= dt; if (gm.g) gm.g.position.y = waveHeight(gm.g.position.x, gm.g.position.z, s.t) * .6; if (!gm.a) continue;
    for (const f of gm.balls) { if (f.returning || gm.cool > 0 || !segCross(f.px, f.pz, f.x, f.z, ...gm.a, ...gm.b)) continue; if (gm.n && f.vx * gm.n[0] + f.vz * gm.n[1] > -.5) continue;
      gm.count++; store.set('g.' + gm.id, gm.count); gm.cool = 1.6; audio.play('fanfare'); track('game', { game: gm.id }); toast(`${gm.msg} That's ${gm.count}.`, 2200); for (let i = 0; i < 4; i++) puff(f.x + (Math.random() - .5) * 6, f.z + (Math.random() - .5) * 6, 5, 1); setTimeout(() => { f.returning = true; }, 1600); } }
}

// ---------- Karteto flashcards floating around the island ----------
const cards = []; let cardsGot = 0;
{
  const ka = byId('karteto');
  if (ka) CARDS.forEach((c, i) => {
    const a = Math.atan2(ka.dir[0], ka.dir[1]) + [-85, -62, -40, -22, 22, 40, 62, 85][i % 8] * Math.PI / 180, d = ka.R + 31 + (i % 2) * 9;
    const g = new THREE.Group(), x = ka.x + Math.sin(a) * d, z = ka.z + Math.cos(a) * d; g.position.set(x, 0, z); g.rotation.y = i; scene.add(g);
    put(g, new THREE.CylinderGeometry(1.3, 1.5, .5, 10), mat(0xc9a36b), 0, .1, 0); put(g, new THREE.CylinderGeometry(.08, .08, 1, 5), mat(0x6e4f2c), 0, .7, 0);
    const card = cardMesh(3, 4.2, .15, cardTex(c.front, c.lang, '#c9c3a5')); card.position.y = 3.2; g.add(card);
    cards.push({ g, card, c, x, z, got: false, flip: 0, swapped: false });
  });
}
function updateCards(dt, s) {
  for (const k of cards) {
    k.g.position.y = waveHeight(k.x, k.z, s.t) * .8; k.g.rotation.y += dt * .7;
    if (!k.got && s.started && Math.hypot(s.x - k.x, s.z - k.z) < 3.6) { k.got = true; k.flip = .001; cardsGot++; audio.play('chime'); puff(k.x, k.z, 4, 1);
      if (cardsGot === cards.length) setTimeout(() => toast(`All ${cards.length} words collected!`, 4000), 900); }
    if (k.flip > 0 && k.flip < 1) { k.flip = Math.min(1, k.flip + dt / .8); k.g.rotation.y += dt * 12 * (1 - k.flip); k.card.position.y = 3.2 + Math.sin(k.flip * Math.PI) * 2.4;
      if (k.flip > .5 && !k.swapped) { k.swapped = true; k.card.userData.face.map = cardTex(k.c.back, k.c.front, '#2743d6'); k.card.userData.face.needsUpdate = true; } }
  }
}

// ---------- races: gates to take in order, each course with its own electronic top-10 board ----------
const RACES = [
  { id: 'slalom', name: 'SLALOM SPRINT', start: [-135, 178], dir: [1, 0], step: 24, count: 5, wiggle: 8 },        // a quick zigzag on a reach
  { id: 'windward', name: 'WINDWARD DASH', start: [138, -72], dir: [-.29, -.957], step: 36, count: 6, wiggle: 28 },   // upwind: you have to tack between the gates
  { id: 'downwind', name: 'DOWNWIND RUN', start: [200, 152], dir: [.25, .97], step: 32, count: 5, wiggle: 10 },       // a long fast broad reach
];
const race = { on: false, R: null, next: 0, t: 0 };
const scoresFor = (R) => ({   // top 10, kept in this browser. Swap these two functions for API calls to make it a shared leaderboard.
  load() { const v = store.get('times.' + R.id, []); return Array.isArray(v) ? v : []; },
  add(t) { const e = { t: +t.toFixed(1), d: Date.now() }, all = [...this.load(), e].sort((a, b) => a.t - b.t).slice(0, 10); store.set('times.' + R.id, all); return all.indexOf(e); },
});
{
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, 0, -1, 0, 0, -.5, 1.4]), 3)); tri.computeVertexNormals();
  for (const R of RACES) {
    const l = Math.hypot(...R.dir), d = [R.dir[0] / l, R.dir[1] / l], pp = [-d[1], d[0]]; R.scores = scoresFor(R); R.title = R.name.split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
    R.gates = Array.from({ length: R.count }, (_, i) => { const w = R.wiggle * (i % 2 ? 1 : -1), x = R.start[0] + d[0] * R.step * i + pp[0] * w, z = R.start[1] + d[1] * R.step * i + pp[1] * w, gt = { x, z, a: [x - pp[0] * 6.5, z - pp[1] * 6.5], b: [x + pp[0] * 6.5, z + pp[1] * 6.5], posts: [] };
      for (const e of [gt.a, gt.b]) { const p = new THREE.Group(); p.position.set(e[0], 0, e[1]); scene.add(p); gt.posts.push(p);
        put(p, new THREE.CylinderGeometry(.6, .8, 1.1, 8), mat(0xf27a1a), 0, .3, 0); put(p, new THREE.CylinderGeometry(.09, .09, 5.5, 5), mat(0xffffff), 0, 3.2, 0);
        put(p, tri, new THREE.MeshStandardMaterial({ color: i === 0 ? 0x2aa79b : i === R.count - 1 ? 0x10263a : 0xf27a1a, side: THREE.DoubleSide }), 0, 5.9, 0); }
      gt.banner = put(scene, new THREE.PlaneGeometry(12, 3.2), new THREE.MeshBasicMaterial({ color: 0xf2b84b, transparent: true, opacity: .4, side: THREE.DoubleSide, depthWrite: false }), x, 3.4, z); gt.banner.rotation.y = Math.atan2(-pp[1], pp[0]);
      if (i === 0 || i === R.count - 1) { const lb = labelSprite(i ? 'FINISH' : R.title + ' · START'); lb.scale.set(i ? 11 : 20, i ? 2.75 : 5, 1); lb.position.set(x, 9, z); scene.add(lb); }
      return gt; });
    // the board, on a barge beside the start line
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 352; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const g0 = R.gates[0], w = addWall(g0.x - pp[0] * 24, g0.z - pp[1] * 24, -d[0], -d[1], 8, 2.6), g = new THREE.Group(), dark = mat(0x15181b), face = new THREE.MeshBasicMaterial({ map: tex });
    g.position.set(w.x, 0, w.z); g.rotation.y = w.phi; scene.add(g); R.board = { g, ctx: cv.getContext('2d'), tex, last: -1, flashRank: -1, flashUntil: 0 };
    put(g, new THREE.BoxGeometry(16, 1.4, 5), mat(0x3b444a), 0, .2, 0); for (const x of [-6, 6]) put(g, new THREE.BoxGeometry(.6, 5, .6), dark, x, 3, 0);
    put(g, new THREE.BoxGeometry(15, 10.3, .7), [dark, dark, dark, dark, face, face], 0, 9.6, 0);
  }
}
function segCross(ax, az, bx, bz, cx, cz, dx, dz) { const den = (bx - ax) * (dz - cz) - (bz - az) * (dx - cx); if (!den) return false;
  const t = ((cx - ax) * (dz - cz) - (cz - az) * (dx - cx)) / den, u = ((cx - ax) * (bz - az) - (cz - az) * (bx - ax)) / den; return t >= 0 && t <= 1 && u >= 0 && u <= 1; }
function drawBoard(R, now) {
  const B = R.board, c = B.ctx, W = 512, H = 352, amber = '#ffb02e', live = race.on && race.R === R; c.fillStyle = '#07090c'; c.fillRect(0, 0, W, H); c.textBaseline = 'middle'; c.fillStyle = amber;
  c.font = 'bold 32px "Courier New", monospace'; c.textAlign = 'center';
  if (live) { c.fillText(`${R.name}  ${race.next}/${R.count}`, W / 2, 44); c.font = 'bold 128px "Courier New", monospace'; c.fillText(race.t.toFixed(1), W / 2, 200); c.font = 'bold 30px "Courier New", monospace'; c.fillText('SECONDS', W / 2, 300); }
  else { const list = R.scores.load(); c.fillText(`${R.name} TOP 10`, W / 2, 40); c.fillRect(24, 68, W - 48, 3);
    if (!list.length) { c.font = 'bold 30px "Courier New", monospace'; c.fillText('NO TIMES YET', W / 2, 170); c.fillText('SAIL THROUGH START', W / 2, 220); }
    c.font = 'bold 27px "Courier New", monospace'; c.textAlign = 'left';
    list.forEach((e, i) => { const d = new Date(e.d), date = String(d.getDate()).padStart(2, '0') + d.toLocaleString('en', { month: 'short' }).toUpperCase(), hot = i === B.flashRank && now < B.flashUntil;
      c.fillStyle = hot ? (Math.floor(now * 4) % 2 ? '#ffffff' : '#07090c') : amber; c.fillText(`${String(i + 1).padStart(2, ' ')} ${e.t.toFixed(1).padStart(5, ' ')} ${date}`, i < 5 ? 22 : 268, 104 + (i % 5) * 48); }); }
  c.fillStyle = 'rgba(0,0,0,.4)'; for (let x = 0; x < W; x += 4) c.fillRect(x, 0, 1.4, H); for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1.4);   // LED grid
  B.tex.needsUpdate = true;
}
function updateRaces(dt, s, px, pz) {
  if (race.on) { race.t += dt; if (race.t > 240) { race.on = false; race.R.board.last = -1; } }
  for (const R of RACES) { const mine = race.on && race.R === R, B = R.board;
    R.gates.forEach((gt, i) => {
      for (const p of gt.posts) p.position.y = waveHeight(p.position.x, p.position.z, s.t) * .8;
      const isNext = mine ? i === race.next : (!race.on && i === 0);
      gt.banner.visible = isNext; if (isNext) { gt.banner.material.opacity = .3 + Math.sin(s.t * 4) * .12; gt.banner.material.color.set(mine ? 0xf2b84b : 0x2aa79b); }
      if (!segCross(px, pz, s.x, s.z, ...gt.a, ...gt.b)) return;
      if (i === 0 && (!race.on || (mine && race.next === 1))) { Object.assign(race, { on: true, R, t: 0, next: 1 }); audio.play('start'); toast(`${R.title} started. Take the gates in order!`, 1800); }
      else if (mine && i === race.next) { race.next++; puff(gt.x, gt.z, 6, 1.5); audio.play(race.next === R.count ? 'fanfare' : 'gate');
        if (race.next === R.count) { race.on = false; track('race', { race: R.id }); const rank = R.scores.add(race.t); B.flashRank = rank; B.flashUntil = s.t + 6; B.last = -1;
          toast(`${R.title}: ${race.t.toFixed(1)}s` + (rank === 0 ? '. New record!' : rank > 0 ? `. #${rank + 1} on the board.` : '. Not in the top 10 this time.'), 4000); } }
    });
    B.g.position.y = waveHeight(B.g.position.x, B.g.position.z, s.t) * .4;
    const live = (race.on && race.R === R) || s.t < B.flashUntil + .3; if (B.last < 0 || (live && s.t - B.last > .1)) { B.last = s.t; drawBoard(R, s.t); }
  }
}

// ---------- sea life: dolphins join you at speed, gulls scatter from the rocks ----------
const dolphins = [], gulls = []; const pod = { fast: 0, t: -1, cool: 6 };
if (!calm) for (let i = 0; i < 3; i++) { const g = new THREE.Group(), m = mat(0x5b7f95, { roughness: .4 }); g.rotation.order = 'YXZ'; g.visible = false; scene.add(g);
  put(g, new THREE.SphereGeometry(.55, 8, 6), m).scale.set(1, 1, 3); put(g, new THREE.ConeGeometry(.22, .9, 6).rotateX(Math.PI / 2), m, 0, -.05, 1.9);
  put(g, new THREE.ConeGeometry(.25, .8, 4), m, 0, .7, -.1).rotation.x = -.5; put(g, new THREE.BoxGeometry(1.3, .08, .5), m, 0, 0, -1.75);
  dolphins.push({ g, side: [7, -6, 10][i], lag: [0, 1.1, 2.3][i] }); }
islands.forEach((isl, n) => isl.perches.slice(0, 1).forEach((p) => {
  const g = new THREE.Group(), white = mat(0xffffff), wings = []; g.scale.setScalar(1.5); g.position.set(...p); scene.add(g);
  put(g, new THREE.SphereGeometry(.35, 8, 6), white, 0, .3, 0).scale.set(1, .85, 1.8); put(g, new THREE.SphereGeometry(.2, 8, 6), white, 0, .55, .55);
  put(g, new THREE.ConeGeometry(.07, .3, 5).rotateX(Math.PI / 2), mat(0xf2b84b), 0, .52, .85);
  for (const sd of [1, -1]) { const w = new THREE.Group(); w.position.set(sd * .2, .4, 0); g.add(w); put(w, new THREE.BoxGeometry(1.3, .05, .45), mat(0xd9dee3), sd * .65, 0, 0); wings.push(w); }
  gulls.push({ g, wings, p, fly: false, b: 0, t: 0, a: n * 2.1, dir: n % 2 ? 1 : -1, yaw: n * 2.5 });
}));
function updateWildlife(dt, s, fx, fz) {
  pod.cool -= dt; pod.fast = s.speed > MAX_SPEED * .68 ? pod.fast + dt : 0;
  if (pod.t < 0 && pod.fast > 4 && pod.cool < 0 && dolphins.length) pod.t = 0;
  if (pod.t >= 0) { pod.t += dt; if (pod.t > 10) { pod.t = -1; pod.cool = 25; pod.fast = 0; } }
  for (const d of dolphins) { const t = pod.t - d.lag; d.g.visible = pod.t >= 0 && t > 0 && t < 7; if (!d.g.visible) continue;
    const along = -12 + t * 4, ph = t * 2.6, y = Math.sin(ph) * 2.4 - .9;
    d.g.position.set(s.x + fx * along - fz * d.side, y, s.z + fz * along + fx * d.side); d.g.rotation.set(-Math.cos(ph) * .75, s.heading, 0);
    if (y > -.2 && y < .1 && Math.random() < .5) puff(d.g.position.x, d.g.position.z, 2.5, .6); }
  for (const u of gulls) { const d = Math.hypot(s.x - u.p[0], s.z - u.p[2]); if (d > 400 && u.b < .02) continue;
    if (!u.fly && d < 24 && s.started) { u.fly = true; u.t = 0; audio.play('gull'); } else if (u.fly) { u.t += dt; if (u.t > 7 && d > 36) u.fly = false; }
    u.b += ((u.fly ? 1 : 0) - u.b) * damp(u.fly ? 1.4 : .7, dt); u.a += dt * .9 * u.dir;
    const air = u.b > .03; u.g.position.set(u.p[0] + Math.cos(u.a) * 11 * u.b, u.p[1] + (9 + Math.sin(s.t * .7 + u.a) * 1.5) * u.b, u.p[2] + Math.sin(u.a) * 11 * u.b);
    u.g.rotation.y = air ? Math.atan2(-Math.sin(u.a) * u.dir, Math.cos(u.a) * u.dir) : u.yaw;
    const flap = air ? Math.sin(s.t * 11 + u.a) * .7 : -1.25; u.wings[0].rotation.z = flap; u.wings[1].rotation.z = -flap; }
}

// ---------- more marine life: whales, shark fins, turtles, jellyfish, flying fish ----------
const whales = [[-70, 140], [160, -130]].map(([x, z], i) => { const g = new THREE.Group(), m = mat(0x2f4a63, { roughness: .5 }); g.rotation.order = 'YXZ'; scene.add(g);
  put(g, new THREE.SphereGeometry(1, 12, 9), m).scale.set(2.4, 1.8, 7.5); put(g, new THREE.SphereGeometry(1, 10, 8), mat(0xd9e2e8), 0, -.5, 1.5).scale.set(2, 1.3, 5);
  put(g, new THREE.ConeGeometry(.5, 1.1, 4), m, 0, 1.7, -2).rotation.x = -.6; for (const sd of [-1, 1]) { put(g, new THREE.BoxGeometry(2.8, .3, 1.5), m, sd * 1.5, .1, -7.6).rotation.y = sd * .5; put(g, new THREE.BoxGeometry(2.4, .25, 1), m, sd * 2.8, -.8, 2.5).rotation.z = -sd * .5; }
  put(g, new THREE.ConeGeometry(1.1, 3, 6).rotateX(-Math.PI / 2), m, 0, 0, -6.2);
  const spout = []; for (let k = 0; k < 6; k++) { const sp = put(scene, new THREE.SphereGeometry(.35 + k * .06, 6, 5), mat(0xffffff)); sp.visible = false; spout.push(sp); }
  return { g, spout, ax: x, az: z, x, z, h: i * 2.4, ph: i * 11 }; });
const sharks = [[-120, -30], [150, 120], [70, -120], [-120, 240]].map(([x, z], i) => { const g = new THREE.Group(); scene.add(g); put(g, new THREE.ConeGeometry(.95, 2.3, 4).translate(0, 1, -.3), mat(0x4a5560)).scale.set(.22, 1, 1);
  return { g, ax: x, az: z, x: x + 14, z, ang: i * 1.7, follow: 0, cool: 0, h: 0 }; });
const turtles = [...archs.filter(a => a.cfg.radius).map(a => [a.x + a.home[0] * (a.cfg.radius + 52) - a.home[1] * 22, a.z + a.home[1] * (a.cfg.radius + 52) + a.home[0] * 22]), [42, -42], [-48, 44], [-72, 104], [120, -10]].map(([x, z], i) => {
  const g = new THREE.Group(), shell = mat(0x4f8a5b), skin = mat(0x8fbf7a), flips = []; scene.add(g);
  put(g, new THREE.SphereGeometry(1, 8, 6), shell).scale.set(1.2, .55, 1.5); put(g, new THREE.SphereGeometry(.4, 8, 6), skin, 0, .1, 1.75);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const f = new THREE.Group(); f.position.set(sx * 1, 0, sz * .9); g.add(f); put(f, new THREE.BoxGeometry(1.1, .1, .45), skin, sx * .55, 0, 0); flips.push(f); }
  return { g, flips, ax: x, az: z, ang: i * 1.3, dive: 0 }; });
const jellies = [];
{ const r = rng(77), dome = new THREE.SphereGeometry(.85, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  [[-62, 62, 0xff8fd0], [125, 62, 0xb78bff], [-10, -115, 0x8fe3ff], [-205, -60, 0xff8fd0]].forEach(([cx, cz, col]) => { const m = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: .45, transparent: true, opacity: .7, depthWrite: false, roughness: .3 });
    for (let i = 0; i < 8; i++) { const g = new THREE.Group(), x = cx + (r() - .5) * 26, z = cz + (r() - .5) * 26; g.position.set(x, 0, z); g.scale.setScalar(.7 + r() * .9); scene.add(g); put(g, dome, m); jellies.push({ g, x, z, k: r() * 6 }); } }); }
const fish = { pool: [], cool: 5 };
for (let i = 0; i < 8; i++) { const g = new THREE.Group(), m = mat(0xc8d6e0, { metalness: .4, roughness: .3 }); g.rotation.order = 'YXZ'; g.visible = false; scene.add(g);
  put(g, new THREE.ConeGeometry(.2, 1.3, 5).rotateX(Math.PI / 2), m); for (const sd of [-1, 1]) put(g, new THREE.BoxGeometry(.9, .03, .35), mat(0xe8f1f6), sd * .45, .08, .1).rotation.z = sd * .35; fish.pool.push({ g, t: -9, ox: 0, oz: 0, dx: 0, dz: 0 }); }
function updateMarine(dt, s, fx, fz) {
  for (const w of whales) { w.ph += dt; const c = w.ph % 26, away = Math.hypot(w.x - w.ax, w.z - w.az) > 70;
    w.h += (away ? clamp(angDiff(Math.atan2(w.ax - w.x, w.az - w.z), w.h), -1, 1) * .4 : Math.sin(w.ph * .13) * .12) * dt; w.x += Math.sin(w.h) * 3.2 * dt; w.z += Math.cos(w.h) * 3.2 * dt;
    let y = -6, pitch = 0; if (c > 10 && c <= 17) y = -1.7 + Math.sin((c - 10) / 7 * Math.PI) * 1.5; else if (c > 17 && c <= 22) { pitch = Math.sin((c - 17) / 5 * Math.PI) * 1.05; y = -1.7 - (c - 17) * .9 + Math.sin((c - 17) / 5 * Math.PI) * 1.2; }
    w.g.position.set(w.x, y, w.z); w.g.rotation.set(pitch, w.h, 0);
    const ts = c - 11.5; w.spout.forEach((sp, k) => { sp.visible = ts > 0 && ts < 2.2; if (sp.visible) { const tt = Math.max(0, ts - k * .08); sp.position.set(w.x + Math.sin(w.h) * 4.5 + Math.sin(k * 2.4) * tt * .8, .6 + tt * (5 + k * .5) - tt * tt * 2.3, w.z + Math.cos(w.h) * 4.5 + Math.cos(k * 2.4) * tt * .8); } }); }
  for (const k of sharks) { const db = Math.hypot(s.x - k.x, s.z - k.z); k.cool -= dt;
    if (k.follow > 0) { k.follow -= dt; if (k.follow <= 0 || db > 80) { k.follow = 0; k.cool = 30; } } else if (db < 45 && k.cool < 0 && s.speed > 3 && !s.docked) k.follow = 12;
    let tx, tz; if (k.follow > 0) { tx = s.x - fx * 11 - fz * 3; tz = s.z - fz * 11 + fx * 3; } else { k.ang += dt * .45; tx = k.ax + Math.cos(k.ang) * 14; tz = k.az + Math.sin(k.ang) * 14; }
    const dx = tx - k.x, dz = tz - k.z, d = Math.hypot(dx, dz) || 1, v = Math.min(d * 1.5, k.follow > 0 ? 21 : 7); k.x += dx / d * v * dt; k.z += dz / d * v * dt; if (d > .5) k.h += angDiff(Math.atan2(dx, dz), k.h) * damp(4, dt);
    k.g.position.set(k.x, waveHeight(k.x, k.z, s.t) * .8 - .15, k.z); k.g.rotation.y = k.h; }
  for (const t of turtles) { t.ang += dt * .22; const x = t.ax + Math.cos(t.ang) * 7, z = t.az + Math.sin(t.ang) * 7, d = Math.hypot(s.x - x, s.z - z);
    t.dive += ((d < 12 ? 1 : d > 24 ? 0 : t.dive > .5 ? 1 : 0) - t.dive) * damp(2.5, dt); t.g.position.set(x, waveHeight(x, z, s.t) * .8 + .05 - t.dive * 3, z); t.g.rotation.set(t.dive * .5, -t.ang, 0);
    t.flips.forEach((f, i) => { f.rotation.y = Math.sin(s.t * 2.2 + i * 1.6) * .5; }); }
  for (const j of jellies) { const p = 1 + Math.sin(s.t * 2 + j.k) * .14; j.g.position.y = waveHeight(j.x, j.z, s.t) * .8 - .1 + Math.sin(s.t * .9 + j.k) * .15; j.g.children[0].scale.set(p, 2 - p, p); }
  fish.cool -= dt;
  if (fish.cool < 0 && s.speed > MAX_SPEED * .5 && !s.arch && !calm) { fish.cool = 9 + Math.random() * 10; const sd = Math.random() < .5 ? 1 : -1, ox = s.x + fx * 20 - fz * 13 * sd, oz = s.z + fz * 20 + fx * 13 * sd, dx = fz * sd * .8 + fx * .6, dz = -fx * sd * .8 + fz * .6;
    fish.pool.forEach((f, i) => { f.t = -i * .13 - Math.random() * .1; f.ox = ox + (Math.random() - .5) * 5; f.oz = oz + (Math.random() - .5) * 5; f.dx = dx; f.dz = dz; f.wet = false; }); }
  for (const f of fish.pool) { if (f.t < -5) continue; f.t += dt; const T = 1.15, u = f.t / T; f.g.visible = u > 0 && u < 1; if (u >= 1) { puff(f.g.position.x, f.g.position.z, 2, .4); f.t = -9; continue; } if (!f.g.visible) continue;
    if (!f.wet) { f.wet = true; puff(f.ox, f.oz, 2, .4); } f.g.position.set(f.ox + f.dx * 17 * f.t, 4 * u * (1 - u) * 3.4, f.oz + f.dz * 17 * f.t); f.g.rotation.set(-(1 - 2 * u) * .7, Math.atan2(f.dx, f.dz), 0); }
}

// ---------- state ----------
const home = islands[0];
const state = { x: 0, z: 0, heading: 0, speed: 0, trim: .65, rudder: 0, boom: 0, heel: 0, started: true, docked: null, near: null, autoOpened: null, arch: null, t: 0 };
{ // start a short sail from the Home dock, pointing at it, so the first discovery comes quickly
  const [dx, dz] = home.dir, px = -dz, pz = dx, side = (px * WIND.x + pz * WIND.y) < 0 ? 1 : -1;
  state.x = home.dockX + dx * 30 + px * side * 34; state.z = home.dockZ + dz * 30 + pz * side * 34; state.heading = Math.atan2(home.dockX - state.x, home.dockZ - state.z);
}
const cam = { yaw: 0, pitch: .3, dist: 30, heading: state.heading, lastDrag: -10, dragging: false };
const keys = {}; const joy = { x: 0, y: 0 };

// ---------- input ----------
const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right' };
addEventListener('keydown', (e) => {
  if ($('plain').classList.contains('show')) return;
  if (KEYMAP[e.code]) { keys[KEYMAP[e.code]] = true; e.preventDefault(); hideHints(); }
  if (e.code === 'KeyE' || e.code === 'Enter') { if (state.docked) castOff(); else if (state.near) dock(state.near); }
  if (e.code === 'Space') { e.preventDefault(); serve(); }
  if (e.code === 'KeyM') toggleMap();
  if (e.code === 'KeyN') toggleSound();
  if (e.code === 'Escape') { if (mapOpen) toggleMap(false); else if (state.docked) castOff(); }
});
addEventListener('keyup', (e) => { if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

const canvas = $('sea');
let tapX = 0, tapZ = 0, tapAt = 0;
canvas.addEventListener('pointerdown', (e) => { audio.start(); cam.dragging = true; tapX = e.clientX; tapZ = e.clientY; tapAt = performance.now(); try { canvas.setPointerCapture(e.pointerId); } catch {} });
canvas.addEventListener('pointermove', (e) => { if (!cam.dragging) return; cam.yaw -= e.movementX * .006; cam.pitch = clamp(cam.pitch + e.movementY * .004, .08, 1.2); cam.lastDrag = state.t; });
const endDrag = (e) => {
  // a quick tap on the sea while docked closes the panel; a drag still just moves the camera
  if (state.docked && e && performance.now() - tapAt < 500 && Math.hypot(e.clientX - tapX, e.clientY - tapZ) < 12) castOff();
  cam.dragging = false; cam.lastDrag = state.t;
};
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (e) => { cam.dist = clamp(cam.dist + e.deltaY * .02, 16, 70); e.preventDefault(); }, { passive: false });

{ const stick = $('stick'), knob = stick.firstElementChild; let id = null;
  const move = (e) => { const b = stick.getBoundingClientRect(); let x = (e.clientX - b.left) / b.width * 2 - 1, y = (e.clientY - b.top) / b.height * 2 - 1;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } joy.x = x; joy.y = y; knob.style.transform = `translate(${x * 38}px, ${y * 38}px)`; };
  stick.addEventListener('pointerdown', (e) => { id = e.pointerId; stick.setPointerCapture(id); hideHints(); move(e); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  const end = () => { id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end); }

// ---------- UI actions ----------
let hintsGone = false; function hideHints() { audio.start(); if (hintsGone) return; hintsGone = true; setTimeout(() => $('hints').classList.add('gone'), 5000); }
setTimeout(hideHints, 20000);
function toast(msg, ms = 2600) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), ms); }
function updateLog() { $('log').textContent = `Logbook ${islands.filter(i => i.found).length}/${islands.length} islands`; }
function dock(isl) {
  audio.start(); audio.play('dock'); track('dock', { island: isl.cfg.id }); state.docked = isl; $('panelKicker').textContent = isl.arch.cfg.radius ? isl.arch.cfg.title : 'Docked at'; $('panelKicker').style.color = isl.arch.cfg.colour;
  $('panelTitle').textContent = isl.cfg.title; $('panelBody').innerHTML = isl.cfg.html; $('panel').scrollTop = 0; $('panel').classList.add('open');
  if (!isl.found) { isl.found = true; isl.dot.classList.add('found'); isl.ring.material.uniforms.color.value.set(0x2aa79b); updateLog();
    const A = isl.arch; if (A.cfg.radius && A.islands.every(i => i.found)) setTimeout(() => toast(islands.every(i => i.found) ? 'Logbook complete. You\'ve seen it all!' : `${A.cfg.title}: all islands visited.`, 4000), 600); }
}
function castOff() { if (state.docked) audio.play('castoff'); state.docked = null; $('panel').classList.remove('open'); $('panel').querySelectorAll('video').forEach(v => v.pause()); }
$('castOff').onclick = castOff;
function toggleSound() { audio.start(); const m = audio.toggle(); $('soundBtn').textContent = m ? 'Sound off' : 'Sound on'; }
$('soundBtn').textContent = audio.muted ? 'Sound off' : 'Sound on'; $('soundBtn').onclick = toggleSound;
$('prompt').onclick = () => { if (state.near && !state.docked) dock(state.near); };
updateLog();

// ---------- the chart (M) ----------
let mapOpen = false, mapLast = -1;
function toggleMap(on = !mapOpen) { mapOpen = on; $('map').classList.toggle('show', on); mapLast = -1; }
$('mapBtn').onclick = () => toggleMap(); $('map').onclick = () => toggleMap(false);
function drawMap(s) {
  const cv = $('mapCanvas'), c = cv.getContext('2d'), W = cv.width, k = (W / 2 - 24) / (WORLD_R + 10), X = (x) => W / 2 + x * k, Y = (z) => W / 2 + z * k;
  c.clearRect(0, 0, W, W); c.fillStyle = '#f4ead2'; c.beginPath(); c.arc(W / 2, W / 2, W / 2 - 4, 0, 7); c.fill(); c.strokeStyle = '#10263a'; c.lineWidth = 3; c.stroke();
  c.setLineDash([6, 6]); c.lineWidth = 1; c.strokeStyle = 'rgba(16,38,58,.35)'; c.beginPath(); c.arc(W / 2, W / 2, WORLD_R * k, 0, 7); c.stroke(); c.setLineDash([]);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const A of archs) { if (!A.cfg.radius) continue; c.globalAlpha = .16; c.fillStyle = A.cfg.colour; c.beginPath(); c.arc(X(A.x), Y(A.z), (A.cfg.radius + 34) * k, 0, 7); c.fill(); c.globalAlpha = 1;
    c.fillStyle = '#10263a'; c.font = '700 19px Georgia, serif'; c.fillText(`${A.cfg.title}  ${A.islands.filter(i => i.found).length}/${A.islands.length}`, X(A.x), Y(A.z) - (A.cfg.radius + 48) * k); }
  for (const i of decor) { c.fillStyle = '#c9c0ad'; c.beginPath(); c.arc(X(i.x), Y(i.z), Math.max(3, i.R * k * .8), 0, 7); c.fill(); }
  for (const i of islands) { c.fillStyle = i.found ? '#2aa79b' : '#f2b84b'; c.strokeStyle = '#10263a'; c.lineWidth = 1.5; c.beginPath(); c.arc(X(i.x), Y(i.z), Math.max(4, i.R * k * .95), 0, 7); c.fill(); c.stroke();
    c.fillStyle = '#10263a'; c.font = '600 11px system-ui, sans-serif'; c.fillText(i.cfg.title, X(i.x), Y(i.z) + Math.max(4, i.R * k) + 9); }
  c.font = '600 11px system-ui, sans-serif'; c.fillStyle = '#e4572e'; for (const R of RACES) { const a = R.gates[0], b = R.gates[R.count - 1]; c.strokeStyle = '#e4572e'; c.setLineDash([3, 3]); c.lineWidth = 1.5; c.beginPath(); R.gates.forEach((q, i) => i ? c.lineTo(X(q.x), Y(q.z)) : c.moveTo(X(q.x), Y(q.z))); c.stroke(); c.setLineDash([]); c.fillText('⚑ ' + R.title, X((a.x + b.x) / 2), Y((a.z + b.z) / 2) - 9); }
  if (squash.on) c.fillText('Squash court', X(squash.x), Y(squash.z));
  c.save(); c.translate(X(s.x), Y(s.z)); c.rotate(Math.atan2(Math.sin(s.heading), -Math.cos(s.heading))); c.fillStyle = '#e4572e'; c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -11); c.lineTo(7, 8); c.lineTo(0, 4); c.lineTo(-7, 8); c.closePath(); c.fill(); c.stroke(); c.restore();
  c.save(); c.translate(54, 54); c.fillStyle = '#10263a'; c.font = '700 13px system-ui, sans-serif'; c.fillText('N', 0, -30); c.rotate(Math.atan2(WIND.x, -WIND.y)); c.strokeStyle = '#3a86d4'; c.fillStyle = '#3a86d4'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(0, 18); c.lineTo(0, -14); c.stroke(); c.beginPath(); c.moveTo(0, -22); c.lineTo(6, -10); c.lineTo(-6, -10); c.closePath(); c.fill(); c.restore(); c.fillStyle = '#3a86d4'; c.fillText('wind', 54, 92);
}

// ---------- the little status chip under the HUD ----------
let chipText = '';
function updateChip(s) {
  const ka = byId('karteto'), A = s.arch; let txt = '';
  if (race.on) txt = `${race.R.title} ${race.t.toFixed(1)}s · gate ${race.next}/${race.R.count}`;
  else if (squash.time > 0) txt = `Squash ${squash.score} pts · ${Math.ceil(squash.time)}s`;
  else if (!s.started || s.docked) txt = '';
  else if (squash.on && Math.hypot(s.x - squash.x, s.z - squash.z) < 75) txt = `Squash: ${coarse ? 'tap Serve' : 'press Space'} to fire a ball at the front wall${squash.best ? ' · best ' + squash.best : ''}`;
  else if (games.some(g => Math.hypot(s.x - g.x, s.z - g.z) < 34)) { const g = games.find(g => Math.hypot(s.x - g.x, s.z - g.z) < 34); txt = g.label + (g.count ? ' · ' + g.count : ''); }
  else if (ka && cards.length && Math.hypot(s.x - ka.x, s.z - ka.z) < 75) txt = `Words ${cardsGot}/${cards.length}${cardsGot ? '' : ' · sail through a card'}`;
  else if (RACES.some(R => Math.hypot(s.x - R.gates[0].x, s.z - R.gates[0].z) < 45)) { const R = RACES.find(R => Math.hypot(s.x - R.gates[0].x, s.z - R.gates[0].z) < 45), b = R.scores.load()[0]; txt = `${R.title}: sail through START${b ? ' · record ' + b.t.toFixed(1) + 's' : ''}`; }
  else if (A && A.cfg.radius) txt = `${A.cfg.title} · ${A.islands.filter(i => i.found).length}/${A.islands.length} visited`;
  if (txt !== chipText) { chipText = txt; const c = $('chip'); if (txt) c.textContent = txt; c.classList.toggle('show', !!txt); }
}

// ---------- simulation ----------
const POINTS = [[.62, 'In irons: bear away!'], [.92, 'Close-hauled'], [1.35, 'Close reach'], [1.85, 'Beam reach'], [2.7, 'Broad reach'], [9, 'Running']];   // true wind angle in radians: 36° / 53° / 77° / 106° / 155°
function polar(a) { return Math.max(.2, smoothstep(.3, 1.05, a) * (1 - .22 * smoothstep(2.3, Math.PI, a))); }
let edgeWarned = false, twa = 0;

function update(dt) {
  const s = state; s.t += dt;
  const fx = Math.sin(s.heading), fz = Math.cos(s.heading), px = s.x, pz = s.z;

  // controls
  const steer = clamp((keys.left ? 1 : 0) - (keys.right ? 1 : 0) - joy.x, -1, 1);
  s.rudder += (steer - s.rudder) * damp(6, dt);
  s.trim = clamp(s.trim + ((keys.up ? 1 : 0) - (keys.down ? 1 : 0) - joy.y * .8) * dt * .7, 0, 1);

  // wind → drive
  twa = Math.acos(clamp(-(fx * WIND.x + fz * WIND.y), -1, 1));            // 0 = pointing straight into the wind
  const held = !s.started || s.docked || mapOpen;
  let target = held ? 0 : MAX_SPEED * polar(twa) * s.trim;
  if (s.near && !held) target *= .5;
  s.speed += (target - s.speed) * damp(target < s.speed ? 1.5 : .8, dt);
  if (!held) s.heading += s.rudder * 1.15 * (.35 + .65 * s.speed / MAX_SPEED) * dt;
  s.x += fx * s.speed * dt; s.z += fz * s.speed * dt;

  // islands and walls are solid
  for (const i of solids) { const dx = s.x - i.x, dz = s.z - i.z, d = Math.hypot(dx, dz), min = i.R + 8.5;
    if (d < min && d > 1e-4) { s.x = i.x + dx / d * min; s.z = i.z + dz / d * min; s.speed -= s.speed * Math.min(1, dt * 3); } }
  for (const w of walls) for (const off of HULL) { const cx = s.x + fx * off - w.x, cz = s.z + fz * off - w.z, t = cx * w.tx + cz * w.tz, d = cx * w.nx + cz * w.nz, lim = w.th + HULL_R;
    if (Math.abs(t) < w.half + 1 && Math.abs(d) < lim) { const push = (d >= 0 ? 1 : -1) * lim - d; s.x += w.nx * push; s.z += w.nz * push; s.speed -= s.speed * Math.min(1, dt * 3); } }

  // soft edge of the world
  const dist = Math.hypot(s.x, s.z);
  if (dist > WORLD_R) { s.heading += clamp(angDiff(Math.atan2(-s.x, -s.z), s.heading), -1, 1) * dt * 1.6;
    if (!edgeWarned) { toast('Here be dragons. Turning back to charted waters.'); edgeWarned = true; } }
  else if (dist < WORLD_R - 15) edgeWarned = false;

  // which archipelago are we in?
  let A = null; for (const a of archs) if (Math.hypot(s.x - a.x, s.z - a.z) < a.reach) A = a;
  if (A !== s.arch) { s.arch = A; if (A && A.cfg.radius && s.t > 2) toast(`Entering ${A.cfg.title}`, 2200); }

  // docking
  s.near = null;
  for (const i of islands) if (Math.hypot(s.x - i.dockX, s.z - i.dockZ) < DOCK_R) s.near = i;
  if (!s.near) s.autoOpened = null;
  else if (coarse && s.started && !s.docked && s.autoOpened !== s.near) { s.autoOpened = s.near; dock(s.near); }
  const pr = $('prompt'), show = !!s.near && !s.docked && s.started;
  if (show) pr.innerHTML = coarse ? `Tap to dock at <b>${s.near.cfg.title}</b>` : `Press <kbd>Enter</kbd> to dock at <b>${s.near.cfg.title}</b>`;
  pr.classList.toggle('show', show);

  // rig: the boom swings to leeward, further out the further off the wind we sail
  const localWindX = WIND.x * fz - WIND.y * fx, side = localWindX >= 0 ? 1 : -1;
  s.boom += (-side * Math.min(twa * .5, 1.4) * (1.2 - .35 * s.trim) - s.boom) * damp(3.5, dt);
  rig.pivot.rotation.y = s.boom;
  const lee = -Math.sin(s.boom), flutter = twa < .5 ? Math.sin(s.t * 18) * .25 : 0;
  setSail(rig.main, [0, .15, -.12], [0, 9.4, -.12], [0, .15, -4.2], lee * .9 + flutter);
  setSail(rig.jib, [0, 1.15, 4.5], [0, 10.2, 1.15], [lee * 1.5, 1.6, .5], lee * 1.1 + flutter);
  rig.flag.rotation.y = Math.atan2(WIND.x, WIND.y) - s.heading + Math.sin(s.t * 9) * .12;

  // hull on the waves
  const y = waveHeight(s.x, s.z, s.t), yF = waveHeight(s.x + fx * 4, s.z + fz * 4, s.t), yB = waveHeight(s.x - fx * 4, s.z - fz * 4, s.t);
  s.heel += ((calm ? 0 : -side * Math.sin(twa) * (s.speed / MAX_SPEED) * .38) - s.heel) * damp(2.5, dt);
  boat.position.set(s.x, y * .75 + .05, s.z);
  boat.rotation.set(-Math.atan2(yF - yB, 8) * .8, s.heading, s.heel + s.rudder * -.04);

  // wake
  wakeT -= dt;
  if (s.speed > 1.5 && wakeT <= 0) { wakeT = .09; puff(s.x - fx * 3.6 + (Math.random() - .5) * .6, s.z - fz * 3.6 + (Math.random() - .5) * .6, .6 + s.speed * .08); }
  for (const w of wake) { if (w.userData.life <= 0) continue; w.userData.life -= dt * .38; w.scale.addScalar(w.userData.grow * dt);
    w.material.opacity = Math.max(0, w.userData.life) * .5; w.position.y = waveHeight(w.position.x, w.position.z, s.t) + .12; }

  // ambient motion + games
  for (const st of streaks) { st.position.x += WIND.x * st.userData.v * dt; st.position.z += WIND.y * st.userData.v * dt;
    if (st.position.x - s.x > 80) st.position.x -= 160; if (st.position.x - s.x < -80) st.position.x += 160;
    if (st.position.z - s.z > 80) st.position.z -= 160; if (st.position.z - s.z < -80) st.position.z += 160; }
  updateFloaters(dt, s, fx, fz); updateSquash(dt, s); updateGames(dt, s); updateCards(dt, s); updateRaces(dt, s, px, pz); updateWildlife(dt, s, fx, fz); updateMarine(dt, s, fx, fz); updateChip(s);
  for (const i of islands) { const d = Math.hypot(s.x - i.x, s.z - i.z); i.g.visible = i.ring.visible = d < 620; if (!i.g.visible) continue;
    if (i.tick) i.tick(s.t, d); i.ring.material.uniforms.pulse.value = (i.found ? .55 : .85) + Math.sin(s.t * 3) * .15; }
  for (const i of decor) { const d = Math.hypot(s.x - i.x, s.z - i.z); i.g.visible = d < 620; if (i.g.visible && i.tick) i.tick(s.t, d); }
  clouds.children.forEach(c => { c.position.x += WIND.x * dt * 1.5; c.position.z += WIND.y * dt * 1.5; if (c.position.z > 480) c.position.z -= 960; if (c.position.x > 480) c.position.x -= 960; });
  ocean.position.set(Math.round(s.x / CELL) * CELL, 0, Math.round(s.z / CELL) * CELL); updateOcean(s.t);

  // chase camera
  if (!cam.dragging && s.t - cam.lastDrag > 2.5) cam.yaw += angDiff(0, cam.yaw) * damp(1.5, dt);
  cam.heading += angDiff(s.heading, cam.heading) * damp(2.2, dt);
  const a = cam.heading + cam.yaw, cp = Math.cos(cam.pitch);
  const tx = s.x - Math.sin(a) * cp * cam.dist, ty = Math.sin(cam.pitch) * cam.dist + 3, tz = s.z - Math.cos(a) * cp * cam.dist;
  const k = update.snap ? 1 : damp(5, dt); update.snap = false;
  camera.position.set(camera.position.x + (tx - camera.position.x) * k, camera.position.y + (ty - camera.position.y) * k, camera.position.z + (tz - camera.position.z) * k);
  camera.lookAt(s.x + fx * 3, 4, s.z + fz * 3);
  sky.position.copy(camera.position);

  // HUD: compass shows archipelagos from afar, and the islands of the one you're in
  $('rose').style.transform = `rotate(${-Math.atan2(fx, -fz)}rad)`;
  $('windArrow').style.transform = `rotate(${Math.atan2(WIND.x, -WIND.y)}rad)`;
  for (const a of archs) { const inside = a === s.arch;
    if (a.dot) { a.dot.style.display = inside ? 'none' : ''; a.dot.style.transform = `rotate(${Math.atan2(a.x - s.x, -(a.z - s.z))}rad)`; a.dot.classList.toggle('found', a.islands.every(i => i.found)); }
    for (const i of a.islands) { const showDot = inside || !a.dot; i.dot.style.display = showDot ? '' : 'none'; if (showDot) i.dot.style.transform = `rotate(${Math.atan2(i.dockX - s.x, -(i.dockZ - s.z))}rad)`; } }
  audio.frame(s.speed / MAX_SPEED);
  $('speed').firstChild.textContent = (s.speed * .5).toFixed(1) + ' ';
  $('pos').textContent = s.docked ? 'Docked' : !s.started ? 'At anchor' : s.trim < .05 ? 'Sails eased: press W' : POINTS.find(p => twa < p[0])[1];
  $('trimBar').firstElementChild.style.width = (s.trim * 100) + '%';
  if (mapOpen && s.t - mapLast > .2) { mapLast = s.t; drawMap(s); }
}
update.snap = true;

function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 68 : 55; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => { update(Math.min(clock.getDelta(), .05)); renderer.render(scene, camera); });

// handy for poking around in the console
window.__sail = { state, cam, keys, islands, archs, update, floaters, walls, solids, decor, squash, serve, games, cards, race, RACES, whales, sharks, turtles, fish, pod, gulls, dolphins, camera, renderer, toggleMap, render: () => renderer.render(scene, camera) };
