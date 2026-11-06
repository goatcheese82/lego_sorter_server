// Lego Sorter geometry — a port of lego_sorter_gen.py (the Fusion generator) to the Manifold CSG engine.
// Units are mm. Parts are modelled in use orientation: x = width, y = depth (front at 0, back at DEPTH),
// z = up. Print orientation is applied on export. Fillets are not reproduced here.

import Module from 'manifold-3d';

export const PLA = 1.24; // g/cm3

export const DEFAULTS = {
  GRID: 75, GRID_Z: 50, DEPTH: 120, GAP: 0.4, WALL: 0.9, STRIP_W: 11, STRIP_T: 2.2,
  KEY_DEPTH: 2.0, KEY_MOUTH: 3.0, KEY_LEN: 50, KEY_CLR: 0.15, KEY_DETENT: 0.25,
  PINCH_IN: 3.0, BACK_PINCH_Z: 2.5, BACK_KEY_LEN: 40, KEY_SETBACK: 5,
  LOCK_DEPTH: 2.5, LOCK_MOUTH: 4.0, LOCK_CLR: 0.15, LOCK_HEAD_W: 12, LOCK_HEAD_H: 3,
  DRAWER_CLR: 0.45, DRAWER_TOP_CLR: 1.0, DRAWER_BACK_CLR: 0.6, DRAWER_FLOOR_CLR: 0.5, RUNNER_LIFT_CLR: 0.3,
  DRAWER_WALL: 0.9, DRAWER_FLOOR: 1.0, DRAWER_FRONT_T: 2.4,
  DOME_R: 24, DOME_DEPTH: 7, DOME_WALL: 1.2, TAB_W: 5,
  DETENT_H: 0.45, DETENT_LEN: 3, DETENT_Z: 8, SHELL_DETENT_Y: 20, DETENT_GAP: 0.3,
  NUB_LEN: 20, NUB_CLR: 0.3,
  HANGER_W: 30, HANGER_T: 6, HANGER_RIB_LEN: 80, HANGER_FOOT_D: 12, HANGER_FOOT_T: 5, HANGER_TOP_MARGIN: 5,
  LEDGER_LEN: 250, LEDGER_W: 34, LEDGER_T: 4, LEDGER_RIB_W: 6, LEDGER_RIB_H: 3, LEDGER_CLR: 0.15, LEDGER_HOLE_PITCH: 25,
  ALEX_W: 292, ALEX_D: 524, ALEX_COLS: 3, ALEX_ROWS: 10, SPACER_H: 25, SPACER_WALL: 1.2,
  FILLET_SHELL: 0.8, FILLET_DRAWER: 0.8,
};

