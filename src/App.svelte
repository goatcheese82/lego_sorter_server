<script>
  import { onMount } from 'svelte';
  import { init, build, describe, stats, DEFAULTS, PARAM_GROUPS, PART_KINDS, BED } from './lib/geometry.js';
  import { toBinarySTL, deliver } from './lib/stl.js';
  import { createPreview } from './lib/preview.js';

  const SAVED = 'lego-sorter-params-v1';
  let params = $state(load());
  let kind = $state('shell');
  let w = $state(1);
  let h = $state(1);
  let layers = $state(2);
  let ready = $state(false);
  let busy = $state(false);
  let error = $state('');
  let parts = $state([]);
  let results = $state([]);
  let showAdvanced = $state(false);
  let canvas;
  let preview;
  let stale = $state(true);

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVED) || 'null');
      if (s && typeof s === 'object') return { ...DEFAULTS, ...s };
    } catch {}
    return { ...DEFAULTS };
  }
  function save() { try { localStorage.setItem(SAVED, JSON.stringify(params)); } catch {} }
  function reset() { params = { ...DEFAULTS }; save(); stale = true; }

  const kindInfo = $derived(PART_KINDS.find((k) => k.id === kind));
  const summary = $derived(describe(params, kind, w, h, layers));
  const maxW = $derived(Math.max(1, Math.floor((BED + params.GAP) / params.GRID)));
  const maxH = $derived(Math.max(1, Math.floor((BED + params.GAP) / params.GRID_Z)));
  const maxLayers = $derived(Math.max(1, Math.floor((BED - params.HANGER_FOOT_T - params.HANGER_TOP_MARGIN) / params.GRID_Z)));

  onMount(async () => {
    preview = createPreview(canvas);
    await init();
    ready = true;
    generate();
    return () => preview.dispose();
  });

  function generate() {
    if (!ready) return;
    busy = true; error = '';
    setTimeout(() => {
      try {
        const t0 = performance.now();
        parts = build(params, kind, Math.min(w, maxW), Math.min(h, maxH), Math.min(layers, maxLayers));
        results = parts.map((p) => ({ name: p.name, ...stats(p) }));
        preview.show(parts);
        stale = false;
        console.log('built in', (performance.now() - t0).toFixed(0), 'ms');
      } catch (e) {
        error = String(e?.message || e);
        console.error(e);
      }
      busy = false;
    }, 10);
  }

  let note = $state('');
  async function downloadAll() {
    note = '';
    try {
      const files = parts.map((p) => ({ name: p.name + '.stl', buf: toBinarySTL(p.print, p.name) }));
      const zipName = (parts.length === 1 ? parts[0].name : kindInfo.label) + '.zip';
      const how = await deliver(files, zipName);
      if (how === 'zip') note = `Saved ${zipName} with the STL${files.length > 1 ? 's' : ''} inside.`;
      else if (how === 'declined') note = '';
    } catch (e) {
      error = 'Could not save the file: ' + (e?.message || e);
    }
  }

  function fmt(n, d = 1) { return Number(n).toFixed(d); }
  function onParam(key, value) {
    const v = Number(value);
    if (Number.isFinite(v)) { params[key] = v; save(); stale = true; }
  }
  function touch() { stale = true; }
</script>

