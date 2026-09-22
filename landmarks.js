/* Landmark builders: everything that stands on an island, made from Three.js primitives.
   Each builder gets (g, y, isl, r): a group already facing the island's dock (+z), the height of the
   ground, the island record and a seeded random function. It returns the landmark's height (for the label).
   A builder may set isl.tick = (t, distanceToBoat) => {} for animation. */
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const cache = new Map();
export const mat = (color, o) => {
  if (o) return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: .85, ...o });
  if (!cache.has(color)) cache.set(color, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: .85 }));
  return cache.get(color);
};
export const put = (parent, geo, material, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); parent.add(m); return m; };
const box = (g, w, h, d, c, x, y, z) => put(g, new THREE.BoxGeometry(w, h, d), mat(c), x, y, z);
const cyl = (g, rt, rb, h, s, c, x, y, z) => put(g, new THREE.CylinderGeometry(rt, rb, h, s), mat(c), x, y, z);
const cone = (g, r, h, s, c, x, y, z) => put(g, new THREE.ConeGeometry(r, h, s), mat(c), x, y, z);
const ball = (g, r, c, x, y, z) => put(g, new THREE.SphereGeometry(r, 10, 8), mat(c), x, y, z);
const roof = (g, w, d, h, c, x, y, z) => { const m = put(g, new THREE.ConeGeometry(.7071, h, 4).rotateY(Math.PI / 4), mat(c), x, y + h / 2, z); m.scale.set(w, 1, d); return m; };   // pyramid roof, base at y
const prismGeo = new THREE.CylinderGeometry(1, 1, 1, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2);
const prism = (g, len, h, wid, c, x, y, z, alongZ) => { const m = put(g, prismGeo, mat(c), x, y + h / 3, z); m.scale.set(len, h / 1.5, wid / 1.732); if (alongZ) m.rotation.y = Math.PI / 2; return m; };   // gable roof, base at y
function beam(g, a, b, th, c) { const d = new THREE.Vector3().subVectors(b, a), m = put(g, new THREE.BoxGeometry(th, th, d.length()), mat(c)); m.position.copy(a).addScaledVector(d, .5); m.quaternion.setFromUnitVectors(V(0, 0, 1), d.normalize()); return m; }

function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function banner(g, text, bg, fg, w, h, x, y, z) {
  const tex = canvasTex(256, Math.round(256 * h / w), (c, W, H) => { c.fillStyle = bg; c.fillRect(0, 0, W, H); c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    let s = H * .62; do { c.font = `700 ${s}px Georgia, serif`; s -= 2; } while (c.measureText(text).width > W * .88 && s > 8); c.fillText(text, W / 2, H / 2 + 2); });
  return put(g, new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }), x, y, z);
}

export function labelSprite(text) {
  const tex = canvasTex(512, 128, (g) => { g.font = '700 54px Georgia, serif'; const w = Math.min(490, g.measureText(text).width + 70);
    g.fillStyle = 'rgba(16,38,58,.85)'; g.beginPath(); g.roundRect((512 - w) / 2, 22, w, 84, 42); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 256, 66, 440); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false, transparent: true })); s.scale.set(22, 5.5, 1); return s;
}
export const BANDS = ['#e4572e', '#f2b84b', '#2aa79b', '#3a86d4', '#9b5de5'];
export function cardTex(big, small, accent) {   // a flashcard face in the app's own style: white card, heavy black word, small grey caption
  return canvasTex(256, 352, (g) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 352); g.strokeStyle = '#e9e3c4'; g.lineWidth = 10; g.strokeRect(0, 0, 256, 352);
    g.fillStyle = accent; g.fillRect(0, 336, 256, 16); g.fillStyle = accent === '#2743d6' ? accent : '#111111'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 120; do { g.font = `900 ${size}px Impact, "Arial Narrow", sans-serif`; size -= 6; } while (g.measureText(big).width > 212 && size > 20);
    g.fillText(big, 128, 150); if (small) { g.font = '500 24px system-ui, sans-serif'; g.fillStyle = '#9a9684'; g.fillText(small, 128, 236); } });
}
export function cardMesh(w, h, d, tex) {
  const edge = mat(0xfffdf6), face = new THREE.MeshStandardMaterial({ map: tex, roughness: .9 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [edge, edge, edge, edge, face, face]); m.userData.face = face; return m;
}

let hull;
export function hullGeometry() {   // the yacht's hull; also reused for dinghies and the 3D print
  if (hull) return hull;
  const s = new THREE.Shape(); s.moveTo(0, 4.8); s.bezierCurveTo(1.3, 3, 1.75, .5, 1.5, -3.6); s.lineTo(-1.5, -3.6); s.bezierCurveTo(-1.75, .5, -1.3, 3, 0, 4.8);
  hull = new THREE.ExtrudeGeometry(s, { depth: 1.5, bevelEnabled: false, curveSegments: 8 }).rotateX(Math.PI / 2);
  const p = hull.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = Math.min(1, Math.max(0, -p.getY(i) / 1.5)); p.setX(i, p.getX(i) * (1 - .8 * Math.pow(t, 1.5))); p.setZ(i, p.getZ(i) * (1 - .22 * t)); }
  hull.translate(0, 1, 0); return hull;
}

// ---------- plants ----------
function palm(parent, x, y, z, r) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set((r() - .5) * .3, r() * 6, (r() - .5) * .3); parent.add(g);
  const h = 4.5 + r() * 2; cyl(g, .2, .38, h, 5, 0x8a5a2b, 0, h / 2, 0);
  for (let i = 0; i < 6; i++) { const l = put(g, leafGeo, mat(0x2f9e55), 0, h, 0); l.scale.z = .25; l.rotation.set(0, i * Math.PI / 3, 0); l.rotateX(1.9); }
}
const leafGeo = new THREE.ConeGeometry(.7, 3.4, 4).translate(0, 1.7, 0);
function pine(parent, x, y, z, r, snow) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(.9 + r() * .5); parent.add(g);
  cyl(g, .25, .32, 1.6, 5, 0x6b4a2b, 0, .8, 0);
  [[1.6, 2.4, 2.4], [1.25, 2.1, 3.7], [.9, 1.8, 4.9]].forEach(([w, h, yy], i) => cone(g, w, h, 6, snow && i ? 0xffffff : 0x2d6a4f, 0, yy, 0).rotation.y = r() * 3);
}
export const PLANTS = { palms: palm, pines: pine, snowpines: (p, x, y, z, r) => pine(p, x, y, z, r, true) };