// Parameter groups and one-line descriptions for the Advanced panel.
export const PARAM_GROUPS = [
  ['Grid', {
    GRID: 'module pitch across (width)', GRID_Z: 'module pitch up (height)', DEPTH: 'shell depth front to back',
    GAP: 'gap between adjacent modules', WALL: 'shell wall',
  }],
  ['Keys and strips', {
    STRIP_W: 'groove strip width', STRIP_T: 'strip intrusion inside the wall', KEY_DEPTH: 'groove depth', KEY_MOUTH: 'groove width at the face',
    KEY_LEN: 'layer key length', BACK_KEY_LEN: 'back key length', KEY_CLR: 'key clearance per side', KEY_DETENT: 'groove mouth pinch per side',
    PINCH_IN: 'pinch distance inside the back face', BACK_PINCH_Z: 'back groove pinch distance from each end', KEY_SETBACK: 'how far layer keys sit inside the back face',
  }],
  ['Lock strip', {
    LOCK_DEPTH: 'notch depth', LOCK_MOUTH: 'notch width at the face', LOCK_CLR: 'strip clearance per side', LOCK_HEAD_W: 'head width', LOCK_HEAD_H: 'head height',
  }],
  ['Drawer', {
    DRAWER_CLR: 'side clearance to the shell', DRAWER_TOP_CLR: 'clearance to the ceiling', DRAWER_BACK_CLR: 'clearance to the back strip',
    DRAWER_FLOOR_CLR: 'clearance above the floor strip', RUNNER_LIFT_CLR: 'clearance under the strip', DRAWER_WALL: 'drawer wall', DRAWER_FLOOR: 'drawer floor',
    DRAWER_FRONT_T: 'front plate', DOME_R: 'pull dome radius', DOME_DEPTH: 'pull dome depth', DOME_WALL: 'pull dome wall', TAB_W: 'pinch fin width',
    DETENT_H: 'detent bump height', DETENT_LEN: 'detent bump length', DETENT_Z: 'detent bump height along the strip', SHELL_DETENT_Y: 'shell bump from the front', DETENT_GAP: 'gap behind the shell bump when closed',
  }],
  ['Wall mount', {
    HANGER_W: 'hanger width', HANGER_T: 'hanger thickness', HANGER_RIB_LEN: 'hanger rib length (and the lift to hang)', HANGER_FOOT_D: 'foot depth', HANGER_FOOT_T: 'foot thickness', HANGER_TOP_MARGIN: 'hanger length above the block',
    LEDGER_LEN: 'ledger length', LEDGER_W: 'ledger width', LEDGER_T: 'ledger base thickness', LEDGER_RIB_W: 'ledger rib root width', LEDGER_RIB_H: 'ledger rib height', LEDGER_CLR: 'ledger clearance', LEDGER_HOLE_PITCH: 'screw hole pitch',
    NUB_LEN: 'spacer nub length', NUB_CLR: 'nub and rib clearance',
  }],
  ['Finish', {
    FILLET_SHELL: 'round on the shell outer edges (0 = sharp)', FILLET_DRAWER: 'round on the drawer front edges (0 = sharp)',
  }],
  ['IKEA Alex spacers', {
    ALEX_W: 'drawer inside width', ALEX_D: 'drawer inside depth', ALEX_COLS: 'modules across', ALEX_ROWS: 'modules along', SPACER_H: 'spacer height', SPACER_WALL: 'spacer wall',
  }],
];

let M = null;
export async function init() {
  if (M) return M;
  const mod = await Module();
  mod.setup();
  M = mod;
  return M;
}

const Mf = () => M.Manifold;

// ---- primitives ----
function box(x0, x1, y0, y1, z0, z1) {
  return Mf().cube([x1 - x0, y1 - y0, z1 - z0]).translate([x0, y0, z0]);
}
// keep the side of the plane through pt where (p - pt) . n <= 0
function clip(m, pt, n) {
  const len = Math.hypot(n[0], n[1], n[2]);
  const nn = [-n[0] / len, -n[1] / len, -n[2] / len];
  const off = pt[0] * nn[0] + pt[1] * nn[1] + pt[2] * nn[2];
  return m.trimByPlane(nn, off);
}
const add = (a, b) => a.add(b);
const cut = (a, b) => a.subtract(b);

// 45-degree dovetail prism: `mouth` wide at `face`, mouth + 2*depth wide at `depth` into the part along `dirn`.
// Built as the convex hull of its 8 corners so any axis assignment works.
function trapPrism(along, a0, a1, dax, face, dirn, wax, wc, mouth, depth) {
  const pts = [];
  for (const a of [a0, a1]) {
    for (const [vd, hw] of [[face, mouth / 2], [face + dirn * depth, mouth / 2 + depth]]) {
      for (const s of [-1, 1]) {
        const q = [0, 0, 0];
        q[along] = a; q[dax] = vd; q[wax] = wc + s * hw;
        pts.push(q);
      }
    }
  }
  return Mf().hull(pts);
}

// box with every edge and corner rounded by r: the convex hull of eight spheres
function roundedBox(x0, x1, y0, y1, z0, z1, r) {
  const s = [];
  for (const x of [x0 + r, x1 - r]) for (const y of [y0 + r, y1 - r]) for (const z of [z0 + r, z1 - r]) s.push(Mf().sphere(r, 16).translate([x, y, z]));
  return Mf().hull(s);
}
// rolling-ball inset at depth y below a face for a fillet of radius r on its perpendicular edges
const filletInset = (r, y) => r - Math.sqrt(Math.max(0, r * r - (r - y) * (r - y)));

