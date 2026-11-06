import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Small three.js viewer: one or two meshes, Z-up, turntable controls, a print-bed outline for scale.
// Feature edges of a Manifold mesh: edges whose two faces meet at more than `angleDeg`, skipping faces
// thinner than `minAlt` (the stair-steps that approximate the fillets would otherwise draw as a dense band).
function featureEdges(mesh, angleDeg, minAlt) {
  const np = mesh.numProp, vp = mesh.vertProperties, tv = mesh.triVerts, nT = tv.length / 3;
  const P = (i) => [vp[i * np], vp[i * np + 1], vp[i * np + 2]];
  const normals = new Float32Array(nT * 3), thin = new Uint8Array(nT);
  for (let t = 0; t < nT; t++) {
    const a = P(tv[3 * t]), b = P(tv[3 * t + 1]), c = P(tv[3 * t + 2]);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const l = Math.hypot(...n) || 1;
    normals.set([n[0] / l, n[1] / l, n[2] / l], 3 * t);
    const e = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
    const longest = Math.max(e(a, b), e(b, c), e(c, a));
    thin[t] = l / longest < minAlt ? 1 : 0;  // altitude = 2*area / longest edge
  }
  const seen = new Map(), out = [];
  const cosT = Math.cos((angleDeg * Math.PI) / 180);
  for (let t = 0; t < nT; t++) {
    for (let k = 0; k < 3; k++) {
      const i = tv[3 * t + k], j = tv[3 * t + ((k + 1) % 3)];
      const key = i < j ? i * 4294967296 + j : j * 4294967296 + i;
      const other = seen.get(key);
      if (other === undefined) { seen.set(key, t); continue; }
      if (thin[t] || thin[other]) continue;
      const d = normals[3 * t] * normals[3 * other] + normals[3 * t + 1] * normals[3 * other + 1] + normals[3 * t + 2] * normals[3 * other + 2];
      if (d < cosT) out.push(...P(i), ...P(j));
    }
  }
  return new Float32Array(out);
}

export function createPreview(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 5000);
  camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 1.3));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(200, -300, 400);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-300, 200, 100);
  scene.add(fill);
  const bed = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(256, 256)),
    new THREE.LineBasicMaterial({ color: 0x8a8f98, transparent: true, opacity: 0.5 })
  );
  bed.position.set(128, 128, 0);
  scene.add(bed);
  const grid = new THREE.GridHelper(256, 8, 0xb0b5bd, 0xd5d8dd);
  grid.rotation.x = Math.PI / 2;
  grid.position.set(128, 128, -0.05);
  scene.add(grid);
  const group = new THREE.Group();
  scene.add(group);
  const material = new THREE.MeshStandardMaterial({ color: 0xe8e2d6, metalness: 0.05, roughness: 0.55 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x3a3f47, transparent: true, opacity: 0.35 });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }
  let alive = true;
  function frame() {
    if (!alive) return;
    resize();
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();

  function show(parts) {
    while (group.children.length) {
      const c = group.children.pop();
      c.traverse?.((o) => { o.geometry?.dispose(); });
    }
    let x = 0;
    const all = new THREE.Box3();
    for (const part of parts) {
      const mesh = part.print.getMesh();
      const np = mesh.numProp, vp = mesh.vertProperties;
      const pos = new Float32Array(mesh.triVerts.length * 3);
      for (let i = 0; i < mesh.triVerts.length; i++) {
        const v = mesh.triVerts[i] * np;
        pos[3 * i] = vp[v]; pos[3 * i + 1] = vp[v + 1]; pos[3 * i + 2] = vp[v + 2];
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      const bb = part.print.boundingBox();
      const obj = new THREE.Group();
      obj.add(new THREE.Mesh(geo, material));
      const lines = new THREE.BufferGeometry();
      lines.setAttribute('position', new THREE.BufferAttribute(featureEdges(mesh, 25, 0.12), 3));
      obj.add(new THREE.LineSegments(lines, edgeMat));
      obj.position.set(x - bb.min[0], -bb.min[1], -bb.min[2]);
      group.add(obj);
      x += bb.max[0] - bb.min[0] + 15;
      all.expandByObject(obj);
    }
    const size = new THREE.Vector3(), center = new THREE.Vector3();
    all.getSize(size); all.getCenter(center);
    const r = Math.max(size.x, size.y, size.z, 40);
    controls.target.copy(center);
    camera.position.set(center.x - r * 1.1, center.y - r * 1.6, center.z + r * 1.0);
    camera.near = r / 50; camera.far = r * 50; camera.updateProjectionMatrix();
    controls.update();
  }
  const api = { show, dispose() { alive = false; controls.dispose(); renderer.dispose(); }, camera, controls };
  try { window.__preview = api; } catch {}
  return api;
}
