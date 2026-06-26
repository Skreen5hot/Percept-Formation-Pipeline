// Data-driven status badges (D1): the DAG component badges render FROM the audited status manifest
// (docs/data/status.json) -- the same artifact the Auditor gates -- so the page shows exactly what passed the
// gate (single source of truth). Client-side fetch, no serve-time build (NEED-6). The static badges in
// index.html are a pre-JS fallback kept in sync with the manifest; this overwrites them from the manifest.
const NB = { Built: ['Built', 'nb built'], NotYetBuilt: ['Not Yet Built', 'nb nybilt'] };
fetch('./data/status.json')
  .then((r) => r.json())
  .then((m) => {
    for (const c of (m.components || [])) {
      const node = document.getElementById('dag-' + String(c.name).toLowerCase());
      if (!node) continue;
      const span = node.querySelector('.nb');
      if (!span) continue;
      const [text, cls] = NB[c.status] || [String(c.status), 'nb nybilt'];
      span.textContent = text;
      span.className = cls;
    }
  })
  .catch(() => { /* keep the static fallback badges */ });
