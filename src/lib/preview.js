import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Small three.js viewer: one or two meshes, Z-up, turntable controls, a print-bed outline for scale.
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
      obj.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), edgeMat));
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
  return { show, dispose() { alive = false; controls.dispose(); renderer.dispose(); } };
}