function halfNub(p, along, a0, a1, dax, face, dirn, wax, wc, clr) {
  const c = clr ?? p.KEY_CLR;
  const m = p.KEY_MOUTH - 2 * c, d = p.KEY_DEPTH - c;
  let nb = trapPrism(along, a0, a1, dax, face, dirn, wax, wc, m, d);
  const pt = [0, 0, 0], n = [0, 0, 0];
  pt[along] = a1; pt[dax] = face; n[along] = 1; n[dax] = dirn;
  return clip(nb, pt, n);
}

function cylinderY(x, y0, y1, z, r0, r1) {
  // cylinder/cone along +y from y0 to y1
  const c = Mf().cylinder(y1 - y0, r0, r1 ?? r0, 48);
  return c.rotate([-90, 0, 0]).translate([x, y0, z]);
}

// ---- parts ----
export function buildShell(p, w, h) {
  const { GRID: G, GRID_Z: GZ, DEPTH: D, GAP, WALL, STRIP_W: SW, STRIP_T: ST } = p;
  const Wo = G * w - GAP, Ho = GZ * h - GAP;
  const xcs = [...Array(w)].map((_, i) => G * (i + 0.5) - GAP / 2);
  const zcs = [...Array(h)].map((_, j) => GZ * (j + 0.5) - GAP / 2);
  const fr = p.FILLET_SHELL;
  let body = fr > 0 ? roundedBox(0, Wo, 0, D, 0, Ho, Math.min(fr, WALL)) : box(0, Wo, 0, D, 0, Ho);
  body = cut(body, box(WALL, Wo - WALL, -1, D - WALL, WALL, Ho - WALL));
  // strips reach 0.1 mm into the wall, never to the outer face, so the rounded envelope stays untouched
  const e = WALL - 0.1;
  for (const xc of xcs) {
    body = add(body, box(xc - SW / 2, xc + SW / 2, 0, D - e, Ho - WALL - ST, Ho - e));
    body = add(body, box(xc - SW / 2, xc + SW / 2, 0, D - e, e, WALL + ST));
  }
  for (const zc of zcs) {
    body = add(body, box(e, WALL + ST, 0, D - e, zc - SW / 2, zc + SW / 2));
    body = add(body, box(Wo - WALL - ST, Wo - e, 0, D - e, zc - SW / 2, zc + SW / 2));
  }
  for (const xc of xcs) body = add(body, box(xc - SW / 2, xc + SW / 2, D - WALL - ST, D - e, e, Ho - e));
  const GL = p.KEY_LEN + 1 + p.KEY_SETBACK, KM = p.KEY_MOUTH, KD = p.KEY_DEPTH, det = p.KEY_DETENT;
  // grooves are cut in segments: full width, then a narrower segment (the pinch) 1.5 mm long
  const groove = (dax, face, dirn, wax, wc) => {
    if (det > 0) {
      const PI = p.PINCH_IN;
      body = cut(body, trapPrism(1, D - GL, D - PI - 1.5, dax, face, dirn, wax, wc, KM, KD));
      body = cut(body, trapPrism(1, D - PI, D + 1, dax, face, dirn, wax, wc, KM, KD));
      body = cut(body, trapPrism(1, D - PI - 1.6, D - PI + 0.1, dax, face, dirn, wax, wc, KM - 2 * det, KD));
    } else {
      body = cut(body, trapPrism(1, D - GL, D + 1, dax, face, dirn, wax, wc, KM, KD));
    }
  };
  for (const xc of xcs) { groove(2, Ho, -1, 0, xc); groove(2, 0, 1, 0, xc); }
  for (const zc of zcs) { groove(0, 0, 1, 2, zc); groove(0, Wo, -1, 2, zc); }
  const BP = p.BACK_PINCH_Z;
  for (const xc of xcs) {
    if (det > 0) {
      for (const [z0, z1] of [[-1, BP], [BP + 1.5, Ho - BP - 1.5], [Ho - BP, Ho + 1]]) body = cut(body, trapPrism(2, z0, z1, 1, D, -1, 0, xc, KM, KD));
      for (const [z0, z1] of [[BP - 0.1, BP + 1.6], [Ho - BP - 1.6, Ho - BP + 0.1]]) body = cut(body, trapPrism(2, z0, z1, 1, D, -1, 0, xc, KM - 2 * det, KD));
    } else {
      body = cut(body, trapPrism(2, -1, Ho + 1, 1, D, -1, 0, xc, KM, KD));
    }
  }
  const LM = p.LOCK_MOUTH, LD = p.LOCK_DEPTH;
  for (const xc of xcs) {
    body = cut(body, trapPrism(2, Ho - WALL - ST - 0.1, Ho + 0.1, 1, 0, 1, 0, xc, LM, LD));
    body = cut(body, trapPrism(2, -0.1, WALL + ST + 0.1, 1, 0, 1, 0, xc, LM, LD));
  }
  const { DETENT_H: DH, DETENT_LEN: DL, DETENT_Z: DZ, SHELL_DETENT_Y: Y0 } = p;
  for (const zc of zcs) {
    const X0 = WALL + ST;
    let b = box(X0 - 0.05, X0 + DH, Y0, Y0 + DL, zc - DZ / 2, zc + DZ / 2);
    b = clip(b, [X0, Y0, 0], [1, -1, 0]); b = clip(b, [X0, Y0 + DL, 0], [1, 1, 0]); body = add(body, b);
    const X1 = Wo - WALL - ST;
    b = box(X1 - DH, X1 + 0.05, Y0, Y0 + DL, zc - DZ / 2, zc + DZ / 2);
    b = clip(b, [X1, Y0, 0], [-1, -1, 0]); b = clip(b, [X1, Y0 + DL, 0], [-1, 1, 0]); body = add(body, b);
  }
  return { body, info: { Wo, Ho, xcs, zcs } };
}