function racket(g, x, y, z, s) {
  const k = new THREE.Group(); k.position.set(x, y, z); k.rotation.set(0, .5, .32); k.scale.setScalar(s); g.add(k);
  cyl(k, .2, .2, 3.4, 6, 0x16324f, 0, 1.7, 0); put(k, new THREE.TorusGeometry(1.7, .16, 6, 18), mat(0xe4572e), 0, 5.2, 0).scale.x = .8;
  for (let i = -2; i <= 2; i++) { box(k, .04, 3.1 - Math.abs(i) * .35, .04, 0xffffff, i * .5, 5.2, 0); box(k, 2.5 - Math.abs(i) * .3, .04, .04, 0xffffff, 0, 5.2 + i * .6, 0); }
}
function squashBall(g, r, x, y, z) { ball(g, r, 0x1c1c1c, x, y, z); for (const d of [-.23, .23]) ball(g, r * .17, 0xffd800, x + d * r, y + r * .15, z + r * .94); }
function dinghy(g, x, z, rot, sailColour) {
  const d = new THREE.Group(); d.position.set(x, .1, z); d.rotation.y = rot; d.scale.setScalar(.42); g.add(d);
  put(d, hullGeometry(), mat(0xffffff)); cyl(d, .08, .08, 8, 5, 0xe9e4d8, 0, 5, 1);
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 1.8, .9, 0, 8.6, .9, .6, 1.8, -3]), 3)); tri.computeVertexNormals();
  put(d, tri, new THREE.MeshStandardMaterial({ color: sailColour, side: THREE.DoubleSide, flatShading: true }));
}

export function chessPiece(type, colour) {   // 'K' 'Q' 'R' 'B' 'P'; base sits at y = 0
  const g = new THREE.Group(), c = colour, H = { K: 3.6, Q: 3.3, R: 2.5, B: 2.9, P: 2 }[type];
  cyl(g, 1, 1.15, .35, 12, c, 0, .18, 0); cyl(g, .8, .95, .25, 12, c, 0, .47, 0); cyl(g, .42, .75, H - 1, 10, c, 0, .6 + (H - 1) / 2, 0); cyl(g, .7, .5, .22, 12, c, 0, H - .3, 0);
  if (type === 'P') ball(g, .55, c, 0, H + .25, 0);
  if (type === 'R') { cyl(g, .75, .7, .6, 10, c, 0, H + .1, 0); for (let i = 0; i < 4; i++) box(g, .4, .35, .4, c, Math.cos(i * 1.571) * .55, H + .55, Math.sin(i * 1.571) * .55); }
  if (type === 'B') { ball(g, .55, c, 0, H + .3, 0).scale.y = 1.35; ball(g, .16, c, 0, H + 1.12, 0); }
  if (type === 'Q') { cone(g, .7, .9, 8, c, 0, H + .25, 0).rotation.x = Math.PI; ball(g, .22, c, 0, H + .85, 0); }
  if (type === 'K') { cyl(g, .6, .45, .7, 10, c, 0, H + .25, 0); box(g, .18, .9, .18, c, 0, H + 1.05, 0); box(g, .6, .18, .18, c, 0, H + 1.15, 0); }
  return g;
}

const INK = '#10263a'
, CORAL = '#e4572e', TEAL = '#2aa79b', KBLUE = '#2743d6';