<div class="app">
  <aside class="panel">
    <header>
      <h1>Lego Sorter</h1>
      <p class="sub">Modular drawer system on a 75 × 50 mm grid, joined with dovetail keys. Pick a part, set its size, download the STL.</p>
    </header>

    <section>
      <label class="field">
        <span>Part</span>
        <select bind:value={kind} onchange={touch}>
          {#each PART_KINDS as k}<option value={k.id}>{k.label}</option>{/each}
        </select>
      </label>

      {#if kindInfo?.cells}
        <div class="row">
          <label class="field">
            <span>Width (cells)</span>
            <input type="number" min="1" max={maxW} bind:value={w} oninput={touch} />
          </label>
          <label class="field">
            <span>Height (cells)</span>
            <input type="number" min="1" max={maxH} bind:value={h} oninput={touch} />
          </label>
        </div>
        <p class="hint">Up to {maxW} cells wide and {maxH} tall fit a 256 mm print bed.</p>
      {/if}
      {#if kindInfo?.layers}
        <label class="field">
          <span>Layers (modules tall)</span>
          <input type="number" min="1" max={maxLayers} bind:value={layers} oninput={touch} />
        </label>
      {/if}

      <p class="summary">{summary}</p>

      <div class="actions">
        <button class="primary" onclick={generate} disabled={!ready || busy}>
          {busy ? 'Building…' : stale ? 'Generate' : 'Regenerate'}
        </button>
        <button onclick={downloadAll} disabled={!parts.length || stale || busy || kind === 'module'}>
          Download STL{parts.length > 1 ? 's' : ''}
        </button>
      </div>
      {#if error}<p class="error">{error}</p>{/if}
      {#if note}<p class="hint">{note}</p>{/if}

      {#if results.length && !stale}
        <table class="results">
          <tbody>
            {#each results as r}
              <tr>
                <td>{r.name}</td>
                <td>{fmt(r.massG, 1)} g</td>
                <td>{r.size.map((v) => fmt(v, 1)).join(' × ')} mm</td>
              </tr>
            {/each}
          </tbody>
        </table>
        <p class="hint">Mass is solid-modelled PLA; print orientation as shown. No supports on any part. Finish: shell edges rounded {params.FILLET_SHELL} mm, drawer face edges {params.FILLET_DRAWER} mm, face corners {params.FACE_CORNER} mm (0 = square, under Finish / Face and seat).</p>
      {/if}
    </section>

    <section class="advanced">
      <button class="link" onclick={() => (showAdvanced = !showAdvanced)}>
        {showAdvanced ? '▾' : '▸'} Advanced parameters
      </button>
      {#if showAdvanced}
        <p class="hint">Every dimension in the system, in mm. Parts made with the same grid, strip and key settings fit each other; change those and everything you print afterwards is a new family. Values are remembered in this browser.</p>
        {#each PARAM_GROUPS as [group, keys]}
          <details open={group === 'Grid'}>
            <summary>{group}</summary>
            <div class="grid">
              {#each Object.entries(keys) as [key, desc]}
                <label class="param" title={desc}>
                  <span class="k">{key}</span>
                  <input type="number" step="any" value={params[key]} onchange={(e) => onParam(key, e.currentTarget.value)} />
                  <span class="d">{desc}</span>
                </label>
              {/each}
            </div>
          </details>
        {/each}
        <button class="link" onclick={reset}>Reset all to defaults</button>
      {/if}
    </section>

    <footer>
      <details>
        <summary>How the system goes together</summary>
        <ul>
          <li><b>Shells</b> print on their back; <b>drawers</b> upright; <b>keys</b> standing; lock pins, ledger and spacers flat; the <b>hanger</b> on its foot. 0.2 mm layers, 2 walls (3 for drawers), no infill needed for shells and drawers; keys and lock pins at 100%.</li>
          <li>Stand shells on the grid, fronts flush. From the back, push a <b>Key</b> into each pair of facing grooves and 5 mm past the face; it clicks past the pinch. Any order works.</li>
          <li>Drawers slide in from the front, hanging on the shell's side strips, click shut on the last 3 mm and seat their face into the shell's front lip.</li>
          <li>To move: drop a <b>lock pin</b> down each column through the hole at the front-left of the top shell; it passes through every shell and drawer below and pins them all. Two blocks back to back: a <b>back key</b> dropped into each module's back channel.</li>
          <li>Wall: screw two <b>ledgers</b> into studs, slide a <b>hanger</b> onto them at each column, lift the block 80 mm and lower it onto the hanger ribs.</li>
        </ul>
      </details>
    </footer>
  </aside>

  <main class="view">
    <canvas bind:this={canvas}></canvas>
    {#if !ready}<div class="overlay">Loading the geometry engine…</div>{/if}
    <div class="legend">Drag to orbit · scroll to zoom · 256 mm bed shown for scale</div>
  </main>
</div>

<style>
  :global(html, body) { margin: 0; height: 100%; }
  :global(body) { font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1f2328; background: #f4f2ee; }
  :global(*) { box-sizing: border-box; }
  .app { display: grid; grid-template-columns: 380px 1fr; height: 100%; min-height: 100vh; }
  @media (max-width: 820px) { .app { grid-template-columns: 1fr; grid-template-rows: auto 55vh; } .panel { order: 2; } .view { order: 1; } }
  .panel { overflow: auto; padding: 22px 22px 32px; background: #fbfaf8; border-right: 1px solid #e3dfd8; display: flex; flex-direction: column; gap: 20px; }
  h1 { margin: 0 0 4px; font-size: 22px; letter-spacing: -0.01em; }
  .sub { margin: 0; color: #5a5f66; }
  section { display: flex; flex-direction: column; gap: 10px; }
  .field { display: flex; flex-direction: column; gap: 4px; flex: 1; }
  .field span { font-size: 12px; color: #5a5f66; }
  .row { display: flex; gap: 10px; }
  select, input[type=number] { font: inherit; padding: 7px 9px; border: 1px solid #cfcac1; border-radius: 6px; background: #fff; width: 100%; }
  .summary { margin: 4px 0 0; padding: 10px 12px; background: #efe9df; border-radius: 6px; font-weight: 500; }
  .actions { display: flex; gap: 8px; }
  button { font: inherit; padding: 9px 14px; border-radius: 6px; border: 1px solid #cfcac1; background: #fff; cursor: pointer; }
  button:hover:not(:disabled) { border-color: #9a948a; }
  button:disabled { opacity: 0.5; cursor: default; }
  button.primary { background: #2a6f5f; border-color: #2a6f5f; color: #fff; }
  button.primary:hover:not(:disabled) { background: #22594c; }
  button.link { border: none; background: none; padding: 4px 0; color: #2a6f5f; text-align: left; }
  .hint { margin: 0; font-size: 12px; color: #6b7078; }
  .error { color: #a3312b; }
  .results { width: 100%; border-collapse: collapse; font-size: 13px; }
  .results td { padding: 5px 4px; border-top: 1px solid #ebe7e0; }
  .results td:first-child { font-weight: 500; }
  details summary { cursor: pointer; font-weight: 500; padding: 6px 0; }
  .grid { display: flex; flex-direction: column; gap: 4px; padding: 4px 0 8px; }
  .param { display: grid; grid-template-columns: 130px 80px 1fr; gap: 8px; align-items: center; font-size: 12px; }
  .param .k { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; }
  .param .d { color: #6b7078; }
  .param input { padding: 4px 6px; }
  footer ul { margin: 6px 0 0; padding-left: 18px; color: #3b4047; font-size: 13px; }
  footer li { margin-bottom: 6px; }
  .view { position: relative; }
  canvas { width: 100%; height: 100%; display: block; }
  .overlay { position: absolute; inset: 0; display: grid; place-items: center; color: #5a5f66; background: rgba(244,242,238,0.6); }
  .legend { position: absolute; left: 14px; bottom: 10px; font-size: 12px; color: #6b7078; }
</style>