export function drawerDims(p, w, h) {
  const { GRID: G, DEPTH: D, GAP, WALL, STRIP_T: ST } = p;
  const Wo = G * w - GAP, Ho = p.GRID_Z * h - GAP;
  const setback = p.LOCK_DEPTH + 0.3;
  const Wd = Wo - 2 * (WALL + ST + p.DRAWER_CLR);
  const Ld = D - WALL - ST - setback - p.DRAWER_BACK_CLR;
  const z0 = WALL + ST + p.DRAWER_FLOOR_CLR;
  const Hd = (Ho - WALL - p.DRAWER_TOP_CLR) - z0;
  return { Wd, Ld, Hd, setback, z0, Wo, Ho };
}

export function buildDrawer(p, w, h) {
  const { GRID: G, GAP, WALL, STRIP_T: ST, STRIP_W: SW } = p;
  const { Wd, Ld, Hd, setback, z0 } = drawerDims(p, w, h);
  const DW = p.DRAWER_WALL, FL = p.DRAWER_FLOOR, FT = p.DRAWER_FRONT_T, CLR = p.DRAWER_CLR;
  let body = box(0, Wd, 0, Ld, 0, Hd);
  body = cut(body, box(DW, Wd - DW, FT, Ld - DW, FL, Hd + 1));
  // side profile: full width with a flared recess where the shell strip runs
  const RC = CLR, RL = p.RUNNER_LIFT_CLR;
  const { DETENT_H: DH, DETENT_LEN: DL, DETENT_Z: DZ } = p;
  const Y0 = p.SHELL_DETENT_Y + DL + p.DETENT_GAP - setback;
  body = add(body, box(-ST, 0, 0, Ld, 0, Hd));
  body = add(body, box(Wd, Wd + ST, 0, Ld, 0, Hd));
  const rec = [];
  for (let j = 0; j < h; j++) {
    const zc = (p.GRID_Z * (j + 0.5) - GAP / 2) - z0;
    const zu = zc + SW / 2 - RC, zl = zc - SW / 2 - RL + RC;
    rec.push([zl, zu]);
    const wc = (zl + zu) / 2, mw = zu - zl;
    body = cut(body, trapPrism(1, -1, Ld + 1, 0, 0, -1, 2, wc, mw, ST));
    body = cut(body, trapPrism(1, -1, Ld + 1, 0, Wd, 1, 2, wc, mw, ST));
    let b = box(-DH, 0.05, Y0, Y0 + DL, zc - DZ / 2, zc + DZ / 2);
    b = clip(b, [0, Y0, 0], [-1, -1, 0]); b = clip(b, [0, Y0 + DL, 0], [-1, 1, 0]); body = add(body, b);
    b = box(Wd - 0.05, Wd + DH, Y0, Y0 + DL, zc - DZ / 2, zc + DZ / 2);
    b = clip(b, [Wd, Y0, 0], [1, -1, 0]); b = clip(b, [Wd, Y0 + DL, 0], [1, 1, 0]); body = add(body, b);
  }
  const off = DW * 1.4142;
  const bounds = [[null, rec[0][0]]];
  for (let j = 0; j < h - 1; j++) bounds.push([rec[j][1], rec[j + 1][0]]);
  bounds.push([rec[rec.length - 1][1], null]);
  for (const [lo, hi] of bounds) {
    const za = lo === null ? FL : lo, zb = hi === null ? Hd + 1 : hi;
    let pk = box(-ST + DW, DW + 0.01, FT, Ld - DW, za, zb);
    if (lo !== null) pk = clip(pk, [0, 0, lo + off], [-1, 0, -1]);
    if (hi !== null) pk = clip(pk, [0, 0, hi - off], [-1, 0, 1]);
    body = cut(body, pk);
    pk = box(Wd - DW - 0.01, Wd + ST - DW, FT, Ld - DW, za, zb);
    if (lo !== null) pk = clip(pk, [Wd, 0, lo + off], [1, 0, -1]);
    if (hi !== null) pk = clip(pk, [Wd, 0, hi - off], [1, 0, 1]);
    body = cut(body, pk);
  }
  // notches where the shell's top strips pass, 1 mm clear of them
  const nd = ST + 1.0 - p.DRAWER_TOP_CLR;
  for (let i = 0; i < w; i++) {
    const xc = (G * (i + 0.5) - GAP / 2) - (WALL + ST + CLR);
    body = cut(body, box(xc - (SW + 1.0) / 2, xc + (SW + 1.0) / 2, -1, Ld + 1, Hd - nd, Hd + 1));
  }
  // fillet the front perimeter: rebuild the front r mm as thin slices of the outline, each inset by the
  // rolling-ball profile (mitred at convex corners, rounded at concave ones)
  const r = Math.min(p.FILLET_DRAWER, DW);
  if (r > 0) {
    const N = 16;
    const outline = body.rotate([90, 0, 0]).slice(Math.min(FT, r) / 2);
    let stack = clip(body, [0, r, 0], [0, -1, 0]);
    for (let k = 0; k < N; k++) {
      const y0 = r * k / N, d = filletInset(r, y0);
      const sl = d > 1e-4 ? outline.offset(-d, 'Round', 2, 16) : outline;
      stack = add(stack, Mf().extrude(sl, r / N + 1e-3).rotate([-90, 0, 0]).translate([0, y0, 0]));
    }
    body = stack;
  }
  // dome pull with pinch fin
  const R = p.DOME_R, DD = p.DOME_DEPTH, DT = p.DOME_WALL, TW = p.TAB_W;
  const xp = Wd / 2, zp = Hd / 2, yc = -(R - DD);
  let cap = Mf().sphere(R + DT, 96).translate([xp, yc, zp]);
  cap = clip(cap, [0, 0, 0], [0, -1, 0]);
  body = add(body, cap);
  let fin = box(xp - TW / 2, xp + TW / 2, -R, R, zp - R, zp + R);
  if (r > 0) {
    // round the fin's two front edges by trimming the fin's profile
    for (const s of [-1, 1]) {
      const xe = xp + s * TW / 2, xi = xe - s * r;
      let sliver = box(Math.min(xe, xi), Math.max(xe, xi), -1, r, zp - R, zp + R);
      sliver = cut(sliver, Mf().cylinder(2 * R + 2, r, r, 32).translate([xi, r, zp - R - 1]));
      fin = cut(fin, sliver);
    }
  }
  let dish = Mf().sphere(R, 96).translate([xp, yc, zp]);
  dish = clip(dish, [0, -1, 0], [0, -1, 0]);
  dish = cut(dish, fin);
  body = cut(body, dish);
  if (r > 0) {
    // round the dish rim: remove the corner between the front face and the dish that a ball of radius r
    // resting on both (center at depth r, radius rc from the dish axis) does not reach
    const rc = Math.sqrt((R + r) ** 2 - (R - DD + r) ** 2);
    // the ring is a hair larger than the ball so it overlaps the sphere instead of touching it tangentially
    const ring = Mf().revolve(M.CrossSection.circle(r + 0.03, 24).translate([rc, r]), 96).rotate([-90, 0, 0]).translate([xp, 0, zp]);
    // (the cut's own sphere sits 0.02 mm inside the cavity so no two surfaces coincide exactly)
    let corner = Mf().cylinder(r + 1, rc, rc, 96).rotate([-90, 0, 0]).translate([xp, -1, zp]);
    corner = clip(corner, [0, r, 0], [0, 1, 0]);
    corner = cut(corner, Mf().sphere(R + 0.02, 96).translate([xp, yc, zp]));
    corner = cut(corner, ring);
    corner = cut(corner, box(xp - TW / 2, xp + TW / 2, -2, r + 1, zp - R, zp + R));
    body = cut(body, corner);
    const comps = body.decompose();
    if (comps.length > 1) body = comps.reduce((a, b) => (b.volume() > a.volume() ? b : a));
  }
  return { body, info: { Wd, Ld, Hd, setback, z0 } };
}

