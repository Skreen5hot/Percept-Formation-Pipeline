import { run } from './runner.js';
import { SAMPLE_CSV } from './sample.js';

const $ = (id) => document.getElementById(id);
const BUILT = ['snp', 'bibss', 'fandaws'];
const ALL = ['snp', 'bibss', 'sas', 'binder', 'oce', 'dknp', 'fandaws'];
const TYPES = ['null', 'boolean', 'integer', 'number', 'string'];
const EMDASH = String.fromCharCode(0x2014);  // em-dash, ASCII-safe source -> no mojibake

function setBadge(id, text, cls) {
  const b = $('badge-' + id);
  if (b) { b.textContent = text; b.className = 'badge ' + cls; }
}
function dagClass(id, cls) {
  const n = $('dag-' + id);
  if (n) { n.classList.remove('running', 'done', 'stopped'); if (cls) n.classList.add(cls); }
}
function table(headers, rows) {
  const t = document.createElement('table');
  const thead = document.createElement('thead'), htr = document.createElement('tr');
  headers.forEach((h) => { const th = document.createElement('th'); th.textContent = h; htr.appendChild(th); });
  thead.appendChild(htr); t.appendChild(thead);
  const tb = document.createElement('tbody');
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    r.forEach((c) => { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); });
    tb.appendChild(tr);
  });
  t.appendChild(tb); return t;
}
function note(text, cls) { const p = document.createElement('p'); p.textContent = text; if (cls) p.className = cls; return p; }

function clearState() {
  ALL.forEach((id) => dagClass(id, null));
  BUILT.forEach((id) => { const b = $('body-' + id); if (b) b.innerHTML = ''; setBadge(id, 'idle', 'idle'); });
  const stop = $('dag-stop'); if (stop) stop.style.display = 'none';
}

const callbacks = {
  onStageStart(id) {
    if (BUILT.includes(id)) { dagClass(id, 'running'); setBadge(id, 'Running...', 'running-b'); }
  },
  onStageDone(id, st) {
    const body = $('body-' + id);
    if (!body) return;
    if ((id === 'snp' || id === 'bibss') && st.status === 'stopped') {
      dagClass(id, 'stopped'); setBadge(id, 'Stopped', 'stopped-b');
      body.innerHTML = ''; body.appendChild(note(st.stopReason || (id + ' stopped'), 'stopmark'));
      const stop = $('dag-stop'); if (stop) stop.style.display = 'inline';
      return;
    }
    if (id === 'snp') {
      dagClass('snp', 'done'); setBadge('snp', 'Done', 'done-b');
      const rows = st.displayRecords || [], cols = rows.length ? Object.keys(rows[0]) : [];
      body.innerHTML = '';
      body.appendChild(table(cols, rows.map((r) => cols.map((c) => String(r[c] ?? '')))));
      body.appendChild(note(rows.length + ' records after cleaning.'));
    } else if (id === 'bibss') {
      dagClass('bibss', 'done'); setBadge('bibss', 'Done', 'done-b');
      const nodes = st.flatNodes || [];
      const rows = nodes.map((n) => {
        const td = n.typeDistribution || {}, total = TYPES.reduce((s, k) => s + (td[k] || 0), 0) || 1;
        return [n.field, n.primitiveType, ...TYPES.map((k) => Math.round(100 * (td[k] || 0) / total) + '%'), n.nullable ? 'yes' : 'no'];
      });
      body.innerHTML = '';
      body.appendChild(table(['Field', 'Primitive Type', 'Null %', 'Boolean %', 'Integer %', 'Number %', 'String %', 'Nullable'], rows));
      body.appendChild(note('Schema Edges: structural object->property edges; not semantic field relationships.', 'edge-note'));
    } else if (id === 'fandaws') {
      dagClass('fandaws', 'done'); setBadge('fandaws', 'Done', 'done-b');
      const bind = st.binding || { rows: [], bound: 0, total: 0, field: '' };
      body.innerHTML = '';
      body.appendChild(note('binding ' + bind.field + ': ' + bind.bound + ' of ' + bind.total + ' rows resolved'));
      body.appendChild(table(['Value', 'Bound Concept', 'Match'],
        (bind.rows || []).map((b) => [String(b.value), b.match === 'resolved' ? (b.label + ' (' + b.code + ')') : EMDASH, b.match])));
    }
    // gate stages keep their static, verbatim "not built / not reached" copy (honest gating -- never overwritten)
  },
};

async function execute(raw) {
  clearState();
  const result = await run(raw, callbacks);
  // the built chain runs SNP -> BIBSS -> (Fandaws consulted), then the pipeline stops at the SAS gate
  if (result.stages.fandaws && result.stages.fandaws.status === 'done') {
    dagClass('sas', 'stopped');
    const stop = $('dag-stop'); if (stop) stop.style.display = 'inline';
  }
}

function switchTab(which) {
  $('tab-sample').classList.toggle('active', which === 'sample');
  $('tab-adhoc').classList.toggle('active', which === 'adhoc');
  $('pane-sample').classList.toggle('active', which === 'sample');
  $('pane-adhoc').classList.toggle('active', which === 'adhoc');
}

$('btn-sample').addEventListener('click', () => execute(SAMPLE_CSV));
$('btn-run').addEventListener('click', () => execute($('adhoc-text').value || ''));
$('tab-sample').addEventListener('click', () => switchTab('sample'));
$('tab-adhoc').addEventListener('click', () => switchTab('adhoc'));
