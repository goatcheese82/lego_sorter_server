import { init, build, stats, DEFAULTS } from '../src/lib/geometry.js';

// Fusion's numbers (v20 of lego_sorter_gen.py), cm3
const REF = {
  'Shell 1x1': 39.37, 'Shell 2x1': 63.94, 'Drawer 1x1': 26.98, 'Drawer 2x1': 46.07,
  'Key': 0.89, 'Key back': 0.71, 'Lock strip 2 layers': 1.50, 'Wall hanger 2 layers': 20.48,
  'Wall ledger': 39.51, 'Alex side spacer': 26.59, 'Alex end spacer': 16.95,
};
await init();
const p = { ...DEFAULTS, FILLET_SHELL: 0, FILLET_DRAWER: 0 };  // Fusion's reference volumes are pre-fillet
const jobs = [['shell', 1, 2], ['shell', 3, 2], ['drawer', 1, 2], ['drawer', 3, 2], ['lock', 1, 1, 4], ['hanger', 1, 1, 4], ['shell', 1, 1], ['shell', 2, 1], ['drawer', 1, 1], ['drawer', 2, 1], ['key'], ['key back'], ['lock', 1, 1, 2], ['hanger', 1, 1, 2], ['ledger'], ['spacers']];
let bad = 0;
for (const [kind, w = 1, h = 1, layers = 2] of jobs) {
  const t0 = Date.now();
  for (const part of build(p, kind, w, h, layers)) {
    const s = stats(part);
    const ref = REF[part.name];
    const dev = ref ? (s.volumeCm3 - ref) / ref * 100 : NaN;
    const ok = ref ? Math.abs(dev) < 0.6 : true;
    if (!ok) bad++;
    console.log(`${ok ? 'ok ' : 'BAD'} ${part.name.padEnd(22)} ${s.volumeCm3.toFixed(2)} cm3 (fusion ${ref}, ${dev.toFixed(2)}%)  print ${s.size.map(v => v.toFixed(1)).join(' x ')} mm  ${Date.now() - t0} ms  genus ${part.body.genus()} comps ${part.body.decompose().length}`);
    if (part.body.decompose().length !== 1) bad++;
  }
}
// filleted parts: one solid, no tunnels, and a hair lighter than sharp
for (const [kind, w, h] of [['shell', 1, 1], ['shell', 3, 2], ['drawer', 1, 1], ['drawer', 2, 1], ['drawer', 1, 2], ['drawer', 3, 2]]) {
  const t0 = Date.now();
  const f = build({ ...DEFAULTS }, kind, w, h)[0], u = build(p, kind, w, h)[0];
  const dv = (f.body.volume() - u.body.volume()) / u.body.volume() * 100;
  const ok = f.body.decompose().length === 1 && f.body.genus() === 0 && dv < 0 && dv > -1.0;
  if (!ok) bad++;
  console.log(`${ok ? 'ok ' : 'BAD'} ${(f.name + ' filleted').padEnd(22)} ${(f.body.volume()/1000).toFixed(2)} cm3 (${dv.toFixed(2)}% vs sharp)  genus ${f.body.genus()} comps ${f.body.decompose().length}  ${Date.now() - t0} ms`);
}
process.exit(bad ? 1 : 0);
