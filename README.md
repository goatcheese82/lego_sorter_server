# Lego Sorter — part generator

A standalone web app that generates print-ready STL files for every part of the Lego Sorter modular
drawer system: shells, drawers, keys, lock strips, wall hangers, the wall ledger and IKEA Alex spacers,
in any size on the grid. Everything is computed in the browser; nothing is uploaded anywhere.

The geometry is a line-for-line port of the Fusion 360 generator (`lego_sorter_gen.py`) to the
[Manifold](https://github.com/elalish/manifold) CSG engine, verified to match Fusion's volumes to
within 0.7% on every part, and builds its rounds by construction: a rounded envelope for the shell
(`FILLET_SHELL`, 0.8), a bullnose on the shell's front rim (`RIM_ROUND`, 0.45 — half the wall), rolling-ball
slices for the drawer front's perimeter (`FILLET_DRAWER`, 1.6 — up to the front plate thickness), an exact
torus cut at the dome rim. All three are in Advanced → Finish; 0 turns one off. The "Module" part shows a
shell with its drawer in, for judging the face — it isn't downloadable.

## Use it

Open the hosted page, or run it yourself:

    npm install
    npm run dev        # local dev server
    npm run build      # static site in dist/ — host it anywhere, or open dist/index.html via any web server
    npm test           # rebuilds every part in Node and checks volumes against the Fusion reference

Pick a part, set its cells (width × height) or layers, click Generate, then Download. Advanced
parameters expose every dimension in the system (in mm) and are remembered in the browser. Parts
made with the same grid, strip and key settings fit each other.

## Print settings (0.4 mm nozzle, PLA)

- Shells: 0.2 mm layers, 2 walls, 0% infill, no brim. Printed on their back as exported.
- Drawers: 0.2 mm, 3 walls, 5 bottom layers, 0% infill. Upright.
- Keys: 0.12–0.16 mm, 100% infill, brim. Standing on end. PETG if you have it.
- Lock strips, ledger, spacers: flat as exported. Hanger: standing on its foot. PETG for the wall parts.
- No supports on any part.

## Layout

- `src/lib/geometry.js` — all part builders, parameters and descriptions
- `src/lib/stl.js`, `src/lib/zip.js` — binary STL writer, zip bundler
- `src/lib/preview.js` — three.js viewer
- `src/App.svelte` — the UI
- `test/volumes.mjs` — the volume regression against Fusion

MIT.