export function buildKey(p, KL) {
  KL = KL || p.KEY_LEN;
  const m = p.KEY_MOUTH - 2 * p.KEY_CLR, d = p.KEY_DEPTH - p.KEY_CLR, g = p.GAP / 2;
  let body = trapPrism(1, 0, KL, 2, g, 1, 0, 0, m, d);
  body = add(body, trapPrism(1, 0, KL, 2, -g, -1, 0, 0, m, d));
  body = add(body, box(-m / 2, m / 2, 0, KL, -g, g));
  const hw = m / 2 + d, hz = g + d, c = 0.5;
  for (const [ye, s] of [[0, -1], [KL, 1]]) {
    body = clip(body, [hw - c, ye, 0], [1, s, 0]); body = clip(body, [-(hw - c), ye, 0], [-1, s, 0]);
    body = clip(body, [0, ye, hz - c], [0, s, 1]); body = clip(body, [0, ye, -(hz - c)], [0, s, -1]);
  }
  return { body, info: { w: 2 * hw, t: 2 * hz, neck: m, len: KL } };
}

export function buildLock(p, layers) {
  const LL = p.GRID_Z * layers - p.GAP;
  const m = p.LOCK_MOUTH - 2 * p.LOCK_CLR, d = p.LOCK_DEPTH - p.LOCK_CLR;
  let body = trapPrism(2, 0, LL, 1, 0, 1, 0, 0, m, d);
  body = add(body, box(-p.LOCK_HEAD_W / 2, p.LOCK_HEAD_W / 2, 0, d, LL, LL + p.LOCK_HEAD_H));
  const hw = m / 2 + d;
  body = clip(body, [hw - 1, 0, 0], [1, 0, -1]); body = clip(body, [-(hw - 1), 0, 0], [-1, 0, -1]);
  body = clip(body, [0, d - 1, 0], [0, 1, -1]);
  return { body, info: { LL, w: 2 * hw, t: d } };
}