// ---------- the landmarks ----------
export const LANDMARKS = {
  lighthouse(g, y, isl) {
    cyl(g, 1.6, 2.5, 14, 8, 0xf7f3ea, 0, y + 7, 0); cyl(g, 2.17, 2.34, 2.2, 8, 0xe4572e, 0, y + 4, 0); cyl(g, 1.79, 1.95, 2.2, 8, 0xe4572e, 0, y + 10, 0);
    cyl(g, 2.3, 2.3, .4, 8, 0x16324f, 0, y + 14.2, 0);
    put(g, new THREE.CylinderGeometry(1.2, 1.2, 1.8, 8), mat(0xffe28a, { emissive: 0xffc93c, emissiveIntensity: 1.2 }), 0, y + 15.3, 0); cone(g, 1.9, 2, 8, 0xe4572e, 0, y + 17.2, 0);
    const b = new THREE.Group(); b.position.set(0, y + 15.3, 0); g.add(b);
    const bg = new THREE.ConeGeometry(3.5, 34, 10, 1, true).translate(0, -17, 0).rotateZ(Math.PI / 2);
    const bm = new THREE.MeshBasicMaterial({ color: 0xfff0a8, transparent: true, opacity: .06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
    put(b, bg, bm); put(b, bg, bm).rotation.y = Math.PI; isl.tick = (t) => { b.rotation.y = t * .8; }; return 21;
  },

  phone(g, y, isl) {   // Karteto: a giant smartphone cycling through real screenshots of the app, flanked by two feature screens
    const load = new THREE.TextureLoader(), shot = (i) => { const t = load.load(`assets/karteto-${i}.jpg`); t.colorSpace = THREE.SRGBColorSpace; return t; };
    const shots = [1, 2, 4, 7, 5, 6, 8, 3].map(shot), dark = mat(0x1b1f24, { roughness: .35 });
    const device = (w, h, x, z, ry) => { const p = new THREE.Group(); p.position.set(x, y + .6, z); p.rotation.set(-.09, ry, 0, 'YXZ'); g.add(p);
      const s = new THREE.Shape(), rr = w * .28; s.moveTo(-w + rr, -h); s.lineTo(w - rr, -h); s.quadraticCurveTo(w, -h, w, -h + rr); s.lineTo(w, h - rr); s.quadraticCurveTo(w, h, w - rr, h);
      s.lineTo(-w + rr, h); s.quadraticCurveTo(-w, h, -w, h - rr); s.lineTo(-w, -h + rr); s.quadraticCurveTo(-w, -h, -w + rr, -h);
      put(p, new THREE.ExtrudeGeometry(s, { depth: .9, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -.45), dark, 0, h, 0); return p; };
    const p = device(4.3, 9.05, 0, -1, 0), W = 7.8, H = W * 1224 / 576, h = 9.05; box(g, 7, .6, 3.4, 0x16324f, 0, y + .3, -1);
    const A = new THREE.MeshBasicMaterial({ map: shots[0] }), B = new THREE.MeshBasicMaterial({ map: shots[1], transparent: true, opacity: 0 });
    put(p, new THREE.PlaneGeometry(W, H), A, 0, h, .47); put(p, new THREE.PlaneGeometry(W, H), B, 0, h, .48); box(p, 2, .42, .06, 0x1b1f24, 0, h * 2 - .8, .52);
    const backTex = canvasTex(360, 760, (c) => { c.fillStyle = KBLUE; c.fillRect(0, 0, 360, 760); c.fillStyle = '#fdf6d3'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '900 76px Impact, "Arial Narrow", sans-serif'; c.fillText('KARTETO', 180, 350); c.font = '600 24px system-ui, sans-serif'; c.fillText('vocabulary flashcards', 180, 420); });
    put(p, new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: backTex }), 0, h, -.47).rotation.y = Math.PI;
    [[-8.6, 'Flashcards', 1, .42], [8.6, 'AI stories', 3, -.42]].forEach(([x, cap, k, ry]) => { const d = device(2.5, 5.25, x, 1.2, ry), w = 4.5;
      put(d, new THREE.PlaneGeometry(w, w * 1224 / 576), new THREE.MeshBasicMaterial({ map: shots[k] }), 0, 5.25, .47); banner(g, cap, KBLUE, '#fdf6d3', 4.6, 1, x, y + .5, 3.4).rotation.y = ry; });
    banner(g, 'Download on the App Store', '#10263a', '#ffffff', 8, 1.5, 0, y + .9, 5.6); for (const x of [-3.6, 3.6]) cyl(g, .12, .12, 1, 5, 0xe9e4d8, x, y + .3, 5.55);
    let last = -1; isl.tick = (t) => { const k = Math.floor(t / 3.4), f = (t / 3.4) % 1; if (k !== last) { last = k; A.map = shots[k % 8]; B.map = shots[(k + 1) % 8]; } B.opacity = Math.min(1, Math.max(0, (f - .85) / .15)); };
    return 20;
  },

  tower(g, y) {   // fintech: glass towers and a price chart
    put(g, new THREE.BoxGeometry(4.5, 17, 4.5), mat(0x27476e, { roughness: .3 }), -1, y + 8.5, -1); for (let i = 1; i < 7; i++) box(g, 4.6, .22, 4.6, 0x9fd3e6, -1, y + i * 2.4, -1);
    put(g, new THREE.BoxGeometry(3.2, 11, 3.2), mat(0x3a6ea5, { roughness: .3 }), 3.4, y + 5.5, -1.5); for (let i = 1; i < 5; i++) box(g, 3.3, .2, 3.3, 0xbfe3f0, 3.4, y + i * 2.2, -1.5);
    cyl(g, .06, .06, 4, 4, 0xd9dee3, -1, y + 19, -1);
    const tex = canvasTex(320, 160, (c) => { c.fillStyle = '#0e1b2a'; c.fillRect(0, 0, 320, 160); let v = 118; const pts = [];
      for (let i = 0; i < 16; i++) { const o = v, ch = Math.sin(i * 2.1) * 14 - 5.5; v += ch; const x = 14 + i * 19; c.fillStyle = c.strokeStyle = ch < 0 ? '#35c48d' : '#e4572e'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x + 5, Math.min(o, v) - 7); c.lineTo(x + 5, Math.max(o, v) + 7); c.stroke(); c.fillRect(x, Math.min(o, v), 10, Math.abs(ch) + 2); pts.push([x + 5, v]); }
      c.strokeStyle = '#f2b84b'; c.lineWidth = 3; c.beginPath(); pts.forEach(([x, yy], i) => i ? c.lineTo(x, yy + 12) : c.moveTo(x, yy + 12)); c.stroke(); });
    put(g, new THREE.PlaneGeometry(8, 4), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }), -2.5, y + 3.6, 4.2); for (const x of [-6, 1]) cyl(g, .12, .12, 2, 5, 0x5f6a72, x, y + 1, 4.2);
    return 21.5;
  },

  factory(g, y) {   // corporate years: a plant with a car and a bottling line out front
    box(g, 12, 4.2, 7, 0xb9c0c4, -.5, y + 2.1, -1.5); for (const z of [-3.83, -1.5, .83]) prism(g, 12, 1.5, 2.33, 0x7d878c, -.5, y + 4.2, z);
    cyl(g, .55, .7, 9, 8, 0xd9dee3, -5, y + 4.5, -3.5); cyl(g, .6, .62, .9, 8, 0xd23a2a, -5, y + 7.6, -3.5); box(g, 2.4, 2.6, .1, 0x3b444a, -.5, y + 1.3, 2.02);
    const car = new THREE.Group(); car.position.set(3.4, y, 4.4); car.rotation.y = .5; g.add(car); box(car, 3.4, .8, 1.5, 0xd23a2a, 0, .75, 0); box(car, 1.8, .7, 1.35, 0x222a30, -.1, 1.45, 0);
    for (const x of [-1.1, 1.1]) for (const z of [-.75, .75]) cyl(car, .4, .4, .25, 10, 0x15181b, x, .4, z).rotation.x = Math.PI / 2;
    for (let i = 0; i < 3; i++) { const x = -5 + i * 1.7; box(g, 1.4, .8, 1.4, 0xd23a2a, x, y + .4 + (i === 1 ? .8 : 0), 4.2); if (i === 1) box(g, 1.4, .8, 1.4, 0xd23a2a, x, y + .4, 4.2);
      for (const dx of [-.35, .35]) for (const dz of [-.35, .35]) cyl(g, .16, .2, .7, 6, 0x3b2a1a, x + dx, y + 1.1 + (i === 1 ? .8 : 0), 4.2 + dz); }
    return 10.5;
  },

  toolbox(g, y, isl) {   // skills
    box(g, 7, 2.6, 3.4, 0xd23a2a, 0, y + 1.3, 0); box(g, 7.2, .7, 3.6, 0xb02e20, 0, y + 2.95, 0); for (const x of [-2, 2]) box(g, .7, .8, .15, 0xd9dee3, x, y + 2.5, 1.78);
    for (const x of [-1.6, 1.6]) box(g, .3, 1, .3, 0x222a30, x, y + 3.8, 0); box(g, 3.5, .3, .3, 0x222a30, 0, y + 4.3, 0);
    const w = box(g, .5, 5, .25, 0xc8d0d6, 5, y + 2.4, 1); w.rotation.z = -.3; put(g, new THREE.TorusGeometry(.7, .22, 5, 10, 4.6), mat(0xc8d0d6), 5.85, y + 5.1, 1).rotation.z = 1.2;
    const gear = new THREE.Group(); gear.position.set(-5, y + 1.9, 1.2); g.add(gear); cyl(gear, 1.5, 1.5, .5, 12, 0xf2b84b, 0, 0, 0).rotation.x = Math.PI / 2; cyl(gear, .5, .5, .54, 8, 0x222a30, 0, 0, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; box(gear, .6, .6, .5, 0xf2b84b, Math.cos(a) * 1.7, Math.sin(a) * 1.7, 0).rotation.z = a; }
    isl.tick = (t) => { gear.rotation.z = t * .6; }; return 6.5;
  },

  university(g, y) {   // LSE
    box(g, 12, .5, 8.5, 0xd8d2c4, 0, y + .25, 0); box(g, 10.5, 5, 6.5, 0xefe8d8, 0, y + 3, -.4); for (let i = 0; i < 6; i++) cyl(g, .38, .42, 4.6, 8, 0xffffff, -4.4 + i * 1.76, y + 2.8, 3.4);
    box(g, 11, .6, 8, 0xe2dbc9, 0, y + 5.4, 0); prism(g, 8, 2.2, 11, 0xefe8d8, 0, y + 5.7, 0, true); box(g, 1.8, 2.8, .1, 0x5a3a22, 0, y + 1.9, 2.87);
    banner(g, 'LSE', '#c8102e', '#ffffff', 3.4, 1.4, 0, y + 4.55, 3.85);
    for (const x of [-5.6, 5.6]) { cyl(g, .07, .07, 6, 4, 0xd9dee3, x, y + 3.5, 4); box(g, 1.5, .9, .04, 0xc8102e, x + .8, y + 5.9, 4); }
    return 9;
  },

  modern(g, y) {   // ESADE
    put(g, new THREE.BoxGeometry(8, 6.5, 6), mat(0x8fc7de, { roughness: .15 }), -1.5, y + 3.25, -.5); for (const h of [2.2, 4.4, 6.6]) box(g, 8.4, .22, 6.4, 0xffffff, -1.5, y + h, -.5);
    box(g, 5, 3.6, 5, 0xffffff, 4.5, y + 1.8, .5); banner(g, 'ESADE', '#003da5', '#ffffff', 4, 1.2, 4.5, y + 2.4, 3.03);
    cyl(g, .1, .1, 4, 5, 0xd9dee3, -6.2, y + 2, 3); cyl(g, .8, .8, .5, 10, 0x16181b, -6.2, y + 4.2, 3); box(g, 2.4, .12, 2.4, 0x16181b, -6.2, y + 4.55, 3).rotation.y = .5; box(g, .08, 1, .08, 0xf2b84b, -5.3, y + 4.1, 3.6);
    return 9;
  },

  school(g, y) {   // Dulwich College
    box(g, 9, 4, 5, 0xa8533a, 0, y + 2, -.5); prism(g, 9.4, 2, 5.4, 0x4a3b35, 0, y + 4, -.5); box(g, 2.2, 8.5, 2.2, 0xa8533a, 0, y + 4.25, 1.6); roof(g, 2.7, 2.7, 2.4, 0x4a3b35, 0, y + 8.5, 1.6);
    cyl(g, .75, .75, .12, 14, 0xffffff, 0, y + 7.1, 2.74).rotation.x = Math.PI / 2; for (const x of [-3.2, -1.9, 1.9, 3.2]) box(g, .8, 1.4, .1, 0xf3ead2, x, y + 2.3, 2.02); box(g, 1, 1.9, .1, 0x3b2a1a, 0, y + .95, 2.72);
    return 12;
  },

  akadem(g, y, isl) {   // Akademgorodok: a research institute in the snow, with an atom on the roof
    box(g, 8, 3.6, 4.5, 0xcfd4d8, 0, y + 1.8, -.5); for (const h of [1.3, 2.6]) box(g, 8.05, .5, 4.55, 0x3b4a57, 0, y + h, -.5); box(g, 8.3, .3, 4.8, 0xffffff, 0, y + 3.75, -.5);
    cyl(g, .1, .1, 2, 5, 0xd9dee3, 0, y + 4.9, -.5); const a = new THREE.Group(); a.position.set(0, y + 6.6, -.5); g.add(a); ball(a, .7, 0xe4572e, 0, 0, 0);
    for (let i = 0; i < 3; i++) put(a, new THREE.TorusGeometry(1.9, .07, 5, 24), mat(0xc8d0d6), 0, 0, 0).rotation.set(Math.PI / 2, i * Math.PI / 3, 0);
    isl.tick = (t) => { a.rotation.y = t * .7; }; return 9.5;
  },

  moscow(g, y) {
    box(g, 11, 2.6, 1.2, 0x9b2d20, 0, y + 1.3, -1.5); for (let i = 0; i < 7; i++) box(g, .8, .7, 1.2, 0x9b2d20, -4.8 + i * 1.6, y + 2.95, -1.5);
    box(g, 3, 8, 3, 0x9b2d20, -2.8, y + 4, -1.5); box(g, 2.2, 2.6, 2.2, 0x9b2d20, -2.8, y + 9.3, -1.5); roof(g, 2.7, 2.7, 5, 0x2f6b4f, -2.8, y + 10.6, -1.5);
    put(g, new THREE.OctahedronGeometry(.6), mat(0xe0202a, { emissive: 0xe0202a, emissiveIntensity: .6 }), -2.8, y + 16.1, -1.5);
    [[3, 1, 1.3, 4, 0xd98a1f], [5.2, -.6, .75, 3, 0x2e6fb5], [1.2, 2.7, .75, 3, 0x3a9a5c]].forEach(([x, z, r, h, c]) => { cyl(g, r, r, h, 8, 0xfaf8f2, x, y + h / 2, z); ball(g, r * 1.05, c, x, y + h + r * .8, z).scale.y = 1.3; cone(g, r * .3, r * 1.3, 6, c, x, y + h + r * 2.4, z); });
    return 18;
  },

  london(g, y) {
    box(g, 2.6, 12, 2.6, 0xcbb27c, -2.5, y + 6, -.5); box(g, 3.1, 3, 3.1, 0xd8c48f, -2.5, y + 13.4, -.5);
    cyl(g, 1.1, 1.1, .1, 14, 0xffffff, -2.5, y + 13.4, 1.08).rotation.x = Math.PI / 2; for (const s of [-1, 1]) cyl(g, 1.1, 1.1, .1, 14, 0xffffff, -2.5 + s * 1.58, y + 13.4, -.5).rotation.z = Math.PI / 2;
    roof(g, 3.3, 3.3, 3.8, 0x4a4f57, -2.5, y + 14.9, -.5);
    box(g, 5, 2.7, 1.9, 0xd42a20, 3, y + 1.75, 2.2); for (const h of [1.5, 2.55]) box(g, 5.05, .5, 1.95, 0x222a30, 3, y + h, 2.2); for (const x of [1.4, 4.6]) for (const z of [1.3, 3.1]) cyl(g, .4, .4, .2, 8, 0x15181b, x, y + .4, z).rotation.x = Math.PI / 2;
    box(g, 1, 2.3, 1, 0xd42a20, -5.6, y + 1.15, 2.6); box(g, 1.1, .25, 1.1, 0xb02018, -5.6, y + 2.4, 2.6);
    return 19.5;
  },

  barcelona(g, y) {
    box(g, 7, 4, 4, 0xc9a36b, 0, y + 2, -1); [[-2.7, 11], [-.9, 14], [.9, 14], [2.7, 11]].forEach(([x, h], i) => { cone(g, .85, h, 8, 0xd2ad74, x, y + 3 + h / 2, .4); ball(g, .35, [0xe4572e, 0xf2b84b, 0x2aa79b, 0x3a86d4][i], x, y + 3 + h + .2, .4); });
    cyl(g, .9, .9, .1, 12, 0x3a86d4, 0, y + 2.9, 1.06).rotation.x = Math.PI / 2;
    for (let i = 0; i < 7; i++) box(g, 1.1, .8 + Math.sin(i * 1.7) * .25, .7, parseInt(BANDS[i % 5].slice(1), 16), -3.9 + i * 1.3, y + .4, 3.6 + Math.sin(i * 1.2) * .5);
    return 18;
  },

  split(g, y) {
    [[3, 4.5, 2.25], [2.6, 3.5, 6.25], [2.2, 3, 9.5]].forEach(([w, h, yy]) => { box(g, w, h, w, 0xe8dcc0, -2.8, y + yy, -.5); box(g, w * .35, h * .5, w + .06, 0x6b5d4a, -2.8, y + yy + .2, -.5); });
    roof(g, 2.5, 2.5, 2.6, 0xb5523a, -2.8, y + 11, -.5);
    [[2, -1.2, 3], [4.8, 1.2, 2.6], [1.4, 2.6, 2.4]].forEach(([x, z, w]) => { box(g, w, 2.4, w, 0xfaf6ea, x, y + 1.2, z); roof(g, w + .3, w + .3, 1.3, 0xc25a3c, x, y + 2.4, z); });
    for (let i = 0; i < 4; i++) cyl(g, .22, .25, 2.8, 6, 0xd8cfb8, -5.2 + i * 1.3, y + 1.4, 3.4); box(g, 4.6, .3, .6, 0xd8cfb8, -3.25, y + 2.95, 3.4);
    return 14;
  },

  telaviv(g, y) {
    box(g, 7, 4.5, 4, 0xfafafa, -1.8, y + 2.25, -1.5); for (const h of [1.6, 3.1]) { box(g, 6, .2, 1.2, 0xffffff, -2.3, y + h, 1.1); cyl(g, .6, .6, .2, 10, 0xffffff, .7, y + h, 1.1); box(g, 6, .5, .06, 0x3b4a57, -1.8, y + h + .75, .52); }
    box(g, 3.5, 7, 3.5, 0xf4f1e8, 4, y + 3.5, -2); for (const h of [1.5, 3.2, 4.9]) box(g, 3.56, .45, 3.56, 0x3b4a57, 4, y + h, -2); box(g, 1.6, .8, 1.6, 0xfafafa, 4, y + 7.4, -2);
    [[-4, CORAL], [0, TEAL], [4, '#f2b84b']].forEach(([x, c]) => { cyl(g, .06, .06, 2.4, 4, 0xffffff, x, y + 1.2, 4.6); cone(g, 1.4, .7, 8, parseInt(c.slice(1), 16), x, y + 2.5, 4.6); box(g, 1.7, .12, .7, 0xffffff, x + .9, y + .3, 5.2); });
    return 9.5;
  },

  dubai(g, y) {
    let yy = y; const m = mat(0xaec6d8, { roughness: .25, metalness: .45 });
    [[2.4, 6], [1.8, 6], [1.25, 6], [.75, 5], [.35, 5]].forEach(([r, h]) => { put(g, new THREE.CylinderGeometry(r * .8, r, h, 6), m, -1.5, yy + h / 2, -.5); yy += h; }); cone(g, .15, 5, 5, 0xd9dee3, -1.5, yy + 2.5, -.5);
    put(g, new THREE.BoxGeometry(2.2, 9, 2.2), mat(0x7fa6c4, { roughness: .3 }), 3.2, y + 4.5, 1); put(g, new THREE.BoxGeometry(1.8, 6.5, 1.8), mat(0x5d8fb3, { roughness: .3 }), 5.2, y + 3.25, -1.8); put(g, new THREE.BoxGeometry(1.6, 5, 1.6), mat(0x7fa6c4, { roughness: .3 }), -5, y + 2.5, 1.5);
    return 34;
  },

  marina(g, y, isl) {   // sailing
    box(g, 4.5, 2.8, 3.5, 0xfaf8f2, -3, y + 1.4, -.5); prism(g, 4.9, 1.5, 3.9, 0x3a86d4, -3, y + 2.8, -.5); box(g, 1, 1.9, .1, 0x16324f, -3, y + .95, 1.27);
    cyl(g, .1, .12, 9, 5, 0xffffff, 2.5, y + 4.5, 0); box(g, 3.6, .1, .1, 0xffffff, 2.5, y + 7.2, 0); for (let i = 0; i < 5; i++) box(g, .6, .5, .04, parseInt(BANDS[i].slice(1), 16), 1 + i * .75, y + 6.8 - Math.abs(i - 2) * .12, 0);
    const wh = new THREE.Group(); wh.position.set(5.6, y + 2.2, 2); wh.rotation.y = -.4; g.add(wh); put(wh, new THREE.TorusGeometry(1.3, .14, 6, 16), mat(0x8a5a2b)); for (let i = 0; i < 4; i++) box(wh, 3.3, .14, .14, 0x8a5a2b, 0, 0, 0).rotation.z = i * Math.PI / 4;
    cyl(g, .16, .2, 2.2, 5, 0x6e4f2c, 5.6, y + 1.1, 1.85);
    const R = isl.R; dinghy(g, R + 5, 2, .4, 0xe4572e); dinghy(g, -(R + 5), 3, -.5, 0x3a86d4); dinghy(g, -(R + 3), -R * .6, 2.4, 0xf2b84b);
    return 10;
  },

  ski(g, y) {
    cone(g, 8, 14, 6, 0x9aa7ad, -1.5, y + 6, -1.5).rotation.y = .4; cone(g, 3.45, 6, 6, 0xffffff, -1.5, y + 10.05, -1.5).rotation.y = .4;
    const a = V(7, y + 4.6, 4.5), b = V(.8, y + 10.4, .4); cyl(g, .14, .14, 5, 5, 0x3b4a57, 7, y + 2.2, 4.5); cyl(g, .14, .14, 3, 5, 0x3b4a57, .8, y + 9, .4); beam(g, a, b, .07, 0x222a30);
    box(g, .9, .12, .5, 0xe4572e, 3.9, y + 6.6, 2.45); box(g, .06, .9, .06, 0x222a30, 3.9, y + 7.05, 2.45);
    const sk = new THREE.Group(); sk.position.set(3.6, y + 3.6, 4.2); sk.rotation.set(.35, .6, 0); g.add(sk); put(sk, new THREE.CapsuleGeometry(.32, .8, 3, 8), mat(0xe4572e), 0, .95, 0); ball(sk, .27, 0xf0c9a0, 0, 1.85, 0);
    for (const x of [-.2, .2]) box(sk, .12, .05, 2, 0x16324f, x, .1, .2);
    for (const [x, z, c] of [[5.2, 6, 0xe4572e], [2, 6.6, 0x3a86d4]]) { cyl(g, .05, .05, 1.6, 4, 0xffffff, x, y + 1.6, z); box(g, .6, .4, .04, c, x + .3, y + 2.2, z); }
    return 14.5;
  },

  printer(g, y, isl) {   // 3D printing: a gantry printer printing a small boat
    for (const x of [-4, 4]) for (const z of [-3, 3]) box(g, .4, 9, .4, 0x222a30, x, y + 4.5, z); for (const z of [-3, 3]) box(g, 8.4, .4, .4, 0x222a30, 0, y + 9, z); for (const x of [-4, 4]) box(g, .4, .4, 6.4, 0x222a30, x, y + 9, 0);
    box(g, 7, .3, 5.5, 0x30363b, 0, y + .4, 0); put(g, new THREE.TorusGeometry(1, .35, 6, 14), mat(0x2aa79b), 4.5, y + 8, 0).rotation.y = Math.PI / 2;
    const gan = box(g, 8.4, .35, .35, 0x5f6a72, 0, y + 2, 0), head = box(g, 1, .9, 1, 0xe4572e, 0, y + 1.8, 0), print = put(g, hullGeometry(), mat(0xf2b84b)); print.rotation.y = Math.PI / 2; const S = .62;
    isl.tick = (t) => { const p = Math.min(1, (t * .07) % 1.25); print.scale.set(S, S * Math.max(.02, p), S); print.position.set(0, y + .55 + .5 * S * p, 0);
      const top = y + .6 + 1.5 * S * p; gan.position.y = top + 1.1; head.position.set(Math.sin(t * 3) * 2.6, top + .6, Math.sin(t * 1.3) * .5); gan.position.z = head.position.z; };
    return 10.5;
  },

  workbench(g, y) {   // woodworking
    box(g, 7, .4, 2.8, 0xc99a5b, 0, y + 2.4, 0); for (const x of [-3.1, 3.1]) for (const z of [-1.1, 1.1]) box(g, .4, 2.3, .4, 0x8a5a2b, x, y + 1.15, z); box(g, 6.2, .2, 2.2, 0xa47a48, 0, y + .8, 0);
    box(g, .9, .7, 1, 0x3b444a, 3, y + 2.95, 1); box(g, 2.6, .7, .05, 0xc8d0d6, -1.4, y + 2.97, .4).rotation.x = -.4; box(g, .7, .5, .16, 0x8a5a2b, -2.9, y + 3, .4);
    const toy = put(g, hullGeometry(), mat(0xb98a55), .8, y + 2.72, -.2); toy.scale.setScalar(.24); toy.rotation.y = 1.2;
    [[0, 0], [1.15, 0], [2.3, 0], [.57, .95], [1.72, .95], [1.15, 1.9]].forEach(([x, h]) => cyl(g, .55, .55, 3.2, 8, 0x8a5a2b, -7.2 + x, y + .55 + h, 1).rotation.x = Math.PI / 2);
    cyl(g, .8, .8, .2, 10, 0xc99a5b, 5.2, y + 1.4, 2.4); for (let i = 0; i < 3; i++) cyl(g, .08, .08, 1.4, 4, 0x8a5a2b, 5.2 + Math.cos(i * 2.1) * .5, y + .7, 2.4 + Math.sin(i * 2.1) * .5);
    for (let i = 0; i < 4; i++) box(g, 4, .16, .7, 0xd9b27a, 3, y + .1 + i * .17, -3 + (i % 2) * .15);
    return 5.5;
  },

  pitch(g, y) {   // football
    box(g, 12, .15, 8, 0x3f9b46, 0, y + .08, 0); const L = 0xffffff, yy = y + .17; for (const z of [-3.9, 3.9]) box(g, 12, .03, .12, L, 0, yy, z); for (const x of [-5.95, 0, 5.95]) box(g, .12, .03, 7.9, L, x, yy, 0);
    put(g, new THREE.TorusGeometry(1.3, .06, 4, 20), mat(L), 0, yy, 0).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) { for (const z of [-1.2, 1.2]) cyl(g, .07, .07, 1.6, 5, L, s * 5.9, y + .9, z); box(g, .1, .1, 2.5, L, s * 5.9, y + 1.7, 0); box(g, .03, .03, 2.4, L, s * 6.6, y + .9, 0); box(g, .12, .03, 3.6, L, s * 4.4, yy, 0); }
    ball(g, .4, 0xffffff, .6, y + .55, .4); for (const x of [-5.9, 5.9]) for (const z of [-3.9, 3.9]) { cyl(g, .04, .04, 1.2, 4, L, x, y + .7, z); box(g, .4, .3, .03, 0xe4572e, x + .2, y + 1.15, z); }
    return 4.5;
  },

  clubhouse(g, y) {   // the squash pontoon
    box(g, 3, 2.4, 2.6, 0xfaf8f2, -1.4, y + 1.2, -1); prism(g, 3.4, 1.2, 3, 0xe4572e, -1.4, y + 2.4, -1); box(g, .9, 1.7, .08, 0x16324f, -1.4, y + .85, .32);
    racket(g, 2.4, y, -.6, .72); squashBall(g, .6, -1.4, y + 4, -1); box(g, 2, .15, .6, 0xa47a48, 1.8, y + .6, 1.6);
    return 7;
  },

  rink(g, y) {   // ice hockey
    const ice = put(g, new THREE.CylinderGeometry(6, 6, .2, 28), mat(0xeaf6ff, { roughness: .2 }), 0, y + .1, 0); ice.scale.set(1.6, 1, 1);
    const boards = put(g, new THREE.TorusGeometry(6, .28, 5, 32), mat(0xffffff), 0, y + .45, 0); boards.rotation.x = Math.PI / 2; boards.scale.set(1.6, 1, 1);
    box(g, .22, .03, 11.8, 0xd23a2a, 0, y + .22, 0); for (const x of [-3.4, 3.4]) box(g, .22, .03, 11.2, 0x3a86d4, x, y + .22, 0); put(g, new THREE.TorusGeometry(1.3, .07, 4, 20), mat(0xd23a2a), 0, y + .22, 0).rotation.x = Math.PI / 2;
    for (const sd of [-1, 1]) { for (const z of [-1, 1]) cyl(g, .08, .08, 1.3, 5, 0xd23a2a, sd * 7.8, y + .85, z); box(g, .12, .12, 2.1, 0xd23a2a, sd * 7.8, y + 1.5, 0); put(g, new THREE.BoxGeometry(.9, 1.2, 2, 2, 2, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }), sd * 8.3, y + .85, 0); }
    [[-2.5, 1.5, 0xd23a2a, .6], [2.8, -1.2, 0x16324f, -2.4]].forEach(([x, z, c, ry]) => { const p = new THREE.Group(); p.position.set(x, y + .2, z); p.rotation.y = ry; g.add(p);
      put(p, new THREE.CapsuleGeometry(.5, 1, 3, 8), mat(c), 0, 1.2, 0); ball(p, .36, 0xffffff, 0, 2.35, 0); const st = box(p, .1, 2.2, .1, 0x8a5a2b, .7, .95, .5); st.rotation.x = .9; box(p, .12, .12, .7, 0x15181b, .7, .12, 1.55); });
    cyl(g, .3, .3, .15, 12, 0x15181b, .9, y + .3, .6);
    return 5;
  },

  tennis(g, y) {
    box(g, 14, .15, 7.5, 0x2f7d5b, 0, y + .08, 0); const L = 0xffffff, yy = y + .17; for (const z of [-3.2, 3.2, -2.4, 2.4]) box(g, 12.6, .03, .1, L, 0, yy, z); for (const x of [-6.3, 6.3]) box(g, .1, .03, 6.5, L, x, yy, 0);
    for (const x of [-3.3, 3.3]) box(g, .1, .03, 4.8, L, x, yy, 0); box(g, 6.6, .03, .1, L, 0, yy, 0);
    for (const z of [-3.7, 3.7]) cyl(g, .1, .1, 1.3, 5, 0x15181b, 0, y + .7, z); put(g, new THREE.BoxGeometry(.05, 1, 7.4, 1, 3, 14), new THREE.MeshBasicMaterial({ color: L, wireframe: true }), 0, y + .7, 0); box(g, .08, .1, 7.4, L, 0, y + 1.22, 0);
    cyl(g, .1, .1, 2.6, 4, L, 0, y + 1.3, -5); box(g, 1, .1, 1, L, 0, y + 2.6, -5); box(g, 1, 1, .1, L, 0, y + 3.1, -5.45);
    ball(g, .9, 0xd7f03c, 5, y + 1, 5); put(g, new THREE.TorusGeometry(.9, .06, 4, 16, 3.6), mat(L), 5, y + 1, 5).rotation.set(.6, .4, 0); racket(g, -6.5, y, 4.6, .6);
    return 5.5;
  },

  chess(g, y) {
    const tex = canvasTex(256, 256, (c) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { c.fillStyle = (i + j) % 2 ? '#2f5d50' : '#f3ead2'; c.fillRect(i * 32, j * 32, 32, 32); } }), side = mat(0x5b4632);
    put(g, new THREE.BoxGeometry(10, .5, 10), [side, side, new THREE.MeshStandardMaterial({ map: tex, roughness: .8 }), side, side, side], 0, y + .25, 0);
    [['K', 0, -3.1, 1], ['Q', -1.25, -3.1, 1], ['R', 4.4, -4.4, 1], ['P', 1.9, -1.9, 1], ['K', -.6, 3.1, 0], ['B', 1.9, 3.1, 0], ['P', -3.1, 1.9, 0], ['P', .6, .6, 0]].forEach(([t, x, z, w]) => { const p = chessPiece(t, w ? 0xf7f3ea : 0x22262b); p.scale.setScalar(.55); p.position.set(x, y + .5, z); g.add(p); });
    return 4.5;
  },

  boulder(g, y, isl, r) {   // bouldering: an overhanging block with coloured holds, a climber and a crash pad
    const rock = put(g, new THREE.DodecahedronGeometry(6, 0), mat(0xa89e8a), 0, y + 5.5, -2); rock.scale.set(1.15, 1.45, .8); rock.rotation.set(.22, .4, .1);
    put(g, new THREE.DodecahedronGeometry(3.2, 0), mat(0x9a8f7c), -6, y + 2, -1).rotation.set(.5, 1, 0);
    for (let i = 0; i < 22; i++) { const a = (r() - .5) * 2.2, h = r() * 11 + 1.5, rad = 6 * .8 * Math.sqrt(Math.max(.05, 1 - Math.pow((h - 5.5) / 8.7, 2)));
      ball(g, .28 + r() * .15, parseInt(BANDS[i % 5].slice(1), 16), Math.sin(a) * rad * 1.4, y + h, -2 + Math.cos(a) * rad + .55 + (h - 5.5) * .2); }
    const cl = new THREE.Group(); cl.position.set(.8, y + 5.2, 3.9); cl.rotation.set(-.25, 0, .15); g.add(cl); put(cl, new THREE.CapsuleGeometry(.4, 1, 3, 8), mat(0xe4572e), 0, 0, 0); ball(cl, .32, 0xf0c9a0, 0, 1.15, 0);
    for (const sd of [-1, 1]) { box(cl, .16, 1.1, .16, 0xf0c9a0, sd * .55, 1, -.1).rotation.z = -sd * .6; box(cl, .18, 1.1, .18, 0x16324f, sd * .35, -1.1, -.1).rotation.z = sd * .35; }
    box(g, 4.5, .5, 3, 0x3a86d4, .8, y + .25, 6); ball(g, .4, 0xffffff, -2.5, y + .4, 6.2);
    return 15;
  },

  crafts(g, y, isl) {   // 3D printing, woodworking and carpentry, drones, cooking
    const ticks = [], sub = (name, x, z, k, ry) => { const q = new THREE.Group(), fake = { R: isl.R }; q.position.set(x, y * (1 - k), z); q.scale.setScalar(k); q.rotation.y = ry; g.add(q); LANDMARKS[name](q, y, fake); if (fake.tick) ticks.push(fake.tick); };
    sub('printer', -7, -3, .62, .35); sub('workbench', 5.5, -3.5, .72, -.25);
    const dr = new THREE.Group(), rotors = []; g.add(dr); box(dr, .9, .28, .9, 0x22262b, 0, 0, 0); ball(dr, .2, 0x3a86d4, 0, -.25, .3);
    for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2, x = Math.cos(a) * 1.35, z = Math.sin(a) * 1.35; const arm = box(dr, 1.5, .08, .14, 0x22262b, x / 2, 0, z / 2); arm.rotation.y = -a;
      cyl(dr, .1, .1, .22, 6, 0xe4572e, x, .1, z); const ro = put(dr, new THREE.BoxGeometry(1.3, .03, .12), mat(0xd9dee3), x, .24, z); rotors.push(ro); }
    const bowl = put(g, new THREE.SphereGeometry(1.3, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(0x22262b), -1, y + 2.3, 5.2); for (let i = 0; i < 3; i++) cyl(g, .07, .07, 1.5, 4, 0x5f6a72, -1 + Math.cos(i * 2.1) * .8, y + .75, 5.2 + Math.sin(i * 2.1) * .8);
    cyl(g, 1.32, 1.32, .08, 12, 0x8d9aa3, -1, y + 2.32, 5.2); cyl(g, .6, .6, .55, 10, 0xc8d0d6, -1.2, y + 2.65, 5.1); box(g, .7, .25, .25, 0xd98a1f, -.3, y + 2.5, 5.6); box(g, .7, .25, .25, 0xd23a2a, -.5, y + 2.5, 4.6);
    const steam = [0, 1, 2].map(() => ball(g, .28, 0xffffff, -1.2, y + 3, 5.1)); box(g, 2.6, .18, 1.4, 0xc99a5b, 2.2, y + 1.6, 5.6); for (const x of [1.1, 3.3]) box(g, .16, 1.5, 1.2, 0x8a5a2b, x, y + .75, 5.6); box(g, .9, .06, .6, 0xf7f3ea, 2.1, y + 1.72, 5.6);
    isl.tick = (t, d) => { for (const f of ticks) f(t, d); dr.position.set(Math.sin(t * .5) * 4, y + 8 + Math.sin(t * 1.4) * .5, 1 + Math.cos(t * .37) * 2.5); dr.rotation.set(Math.cos(t * .37) * .12, t * .2, Math.cos(t * .5) * -.15);
      rotors.forEach((ro, i) => { ro.rotation.y = t * 38 + i; }); steam.forEach((sp, i) => { const u = (t * .45 + i / 3) % 1; sp.position.y = y + 3 + u * 2.4; sp.position.x = -1.2 + Math.sin(u * 5 + i) * .3; sp.scale.setScalar(.6 + u * 1.2); sp.visible = u < .92; }); };
    return 10.5;
  },

  library(g, y) {   // books and resources: a stack of giant books, an armchair and a reading lamp
    let yy = y; [[7, 1.3, 5, 0xc8102e, .1], [6.4, 1, 4.6, 0x2743d6, -.2], [6.8, 1.5, 4.8, 0x2f6b4f, .25], [5.6, .9, 4.2, 0xf2b84b, -.1], [6, 1.2, 4.4, 0x9b5de5, .3]].forEach(([w, h, d, c, ry]) => {
      const b = new THREE.Group(); b.position.set(-2, yy, -1.5); b.rotation.y = ry; g.add(b); box(b, w, h, d, c, 0, h / 2, 0); box(b, w - .3, h - .3, d - .2, 0xfaf3e3, .2, h / 2, .15); yy += h; });
    const up = new THREE.Group(); up.position.set(3.2, y, -2.2); up.rotation.set(0, -.5, -.22); g.add(up); box(up, 1.2, 6.2, 4.4, 0xe4572e, 0, 3.1, 0); box(up, .95, 5.9, 4.2, 0xfaf3e3, 0, 3.1, .15);
    const ch = new THREE.Group(); ch.position.set(3.4, y, 3.6); ch.rotation.y = -2.5; g.add(ch); box(ch, 2.6, .9, 2.4, 0x3a6ea5, 0, .75, 0); box(ch, 2.6, 2.2, .6, 0x3a6ea5, 0, 1.8, -.95); for (const x of [-1.15, 1.15]) box(ch, .45, 1.4, 2.2, 0x27476e, x, 1.2, .05);
    cyl(g, .08, .08, 4.6, 5, 0x22262b, 5.6, y + 2.3, 2); cyl(g, .7, .7, .12, 10, 0x22262b, 5.6, y + .06, 2); put(g, new THREE.ConeGeometry(1, 1.1, 10, 1, true), mat(0xffe28a, { emissive: 0xffc93c, emissiveIntensity: .9, side: THREE.DoubleSide }), 5.6, y + 4.7, 2);
    cyl(g, .45, .38, .7, 10, 0xffffff, .2, y + .35, 4.4); put(g, new THREE.TorusGeometry(.25, .06, 4, 10), mat(0xffffff), .72, y + .38, 4.4);
    return yy - y + 3.5;
  },

  terminal(g, y, isl) {   // "API me": a giant terminal showing a request and its response
    const lines = ['$ curl alex.api/v1', '{', '  "apps": ["product", "ads"],', '  "analysis": "business",', '  "immigration": "systems",', '  "status": 200', '}'];
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 320; const c = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const draw = (t) => { c.fillStyle = '#0b1220'; c.fillRect(0, 0, 512, 320); c.font = 'bold 27px "Courier New", monospace'; c.textBaseline = 'middle'; const n = Math.floor((t * 9) % 190), total = lines.join('\n').length; let left = Math.min(n, total);
      lines.forEach((ln, i) => { const show = ln.slice(0, Math.max(0, left)); left -= ln.length + 1; c.fillStyle = i === 0 ? '#7ee787' : ln.includes('200') ? '#f2b84b' : '#d7e3f4'; c.fillText(show, 22, 40 + i * 38); });
      if (Math.floor(t * 2) % 2) { c.fillStyle = '#7ee787'; c.fillRect(22, 296, 14, 4); } tex.needsUpdate = true; };
    draw(100); box(g, 11.6, 7.6, .6, 0x22262b, 0, y + 6, -1); put(g, new THREE.PlaneGeometry(10.8, 6.75), new THREE.MeshBasicMaterial({ map: tex }), 0, y + 6, -.68); box(g, 1.2, 2.4, .5, 0x22262b, 0, y + 1.2, -1.1); box(g, 5, .3, 2.6, 0x22262b, 0, y + .15, -.8);
    box(g, 7, .35, 2.4, 0x30363b, 0, y + .3, 3); for (let i = 0; i < 3; i++) for (let j = 0; j < 9; j++) box(g, .55, .15, .55, 0xd9dee3, -2.8 + j * .7, y + .55, 2.3 + i * .7);
    const plug = new THREE.Group(); plug.position.set(-7, y + 1.1, 2); plug.rotation.set(0, .6, Math.PI / 2); g.add(plug); cyl(plug, .9, .9, 1.8, 10, 0xf2b84b, 0, 0, 0); for (const x of [-.4, .4]) cyl(plug, .13, .13, 1.1, 6, 0xc8d0d6, x, 1.4, 0);
    put(g, new THREE.TorusGeometry(2.2, .22, 6, 20, 4.2), mat(0xf2b84b), -5.6, y + .25, -.6).rotation.x = Math.PI / 2; box(g, 1.6, 2.2, 1, 0xf7f3ea, 7, y + 1.1, 2); for (const x of [6.7, 7.3]) cyl(g, .14, .14, .2, 6, 0x15181b, x, y + 1.4, 2.52).rotation.x = Math.PI / 2;
    let last = -1; isl.tick = (t, d) => { if (d > 200 || t - last < .12) return; last = t; draw(t); };
    return 11;
  },

  palm(g, y, isl, r) { for (let i = 0; i < 5; i++) palm(g, (r() - .5) * 8, y - .3, (r() - .5) * 8, r); return 12; },
};
