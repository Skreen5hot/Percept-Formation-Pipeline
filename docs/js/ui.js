import { run } from './runner.js';
import { SAMPLE_CSV } from './sample.js';

const ALL_IDS = ['snp', 'bibss', 'sas', 'dknp', 'fandaws', 'binder', 'oce'];
const GATE_IDS = new Set(['sas', 'dknp', 'binder', 'oce']);

function esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const TH = 'style="text-align:left;padding:.25rem .5rem;border-bottom:1px solid #30363d;color:#c9d1d9"';
const TD = 'style="padding:.2rem .5rem;border-bottom:1px solid #21262d;color:#8b949e"';
const TBL = 'style="width:100%;border-collapse:collapse;font-size:.8rem;margin-top:.35rem"';

function makeTable(heads, rows) {
  let h = `<table ${TBL}><thead><tr>${heads.map(c => `<th ${TH}>${c}</th>`).join('')}</tr></thead><tbody>`;
  h += rows.map(r => `<tr>${r.map(c => `<td ${TD}>${c}</td>`).join('')}</tr>`).join('');
  return h + '</tbody></table>';
}

function renderSnp(st) {
  const rows = st.displayRecords;
  if (!rows?.length) return '<p style="color:#4b5158">No records produced.</p>';
  const cols = Object.keys(rows[0]);
  return makeTable(cols.map(esc), rows.map(row => cols.map(c => esc(row[c])))) +
    `<p style="margin-top:.45rem;color:#8b949e">${rows.length} records after cleaning.</p>`;
}

function renderBibss(st) {
  const nodes = st.flatNodes;
  if (!nodes?.length) return '<p style="color:#4b5158">No schema nodes.</p>';
  const TYPES = ['null', 'boolean', 'integer', 'number', 'string'];
  const heads = ['Field', 'Primitive Type', 'Null %', 'Boolean %', 'Integer %', 'Number %', 'String %', 'Nullable'];
  const tableRows = nodes.map(n => {
    const dist = n.typeDistribution || {};
    const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
    return [esc(n.field), esc(n.primitiveType), ...TYPES.map(k => `${Math.round(100 * (dist[k] || 0) / total)}%`), n.nullable ? 'yes' : 'no'];
  });
  const edgeNote = st.edges?.length ? `${st.edges.length} edges` : 'None for flat input';
  return makeTable(heads, tableRows) +
    `<p style="font-size:.75rem;color:#6e7681;font-style:italic;margin-top:.5rem">Schema Edges: structural object&#8594;property edges; not semantic field relationships (${edgeNote}).</p>`;
}

function renderFandaws(st) {
  const bindings = st.bindings;
  if (!bindings?.length) return '<p style="color:#4b5158">No bindings.</p>';
  const resolved = bindings.filter(b => b.match === 'resolved').length;
  const tableRows = bindings.map(b => [
    esc(b.field), esc(b.value),
    b.conceptId ? `${esc(b.conceptId)} (${esc(b.code || '')})` : '--',
    esc(b.match)
  ]);
  return `<p style="margin-bottom:.4rem;color:#8b949e">${resolved} of ${bindings.length} bound</p>` +
    makeTable(['Field', 'Value', 'Bound Concept', 'Match'], tableRows);
}

function renderGate(id, st) {
  let h = st.gateReason ? `<p class="gate">${esc(st.gateReason)}</p>` : '';
  h += '<p class="gate">Data stops here &mdash; not yet built.</p>';
  if (id === 'oce') h += '<p style="font-size:.82rem;color:#4b5158;margin-top:.35rem">Constitutive law compiled from W2Fuel + ontology/RCR.</p>';
  return h;
}

function stopMarker(id, reason) {
  return `<div role="alert" style="margin-top:.5rem;padding:.4rem .75rem;background:#2d0f0f;border:1px solid #da3633;border-radius:4px;color:#f85149;font-size:.82rem">&#9632; STOP &mdash; ${esc(id.toUpperCase())}: ${esc(reason || 'Pipeline halted')}</div>`;
}

function setNode(id, extra) {
  const el = document.getElementById(`dag-${id}`);
  if (el) el.className = extra ? `dag-node ${extra}` : 'dag-node';
}

function setBadge(id, cls, text) {
  const el = document.getElementById(`badge-${id}`);
  if (!el) return;
  el.className = `badge ${cls}`;
  el.textContent = text;
}

function setBody(id, html) {
  const el = document.getElementById(`body-${id}`);
  if (el) el.innerHTML = html;
}

function showDagStop() {
  const el = document.getElementById('dag-stop');
  if (el) el.style.display = 'inline';
}

function resetState() {
  for (const id of ALL_IDS) {
    setNode(id, null);
    setBadge(id, 'idle', 'idle');
    setBody(id, GATE_IDS.has(id) ? '<p class="gate">Gate &mdash; not built.</p>' : '<p>Awaiting run.</p>');
  }
  const el = document.getElementById('dag-stop');
  if (el) el.style.display = 'none';
}

function stageContent(id, st) {
  if (id === 'snp') return renderSnp(st);
  if (id === 'bibss') return renderBibss(st);
  if (id === 'fandaws') return renderFandaws(st);
  return '';
}

function startRun(input) {
  resetState();
  let stopped = false;

  run(input, {
    onStageStart(id) {
      setNode(id, 'running');
      setBadge(id, 'running-b', 'Running...');
    },
    onStageDone(id, st) {
      if (stopped && id !== 'fandaws') return;

      if (st.status === 'done') {
        setNode(id, 'done');
        setBadge(id, 'done-b', 'Done');
        setBody(id, stageContent(id, st));
      } else if (st.status === 'stopped') {
        setNode(id, 'stopped');
        setBadge(id, 'stopped-b', 'Stopped');
        setBody(id, stageContent(id, st) + stopMarker(id, st.stopReason));
        showDagStop();
        stopped = true;
      } else if (st.status === 'gate') {
        setNode(id, null);
        setBadge(id, 'idle', 'Gate');
        setBody(id, renderGate(id, st));
      }

      if (id === 'fandaws' && st.status === 'done') {
        showDagStop();
        setBody('sas', '<p class="gate">Pipeline stops at SAS &mdash; not yet built.</p><p class="gate">Data stops here.</p>');
        setBadge('sas', 'idle', 'Gate');
      }
    }
  });
}

document.getElementById('tab-sample').addEventListener('click', () => {
  document.getElementById('tab-sample').classList.add('active');
  document.getElementById('tab-adhoc').classList.remove('active');
  document.getElementById('pane-sample').classList.add('active');
  document.getElementById('pane-adhoc').classList.remove('active');
});

document.getElementById('tab-adhoc').addEventListener('click', () => {
  document.getElementById('tab-adhoc').classList.add('active');
  document.getElementById('tab-sample').classList.remove('active');
  document.getElementById('pane-adhoc').classList.add('active');
  document.getElementById('pane-sample').classList.remove('active');
});

document.getElementById('btn-sample').addEventListener('click', () => startRun(SAMPLE_CSV));
document.getElementById('btn-run').addEventListener('click', () => startRun(document.getElementById('adhoc-text').value));