export function buildHanger(p, layers) {
  const GZ = p.GRID_Z, W = p.HANGER_W, T = p.HANGER_T, FD = p.HANGER_FOOT_D, FTk = p.HANGER_FOOT_T;
  const L = FTk + layers * GZ + p.HANGER_TOP_MARGIN;
  let body = box(-W / 2, W / 2, 0, T, 0, L);
  body = add(body, box(-W / 2, W / 2, -FD, 0, 0, FTk));
  const RL = p.HANGER_RIB_LEN, z0 = FTk + 2, z1 = FTk + layers * GZ - 2;
  body = add(body, halfNub(p, 2, z0, z0 + RL, 1, 0, -1, 0, 0, p.NUB_CLR));
  body = add(body, halfNub(p, 2, z1 - RL, z1, 1, 0, -1, 0, 0, p.NUB_CLR));
  for (const zc of [p.LEDGER_W / 2, L - p.LEDGER_W / 2]) {
    body = cut(body, trapPrism(0, -W / 2 - 1, W / 2 + 1, 1, T, -1, 2, zc, p.LEDGER_RIB_W + 2 * p.LEDGER_CLR, p.LEDGER_RIB_H + p.LEDGER_CLR));
  }
  return { body, info: { L, spacing: L - p.LEDGER_W, W, T } };
}

