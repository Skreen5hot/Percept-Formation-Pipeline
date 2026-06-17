import { run } from './runner.js';
import { SAMPLE_CSV, MISLABELED_CSV, DIRTY_CSV } from './sample.js';

const $ = (id) => document.getElementById(id);
const BUILT = ['snp', 'bibss', 'sas', 'binder', 'oce', 'fandaws', 'fsdd'];
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
function chip(text, cls) { const s = document.createElement('span'); s.textContent = text; s.className = cls; return s; }

// the taint ladder, named -- the levels that ACTUALLY occur through the CSV chain are live; L3/L4 are defined
// but these inputs don't reach them (the data is never indeterminate enough at the type level), shown dimmed
// so the spectrum is honest about its own coverage rather than implying a tidy monotone.
const TAINT_LADDER = [
  ['L1', 'unambiguous', true], ['L2', 'representational ambiguity', true],
  ['L3', 'binding ambiguity', false], ['L4', 'semantic indeterminacy', false],
  ['L5', 'constitutive contradiction', true],
];
function taintLegend(present) {
  const div = document.createElement('div'); div.className = 'taint-legend';
  for (const [lvl, label, reachable] of TAINT_LADDER) {
    const seen = present.has(lvl);
    const s = chip(lvl + ' ' + label + (reachable ? '' : ' (not reached by these inputs)'),
      'lg taint-' + lvl + ((reachable && !seen) ? ' ' : (reachable ? '' : ' off')));
    if (seen) s.style.outline = '1px solid currentColor';
    div.appendChild(s);
  }
  return div;
}
// the FSDD field table with the Status and Taint cells colour-coded -- so clean (green), uncertain (amber),
// and rejected (red) fields sit side by side and the graded honesty is visible at a glance.
function fieldTable(fields) {
  const t = document.createElement('table');
  const heads = ['Field', 'Datatype', 'Semantic', 'Role', 'Status', 'Taint', 'Deciding axiom'];
  const thead = document.createElement('thead'), htr = document.createElement('tr');
  heads.forEach((h) => { const th = document.createElement('th'); th.textContent = h; htr.appendChild(th); });
  thead.appendChild(htr); t.appendChild(thead);
  const tb = document.createElement('tbody');
  for (const f of fields) {
    const tr = document.createElement('tr');
    const status = f['fsdd:fulfillmentStatus'] || 'n/a';
    const taint = f['fsdd:taintLevel'] || EMDASH;
    const cells = [
      [f['fsdd:column'], null], [f['csvw:datatype'] || EMDASH, null], [f['fsdd:semanticType'] || EMDASH, null],
      [f['fsdd:role'] || 'n/a', null], [status, 'fstatus ' + (status === 'n/a' ? 'na' : status)],
      [taint, 'taint taint-' + taint], [f['fsdd:decidingAxiom'] || '', null],
    ];
    cells.forEach(([txt, cls]) => {
      const td = document.createElement('td');
      if (cls) td.appendChild(chip(txt, cls)); else td.textContent = txt;
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  }
  t.appendChild(tb); return t;
}

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
        + 'built); frames come from a real compiled one-frame constitutive law (a W2Fuel slice over OWL 2 '
        + 'RL + RCR; the OCE firewall is not built). Proposals are fallible conjectures, never warrants.',
        'edge-note'));
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
    } else if (id === 'oce') {
      if (st.status === 'gate') {   // the Binder declined -> nothing to adjudicate (honest, not a verdict)
        dagClass('oce', 'stopped'); setBadge('oce', 'Gate', 'gate-b');
        body.innerHTML = ''; body.appendChild(note(st.gateReason || 'not reached', 'gate'));
        return;
      }
      dagClass('oce', 'done'); setBadge('oce', 'Done', 'done-b');
      const j = st.judgment || {};
      body.innerHTML = '';
      body.appendChild(note('Verdict: ' + String(j['oce:verdict'] || '').toUpperCase() + ' ' + EMDASH
        + ' disposition ' + (j['oce:disposition'] || '') + '. Deterministic adjudication of the binding '
        + 'against the constitutive law; the per-necessity justification below IS the self-describing '
        + 'judgment (every constitutive necessity, met or openly empty, with the axiom that decided it).'));
      // the verdict word alone is a status; the per-necessity justification is the architecture made legible
      body.appendChild(table(['Necessity', 'Kind', 'Status', 'Justification (the deciding axiom)'],
        (j['oce:necessities'] || []).map((n) => [n['oce:relation'], n['oce:kind'], n['oce:status'], n['oce:evidence']])));
      const od = j['oce:diagnostics'] || [];
      if (od.length) body.appendChild(note('diagnostics: ' + od.map((d) => d.code).join(', '), 'edge-note'));
    } else if (id === 'fandaws') {
      dagClass('fandaws', 'done'); setBadge('fandaws', 'Done', 'done-b');
      const bind = st.binding || { rows: [], bound: 0, total: 0, field: '' };
      body.innerHTML = '';
      body.appendChild(note('binding ' + bind.field + ': ' + bind.bound + ' of ' + bind.total + ' rows resolved'));
      body.appendChild(table(['Value', 'Bound Concept', 'Match'],
        (bind.rows || []).map((b) => [String(b.value), b.match === 'resolved' ? (b.label + ' (' + b.code + ')') : EMDASH, b.match])));
    } else if (id === 'fsdd') {
      const r = st.result;
      body.innerHTML = '';
      if (!r || !r.ok) {
        setBadge('fsdd', 'No artifact', 'stopped-b');
        body.appendChild(note('No dictionary emitted (no SAS percept, or structural invalidity).', 'stopmark'));
        return;
      }
      setBadge('fsdd', 'Emitted', 'done-b');
      const d = r.dictionary;
      // datasetStatus is an ADJUDICATION verdict; a declined binding was never adjudicated, so the degraded
      // dict carries no status key -- render that honestly rather than the literal "undefined".
      const status = d['fsdd:datasetStatus'] || 'unadjudicated (Binder declined; no proposal to adjudicate)';
      body.appendChild(note('Adjudication Manifest ' + EMDASH + ' status ' + status
        + ', taint ' + d['fsdd:datasetTaint'] + ', version ' + d['fsdd:dictionaryVersion'].slice(0, 18)
        + '... (content-addressed; the download re-hashes to this).'));
      const fields = d['fsdd:hasField'] || [];
      // REJECTED (red): a field the law refuses -- the catch, named.
      const rejected = fields.filter((f) => f['fsdd:fulfillmentStatus'] === 'violated');
      for (const f of rejected)
        body.appendChild(note('REJECTED ' + EMDASH + ' the mapping ' + f['fsdd:column'] + ' -> '
          + f['fsdd:role'] + ' is refused by the law: ' + f['fsdd:decidingAxiom'] + ' (quarantined at '
          + f['fsdd:taintLevel'] + '). The dictionary names the law that makes the mapping wrong.', 'stopmark'));
      // UNCERTAIN (amber): a field that is BOUND and MET yet carries taint -- usable, correct, and shaky at
      // once. The point of the dirty-data case: fulfillment and taint are orthogonal axes, both reported.
      const shaky = fields.filter((f) => f['fsdd:fulfillmentStatus'] === 'fulfilled'
        && f['fsdd:taintLevel'] && f['fsdd:taintLevel'] !== 'L1' && f['fsdd:taintLevel'] !== 'L0');
      for (const f of shaky)
        body.appendChild(note('UNCERTAIN ' + EMDASH + ' ' + f['fsdd:column'] + ' is bound and met ('
          + f['fsdd:role'] + ' fulfilled) yet flagged ' + f['fsdd:taintLevel'] + ': '
          + (f['fsdd:taintDerivation'] || []).join('; ') + '. Usable and correct, but its values are '
          + 'representationally mixed -- the dictionary reports the doubt rather than hiding it.', 'uncertainmark'));
      const present = new Set(fields.map((f) => f['fsdd:taintLevel']).filter(Boolean));
      body.appendChild(taintLegend(present));
      body.appendChild(fieldTable(fields));
      for (const ie of (d['fsdd:hasImplicitEntity'] || []))
        body.appendChild(note('implicit entity (required by the law, unwitnessed in the data): '
          + ie['fsdd:concernsType']['@id'] + ' ' + EMDASH + ' an information-content record ABOUT an '
          + 'absent participant (depth ' + ie['fsdd:depth'] + '), NOT an asserted instance.', 'edge-note'));
      // DOWNLOADS: the canonical emit() bytes (hash-verifiable), not a prettified rendering.
      const dl = (label, text, fname) => {
        const btn = document.createElement('button'); btn.className = 'btn'; btn.textContent = label;
        btn.style.marginRight = '.5rem'; btn.style.marginTop = '.5rem';
        btn.addEventListener('click', () => {
          const url = URL.createObjectURL(new Blob([text], { type: 'application/ld+json' }));
          const a = document.createElement('a'); a.href = url; a.download = fname; a.click();
          URL.revokeObjectURL(url);
        });
        return btn;
      };
      const row = document.createElement('p');
      row.appendChild(dl('Download dictionary (canonical JSON-LD)', r.canonical, 'semantic-data-dictionary.jsonld'));
      if (r.standardsPureCanonical)
        row.appendChild(dl('Download standards-pure envelope (DCAT/PROV; field CSVW view in v1.3)', r.standardsPureCanonical, 'dictionary-standards-pure.jsonld'));
      body.appendChild(row);
      const diags = (r.diagnostics || []).map((x) => x.code);
      if (diags.length) body.appendChild(note('diagnostics: ' + diags.join(', '), 'edge-note'));
    }
    // gate stages keep their static, verbatim "not built / not reached" copy (honest gating -- never overwritten)
  },
};

async function execute(raw) {
  clearState();
  await run(raw, callbacks);
  // SNP -> BIBSS -> SAS -> Binder -> OCE runs to an adjudicated verdict (Fandaws consulted; ALS terminal,
  // out of scope). On a Binder decline, the Binder panel shows the decline and OCE is not reached.
}

function switchTab(which) {
  $('tab-sample').classList.toggle('active', which === 'sample');
  $('tab-adhoc').classList.toggle('active', which === 'adhoc');
  $('pane-sample').classList.toggle('active', which === 'sample');
  $('pane-adhoc').classList.toggle('active', which === 'adhoc');
}

$('btn-sample').addEventListener('click', () => execute(SAMPLE_CSV));
$('btn-dirty').addEventListener('click', () => execute(DIRTY_CSV));
$('btn-mislabeled').addEventListener('click', () => execute(MISLABELED_CSV));
$('btn-run').addEventListener('click', () => execute($('adhoc-text').value || ''));
$('tab-sample').addEventListener('click', () => switchTab('sample'));
$('tab-adhoc').addEventListener('click', () => switchTab('adhoc'));
