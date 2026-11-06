import { init, build, stats, drawerDims, DEFAULTS } from '../src/lib/geometry.js';

// Parts unchanged since the Fusion generator (v20 of lego_sorter_gen.py) are checked against its volumes, cm3.
// Shells, drawers and the lock strip moved on (v22–v25: face, sill, recess); they are checked for consistency
// instead: one solid, no tunnels, sensible volume, and the drawer fitting its shell through the whole travel.
const REF = {
  'Key': 0.89, 'Key back': 0.71, 'Wall hanger 2 layers': 20.48,
  'Wall ledger': 39.51, 'Alex side spacer': 26.59, 'Alex end spacer': 16.95,
};
// expected volumes of the current shells and drawers (regression guard, ±1.5%)
const EXPECT = { 'Shell 1x1': 39.3, 'Shell 2x1': 64.0, 'Drawer 1x1': 27.7, 'Drawer 2x1': 47.0, 'Lock strip 2 layers': 1.5, 'Lock strip pair 2 layers': 3.0 };
await init();
const jobs = [['shell', 1, 2], ['shell', 3, 2], ['drawer', 1, 2], ['drawer', 3, 2], ['lock', 1, 1, 4], ['hanger', 1, 1, 4], ['shell', 1, 1], ['shell', 2, 1], ['drawer', 1, 1], ['drawer', 2, 1], ['key'], ['key back'], ['lock', 1, 1, 2], ['lock pair', 1, 1, 2], ['hanger', 1, 1, 2], ['ledger'], ['spacers']];
let bad = 0;
for (const [kind, w = 1, h = 1, layers = 2] of jobs) {
  const t0 = Date.now();
  for (const part of build(DEFAULTS, kind, w, h, layers)) {
    const s = stats(part);
    const ref = REF[part.name] ?? EXPECT[part.name];
    const tol = REF[part.name] ? 0.6 : 1.5;
    const dev = ref ? (s.volumeCm3 - ref) / ref * 100 : NaN;
    const comps = part.body.decompose().length, genus = part.body.genus();
    const expectGenus = kind === 'ledger' ? 10 : 0;
    const ok = (ref ? Math.abs(dev) < tol : true) && comps === 1 && genus === expectGenus;
    if (!ok) bad++;
    console.log(`${ok ? 'ok ' : 'BAD'} ${part.name.padEnd(22)} ${s.volumeCm3.toFixed(2)} cm3${ref ? ` (${REF[part.name] ? 'fusion' : 'expected'} ${ref}, ${dev.toFixed(2)}%)` : ''}  print ${s.size.map(v => v.toFixed(1)).join(' x ')} mm  ${Date.now() - t0} ms  genus ${genus} comps ${comps}`);
  }
}
// the fillets take a little off, never add, and never break the solid
for (const [kind, w, h] of [['shell', 1, 1], ['shell', 3, 2], ['drawer', 1, 1], ['drawer', 2, 1], ['drawer', 1, 2], ['drawer', 3, 2]]) {
  const t0 = Date.now();
  const f = build({ ...DEFAULTS }, kind, w, h)[0], u = build({ ...DEFAULTS, FILLET_SHELL: 0, FILLET_DRAWER: 0 }, kind, w, h)[0];
  const dv = (f.body.volume() - u.body.volume()) / u.body.volume() * 100;
  const ok = f.body.decompose().length === 1 && f.body.genus() === 0 && dv < 0 && dv > -1.0;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'BAD'} ${(f.name + ' filleted').padEnd(22)} ${(f.body.volume()/1000).toFixed(2)} cm3 (${dv.toFixed(2)}% vs sharp)  genus ${f.body.genus()} comps ${f.body.decompose().length}  ${Date.now() - t0} ms`);
}
// fit: the drawer swept through its shell overlaps nothing but the detent click; seated, it overlaps nothing;
// the lock strip sits in the notches in front of the face with no overlap, and blocks the drawer when pulled;
// two shells face to face take the pair strip with no overlap
for (const [w, h] of [[1, 1], [2, 1], [1, 2]]) {
  const t0 = Date.now();
  const p = DEFAULTS;
  const sh = build(p, 'shell', w, h)[0], dr = build(p, 'drawer', w, h)[0];
  const strip = build(p, 'lock', 1, 1, h)[0].body.translate([sh.info.xcs[0], 0, 0]);
  const pairStrip = build(p, 'lock pair', 1, 1, h)[0].body.translate([sh.info.xcs[0], 0, 0]);
  const mirror = sh.body.scale([1, -1, 1]);  // a second shell face to face, rims touching
  const { setback, z0 } = dr.info;
  const place = (dy) => dr.body.translate([p.WALL + p.STRIP_T + p.DRAWER_CLR, setback + dy, z0]);
  let worst = 0, seated = sh.body.intersect(place(0.2)).volume();
  for (let dy = -90; dy <= 0; dy += 0.5) {
    const v = sh.body.intersect(place(dy)).volume();
    if (dy < -6 && v > worst) worst = v;  // beyond the detent's 3 mm ramp nothing may touch
  }
  const stripV = sh.body.add(place(0)).intersect(strip).volume();
  const blocks = place(-3).intersect(strip).volume();  // pulled 3 mm the face runs into the strip
  const pairV = sh.body.add(mirror).intersect(pairStrip).volume();
  const ok = seated < 1e-3 && worst < 1e-3 && stripV < 1e-3 && blocks > 10 && pairV < 1e-3;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'BAD'} ${('fit ' + w + 'x' + h).padEnd(22)} seated ${seated.toFixed(3)}, sliding ${worst.toFixed(3)}, strip ${stripV.toFixed(3)}, pair ${pairV.toFixed(3)} mm3; strip blocks ${blocks.toFixed(0)} mm3  ${Date.now() - t0} ms`);
}
process.exit(bad ? 1 : 0);