export function buildLedger(p) {
  const L = p.LEDGER_LEN, W = p.LEDGER_W, LT = p.LEDGER_T;
  let body = box(0, L, 0, LT, 0, W);
  body = add(body, trapPrism(0, 0, L, 1, LT, 1, 2, W / 2, p.LEDGER_RIB_W, p.LEDGER_RIB_H));
  const pitch = p.LEDGER_HOLE_PITCH, n = Math.floor(L / pitch), flat = (W - p.LEDGER_RIB_W - 2 * p.LEDGER_RIB_H) / 2;
  for (let k = 0; k < n; k++) {
    const x = pitch * (k + 0.5), z = k % 2 === 0 ? flat / 2 : W - flat / 2;
    body = cut(body, cylinderY(x, -1, LT + 1, z, 2.25));
    body = cut(body, cylinderY(x, LT - 2.5, LT + 0.5, z, 2.25, 5.25));
  }
  return { body, info: { L, W, T: LT + p.LEDGER_RIB_H } };
}

function buildSpacer(p, L, W, H, nubXs) {
  const wall = p.SPACER_WALL;
  let body = box(0, L, 0, W, 0, H);
  body = cut(body, box(wall, L - wall, wall, W - wall, -1, H - wall));
  for (const xc of nubXs) body = add(body, halfNub(p, 2, p.PINCH_IN + 2.0, p.PINCH_IN + 2.0 + p.NUB_LEN, 1, 0, -1, 0, xc, p.NUB_CLR));
  return { body, info: { L, W, H } };
}

// ---- print orientation: p' = origin + xa*px + ya*py + za*pz ----
const ORI = {
  shell: (p) => [[0, 0, p.DEPTH], [1, 0, 0], [0, 0, -1], [0, 1, 0]],
  key: () => [[0, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 0]],
  lock: (p, i) => [[0, 0, i.t], [1, 0, 0], [0, 0, -1], [0, 1, 0]],
  ledger: (p, i) => [[0, i.W, 0], [1, 0, 0], [0, 0, 1], [0, -1, 0]],
  spacer: (p, i) => [[0, i.W, i.H], [1, 0, 0], [0, -1, 0], [0, 0, -1]],
};
function oriented(m, ori) {
  if (!ori) return m;
  const [o, xa, ya, za] = ori;
  // column-major 4x4
  return m.transform([xa[0], xa[1], xa[2], 0, ya[0], ya[1], ya[2], 0, za[0], za[1], za[2], 0, o[0], o[1], o[2], 1]);
}

export const PART_KINDS = [
  { id: 'shell', label: 'Shell', cells: true },
  { id: 'drawer', label: 'Drawer', cells: true },
  { id: 'key', label: 'Key (layer joints)' },
  { id: 'key back', label: 'Key (back-to-back)' },
  { id: 'lock', label: 'Lock strip', layers: true },
  { id: 'hanger', label: 'Wall hanger', layers: true },
  { id: 'ledger', label: 'Wall ledger' },
  { id: 'spacers', label: 'IKEA Alex spacers' },
];

