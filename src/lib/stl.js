// Binary STL from a Manifold mesh (positions are the first three properties of each vertex).
export function toBinarySTL(manifold, name = 'part') {
  const mesh = manifold.getMesh();
  const np = mesh.numProp, vp = mesh.vertProperties, tv = mesh.triVerts;
  const nTri = tv.length / 3;
  const buf = new ArrayBuffer(84 + nTri * 50);
  const dv = new DataView(buf);
  const header = new TextEncoder().encode(('Lego Sorter ' + name).slice(0, 80));
  new Uint8Array(buf, 0, 80).set(header);
  dv.setUint32(80, nTri, true);
  let o = 84;
  for (let t = 0; t < nTri; t++) {
    const a = tv[3 * t] * np, b = tv[3 * t + 1] * np, c = tv[3 * t + 2] * np;
    const ax = vp[a], ay = vp[a + 1], az = vp[a + 2];
    const bx = vp[b], by = vp[b + 1], bz = vp[b + 2];
    const cx = vp[c], cy = vp[c + 1], cz = vp[c + 2];
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    dv.setFloat32(o, nx / l, true); dv.setFloat32(o + 4, ny / l, true); dv.setFloat32(o + 8, nz / l, true);
    dv.setFloat32(o + 12, ax, true); dv.setFloat32(o + 16, ay, true); dv.setFloat32(o + 20, az, true);
    dv.setFloat32(o + 24, bx, true); dv.setFloat32(o + 28, by, true); dv.setFloat32(o + 32, bz, true);
    dv.setFloat32(o + 36, cx, true); dv.setFloat32(o + 40, cy, true); dv.setFloat32(o + 44, cz, true);
    dv.setUint16(o + 48, 0, true);
    o += 50;
  }
  return buf;
}

export function download(buf, filename) {
  const blob = new Blob([buf], { type: 'model/stl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Hand files to the viewer. Inside the claude.ai artifact viewer the page may only save through its
// `downloads` capability (zip is allowed, stl is not), so the STLs go into one zip there; anywhere
// else they save as plain STL files.
import { makeZip } from './zip.js';

let downloadsNs;
async function hosted() {
  if (downloadsNs !== undefined) return downloadsNs;
  try { downloadsNs = window.claude?.use ? await window.claude.use('downloads') : null; } catch { downloadsNs = null; }
  return downloadsNs;
}

export async function deliver(files, zipName) {
  // files: [{ name, buf }]
  const ns = await hosted();
  if (ns) {
    const zip = makeZip(files.map((f) => ({ name: f.name, data: f.buf })));
    try {
      await ns.save({ filename: zipName, data: zip });
      return 'zip';
    } catch (e) {
      if (e?.code === 'declined') return 'declined';
      throw e;
    }
  }
  for (const f of files) download(f.buf, f.name);
  return 'stl';
}
