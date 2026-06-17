import { run } from './runner.js';
import { SAMPLE_CSV } from './sample.js';

const $ = (id) => document.getElementById(id);
const BUILT = ['snp', 'bibss', 'sas', 'binder', 'fandaws'];
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
    } else if (id === 'sas') {
      dagClass('sas', 'done'); setBadge('sas', 'Done', 'done-b');
      const schema = st.schema || {};
      const fields = schema['viz:hasField'] || [];
      const tlabel = (iri) => String(iri || '').replace('viz:', '').replace('Type', '');
      body.innerHTML = '';
      body.appendChild(note('alignmentMode: ' + (schema['sas:alignmentMode'] || '') + ' ' + EMDASH + ' '
        + fields.length + ' fields, ' + (schema['viz:totalRows'] ?? '?')
        + ' rows. Standalone: SAS aligned from BIBSS structure alone, without consulting Fandaws '
        + EMDASH + ' the Fandaws binding shown below is a separate consulted-resource illustration.'));
      body.appendChild(table(['Field', 'Semantic Type', 'Alignment Rule', 'Consensus', 'Structural'],
        fields.map((f) => [
          f['viz:fieldName'],
          tlabel(f['viz:hasDataType'] && f['viz:hasDataType']['@id'])
            + (f['viz:numericPrecision'] ? ' (' + f['viz:numericPrecision'] + ')' : ''),
          f['sas:alignmentRule'],
          f['viz:consensusScore'],
          f['sas:structuralType'],
        ])));
      const diags = st.diagnostics || [];
      if (diags.length) body.appendChild(note('diagnostics: '
        + diags.map((d) => d.code + (d.field ? ':' + d.field : '')).join(', '), 'edge-note'));
    } else if (id === 'binder') {
      dagClass('binder', 'done'); setBadge('binder', 'Done', 'done-b');
      const prop = st.proposal || {};
      const proposals = prop['bind:proposals'] || [];
      body.innerHTML = '';
      body.appendChild(note('Conjectural proposal layer. Morphology lexis is name-synthesized (DKNP not '
        + 'built); frames are a demo catalog (the constitutive law / OCE not built). Proposals are '
        + 'fallible conjectures, never warrants.', 'edge-note'));
      if (!proposals.length) {
        body.appendChild(note('No frame proposed ' + EMDASH + ' the columns do not ground to any known '
          + 'frame (BIND-001). The Binder DECLINES rather than guess ' + EMDASH + ' declining when nothing '
          + 'converges is its core safety property.', 'stopmark'));
      } else {
        const top = proposals[0];
        const pb = top['bind:proposedBinding'] || {};
        const conf = Number(top['bind:confidence'] || 0).toFixed(3);
        body.appendChild(note('Frame: ' + pb.recordConcept + ' ' + EMDASH + ' confidence ' + conf
          + (top['bind:requiresReview'] ? ' (requires review)' : '') + '. ' + (pb.bindings || []).length
          + ' roles bound; residue ' + (top['bind:residueFields'] || []).length + '.'));
        const VC = { agree: 'agree', disagree: 'disagree', silent: '-' };
        body.appendChild(table(['Field', 'Role', 'Filler', 'Convergence (morph/lex/struct/frame/topic)', 'Conf'],
          (top['bind:bindings'] || []).map((b) => [
            b['bind:fieldId'], b['bind:role'], b['bind:fillerKind'],
            (b['bind:convergence'] || []).map((v) => VC[v['bind:vote']] || '?').join(' '),
            Number(b['bind:bindingConfidence'] || 0).toFixed(2),
          ])));
      }
      const bdiags = prop['bind:diagnostics'] || [];
      if (bdiags.length) body.appendChild(note('diagnostics: '
        + bdiags.map((d) => d.code + (d.fieldId ? ':' + d.fieldId : '')).join(', '), 'edge-note'));
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
  // the built chain runs SNP -> BIBSS -> SAS -> Binder (Fandaws consulted), then stops at the OCE gate
  if (result.stages.binder && result.stages.binder.status === 'done') {
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