// Build one kind of part. Returns [{ name, body (use orientation), print (print orientation), info }].
export function build(p, kind, w = 1, h = 1, layers = 2) {
  const out = (name, r, oriKey) => ({ name, body: r.body, print: oriented(r.body, oriKey ? ORI[oriKey](p, r.info) : null), info: r.info });
  switch (kind) {
    case 'shell': return [out(`Shell ${w}x${h}`, buildShell(p, w, h), 'shell')];
    case 'drawer': return [out(`Drawer ${w}x${h}`, buildDrawer(p, w, h), null)];
    case 'key': return [out('Key', buildKey(p), 'key')];
    case 'key back': return [out('Key back', buildKey(p, p.BACK_KEY_LEN), 'key')];
    case 'lock': return [out(`Lock strip ${layers} layers`, buildLock(p, layers), 'lock')];
    case 'hanger': return [out(`Wall hanger ${layers} layers`, buildHanger(p, layers), null)];
    case 'ledger': return [out('Wall ledger', buildLedger(p), 'ledger')];
    case 'spacers': {
      const G = p.GRID, GAP = p.GAP, GZ = p.GRID_Z;
      const sw = (p.ALEX_W - p.ALEX_COLS * G) / 2 - 0.5, sl = p.ALEX_ROWS * GZ / 2;
      const side = buildSpacer(p, sl, sw, p.SPACER_H, [...Array(Math.floor(sl / GZ))].map((_, k) => GZ * (k + 0.5) - GAP / 2));
      const ew = (p.ALEX_D - p.ALEX_ROWS * GZ) / 2 - 0.5, el = p.ALEX_COLS * G + 1;
      const end = buildSpacer(p, el, ew, p.SPACER_H, [...Array(Math.floor(p.ALEX_COLS))].map((_, k) => G * (k + 0.5) - GAP / 2 + 0.5));
      return [out('Alex side spacer', side, 'spacer'), out('Alex end spacer', end, 'spacer')];
    }
  }
  throw new Error('unknown part ' + kind);
}

export function describe(p, kind, w = 1, h = 1, layers = 2) {
  const { GRID: G, GRID_Z: GZ, DEPTH: D, GAP, WALL } = p;
  const Wo = G * w - GAP, Ho = GZ * h - GAP;
  switch (kind) {
    case 'shell': return `Shell ${w}x${h}: ${Wo.toFixed(1)} wide × ${Ho.toFixed(1)} tall × ${D} deep mm`;
    case 'drawer': {
      const { Ld, Hd } = drawerDims(p, w, h);
      const iw = Wo - 2 * (WALL + p.DRAWER_CLR + p.DRAWER_WALL), il = Ld - p.DRAWER_FRONT_T - p.DRAWER_WALL, ih = Hd - p.DRAWER_FLOOR;
      return `Drawer ${w}x${h}: inside ${iw.toFixed(0)} × ${il.toFixed(0)} × ${ih.toFixed(0)} mm (${(iw * il * ih / 1e6).toFixed(2)} L)`;
    }
    case 'lock': return `Lock strip for ${layers} layers: ${(GZ * layers - GAP + p.LOCK_HEAD_H).toFixed(1)} mm long`;
    case 'hanger': {
      const L = p.HANGER_FOOT_T + layers * GZ + p.HANGER_TOP_MARGIN;
      return `Wall hanger for ${layers} layers: ${L} mm long, ledgers ${L - p.LEDGER_W} mm apart`;
    }
    case 'spacers': return `Alex spacers for a ${p.ALEX_COLS} × ${p.ALEX_ROWS} layout in a ${p.ALEX_W} × ${p.ALEX_D} mm drawer`;
    case 'key': return `Layer key, ${p.KEY_LEN} mm`;
    case 'key back': return `Back key, ${p.BACK_KEY_LEN} mm`;
    case 'ledger': return `Wall ledger, ${p.LEDGER_LEN} mm, ${Math.floor(p.LEDGER_LEN / p.LEDGER_HOLE_PITCH)} screw holes`;
  }
  return kind;
}

// Print-bed limits for the sanity line in the UI (Bambu P1S: 256 x 256 x 256).
export const BED = 256;

export function stats(part) {
  const vol = part.body.volume();
  const bb = part.print.boundingBox();
  return {
    volumeCm3: vol / 1000,
    massG: vol / 1000 * PLA,
    size: [bb.max[0] - bb.min[0], bb.max[1] - bb.min[1], bb.max[2] - bb.min[2]],
  };
}
