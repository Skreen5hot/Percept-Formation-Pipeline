import { run, runStar } from './runner.js';
import { SAMPLE_CSV, MISLABELED_CSV, DIRTY_CSV, CLINICAL_CSV, DISPUTED_CSV } from './sample.js';
import { STAR_SAMPLES } from './ssm.js';

const $ = (id) => document.getElementById(id);
const BUILT = ['snp', 'bibss', 'sas', 'ssm', 'binder', 'oce', 'fandaws', 'fsdd', 'gm'];
const ALL = ['snp', 'bibss', 'sas', 'ssm', 'binder', 'oce', 'dknp', 'fandaws'];
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
// prefixed IRI -> plain words: 'fan:GlucoseConcentration' -> 'glucose concentration', 'fan:Specimen' -> 'specimen'
function plainName(iri) {
  const s = String(iri || '');
  const local = s.slice(Math.max(s.lastIndexOf(':'), s.lastIndexOf('/'), s.lastIndexOf('#')) + 1);
  return local.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
}

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
    // present levels POP (bold + outlined); absent levels RECEDE (muted); unreachable also italic + labelled.
    let cls = 'lg taint-' + lvl + (seen ? ' seen' : (reachable ? ' absent' : ' off'));
    const s = chip(lvl + ' ' + label + (reachable ? '' : ' (not reached by these inputs)'), cls);
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
    } else if (id === 'ssm') {
      // STRUCTURED-SOURCE FRONT: FK -> role resolution, then convergence into a flat frame for the shared core.
      if (st.status !== 'done') {
        dagClass('ssm', 'stopped'); setBadge('ssm', 'Stopped', 'stopped-b');
        body.innerHTML = ''; body.appendChild(note('SSM front produced no result.', 'stopmark')); return;
      }
      dagClass('ssm', 'done'); setBadge('ssm', 'Done', 'done-b');
      body.innerHTML = '';
      body.appendChild(note('Structured-source front ' + EMDASH + ' each foreign key resolved to its dimension '
        + 'row and bound to a role in ' + st.recordConcept + '. Outcome: ' + String(st.outcome).toUpperCase()
        + '. The resolved roles converge into a flat frame proposal handed to the SAME shared Binder the raw '
        + 'front uses (different door, same core).'));
      body.appendChild(table(['FK column', 'Role', '-> Dimension', 'Relatum concept', 'Value', 'Resolution'],
        (st.roleResolutions || []).map((r) => [r.fkColumn, r.role, r.refTable, r.relatumConcept, String(r.fkValue ?? 'null'), r.note])));
      // SNOWFLAKE HOP -- the descent shown in the RESOLUTION panel (it IS a resolution operation, not only a graph
      // shape). The four per-subject outcomes are legible here, not only in the final Turtle.
      const hops = st.hopResolutions || [];
      if (hops.length) {
        const n = st.sampleSize || 1;
        if (n > 1) body.appendChild(note('This sample is ' + n + ' structurally-identical star orders (all 9 roles '
          + 'resolve); the star resolution + shared-core adjudication is shown for the first (representative). They '
          + 'differ ONLY in their ship_info row (and thus the snowflake hop below), shown for all ' + n + ' -- which '
          + 'the graph then materializes.', 'edge-note'));
        body.appendChild(note('Snowflake hop ' + EMDASH + ' resolution follows the dimension\'s OWN declared FK one '
          + 'declared level further (ship_info.customer_key -> customer_dim). The intermediary\'s own FK resolves by '
          + 'the SAME primitive, one level deeper -- the four per-subject outcomes:'));
        body.appendChild(table(['Order', 'Subject', 'Deep FK', '-> Dim', 'Value', 'Hop resolution'],
          hops.map((h) => ['ord-' + h.orderId, h.subject, h.deepFk, h.refTable, String(h.value ?? 'null'),
            h.outcome === 'resolved'
              ? ('resolved -> ' + h.concept + '/' + h.resolvedKey + (h.coreferent ? ' (coreferent with the orderer)' : ' (distinct)'))
              : h.outcome === 'absent'
                ? 'absent (NULL) -> nothing (optional relation unfilled)'
                : 'dangling (' + h.reason + ') -> UnresolvedRole (never a fabricated customer)'])));
      }
      if ((st.roleDefects || []).length) body.appendChild(note('roleDefects: '
        + st.roleDefects.map((d) => String(d.role) + ' (' + ((d.diagnostic && d.diagnostic.reason) || '') + ')').join(', '), 'edge-note'));
      if ((st.capMarkers || []).length) body.appendChild(note('capMarkers: '
        + st.capMarkers.map((c) => c.fk + ' cap ' + c.cap + '/' + c.actual + ' (' + c.axis + ')').join(', '), 'edge-note'));
    } else if (id === 'binder') {
      // star path: the Binder is the labeled CONVERGENCE -- the same engine, fed a pre-bound flat frame.
      if (st.status === 'gate') {
        dagClass('binder', 'stopped'); setBadge('binder', 'Gate', 'gate-b');
        body.innerHTML = ''; body.appendChild(note(st.gateReason || 'not reached', 'gate')); return;
      }
      if (st.shared) {
        dagClass('binder', 'done'); setBadge('binder', 'Done', 'done-b');
        const p = st.proposal || {}; const rb = p.roleBindings || [];
        body.innerHTML = '';
        body.appendChild(note('Convergence point ' + EMDASH + ' the structured front pre-bound ' + rb.length
          + ' roles into a flat ' + p.recordConcept + ' frame proposal; the SAME shared Binder receives it (the '
          + 'raw front feeds the identical Binder). This is where any source kind becomes one semantic representation.'));
        body.appendChild(table(['Role', 'Relatum concept', 'Field'], rb.map((b) => [b.role, b.relatumConcept, b.fieldId])));
        return;
      }
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
      if (st.shared) {
        dagClass('oce', 'done'); setBadge('oce', 'Done', 'done-b');
        body.innerHTML = '';
        body.appendChild(note('Shared OCE firewall (the same byte-identical engine) ' + EMDASH + ' verdict '
          + st.verdict + '. Deterministic adjudication of the flat frame against the constitutive law; the '
          + 'per-role justification (each constitutive necessity, met or openly empty, with the deciding axiom) '
          + 'is carried in the Adjudication Manifest below.'));
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
        dagClass('fsdd', 'stopped'); setBadge('fsdd', 'No artifact', 'stopped-b');
        body.appendChild(note('No dictionary emitted (no SAS percept, or structural invalidity).', 'stopmark'));
        return;
      }
      dagClass('fsdd', 'done'); setBadge('fsdd', 'Emitted', 'done-b');
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
      // DISPUTED (violet, L4): two competing readings, no winner -- the system DECLINES TO CHOOSE. The
      // headline is the refusal (datasetStatus 'disputed'); both candidates are recorded and routed to a
      // commit gate. This is what lights L4 ("disputed between competing laws").
      for (const dispute of (d['fsdd:disputed'] || [])) {
        const cands = dispute['fsdd:candidates'] || [];
        const names = cands.map((c) => plainName(c['fsdd:frame'])).join(' vs ');
        body.appendChild(note('DISPUTED ' + EMDASH + ' the data is honestly ambiguous between ' + names
          + '; the adjudicator DECLINES TO CHOOSE. Both readings are recorded and routed to a commit gate ('
          + dispute['fsdd:resolution'] + ') with no winner ' + EMDASH + ' quarantined at L4 (disputed between '
          + 'competing laws). The dictionary refuses to pick rather than guess.', 'disputemark'));
        for (const c of cands)
          body.appendChild(note('reading: ' + plainName(c['fsdd:frame']) + ' (confidence '
            + Number(c['fsdd:confidence'] || 0).toFixed(2) + ') ' + EMDASH + ' a valid binding of the same '
            + 'columns; neither outscores the other.', 'edge-note'));
      }
      const present = new Set(fields.map((f) => f['fsdd:taintLevel']).filter(Boolean));
      if (d['fsdd:datasetTaint']) present.add(d['fsdd:datasetTaint']);  // dataset-level taint (L4 on a dispute) lights the legend
      body.appendChild(taintLegend(present));
      body.appendChild(fieldTable(fields));
      // IMPLICIT ENTITIES -- the law's required-but-unwitnessed participants. Surface the DERIVATION
      // (fsdd:derivedFrom), not just the type: it is the justification, and for an inherence-derived entity
      // it names the AXIOM (the non-obvious 'a present value entails an absent entity' derivation). The
      // inherence-derived entity is accented + led 'by necessity'; plain missing-role entities are grey +
      // led 'missing role' -- so when several render together the by-necessity one is legibly distinct.
      const ies = d['fsdd:hasImplicitEntity'] || [];
      if (ies.length) {
        body.appendChild(note('Implicit entities ' + EMDASH + ' required by the law, unwitnessed in the '
          + 'data; information-content records ABOUT absent participants, never asserted instances:', 'edge-note'));
        for (const ie of ies) {
          const inh = !!ie['fsdd:inheresQuality'];   // structured -> an inherence-derived bearer
          const div = document.createElement('div');
          div.className = 'implicit-entity' + (inh ? ' inherence' : '');
          const lead = document.createElement('span'); lead.className = 'ie-lead';
          if (inh) {
            // partner-facing: a present property FORCES this entity to exist. Plain lead carrying the
            // entailment; the formal axiom citation demoted to a warrant beneath it.
            const bearer = plainName(ie['fsdd:concernsType']['@id']);
            const quality = plainName(ie['fsdd:inheresQuality']['@id']);
            lead.textContent = 'must exist ' + EMDASH + ' a ' + bearer;
            div.appendChild(lead);
            div.appendChild(document.createTextNode(': the data records a ' + quality + ', which must inhere '
              + 'in a physical ' + bearer + ' ' + EMDASH + ' even though no column names it.'));
            div.appendChild(chip('warrant: ' + (ie['fsdd:derivedFrom'] || ''), 'ie-warrant'));
          } else {
            lead.textContent = 'missing role: ' + ie['fsdd:concernsType']['@id'] + ' (depth ' + ie['fsdd:depth'] + ')';
            div.appendChild(lead);
            div.appendChild(document.createTextNode(' ' + EMDASH + ' ' + (ie['fsdd:derivedFrom'] || '')));
          }
          body.appendChild(div);
        }
      }
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
        row.appendChild(dl('Download standards-pure envelope (envelope only -- fields not yet dual-encoded in CSVW)', r.standardsPureCanonical, 'dictionary-standards-pure.jsonld'));
      body.appendChild(row);
      const diags = (r.diagnostics || []).map((x) => x.code);
      if (diags.length) body.appendChild(note('diagnostics: ' + diags.join(', '), 'edge-note'));
    } else if (id === 'gm') {
      // TRANSFORM/LOAD: the Adjudication Manifest projected to a faithful RDF graph under M. The panel shows the
      // EMITTED graph (turtle) as the artifact -- not merely that a graph was produced. Both fronts render here:
      // the star front (per-fact-row frames, witnessed-IRI frames) and the raw front (per-row blank-node frames).
      body.innerHTML = '';
      if (st.status === 'gate') {   // raw front declined / disputed -- honest gate, not a fabricated graph
        dagClass('gm', 'stopped'); setBadge('gm', 'Gate', 'gate-b');
        body.appendChild(note(st.gateReason || 'not reached', 'gate'));
        return;
      }
      dagClass('gm', 'done'); setBadge('gm', 'Materialized', 'done-b');
      const nT = (st.triples || []).length;
      if (st.raw) {
        // RAW front: one BLANK-NODE frame per row (identity-deferred -- no witnessed frame key).
        body.appendChild(note('Graph Materialization (the T and L of ETL) ' + EMDASH + ' the Adjudication Manifest '
          + 'projected to a faithful RDF graph under M. The raw front declares no witnessed frame key, so each row is '
          + 'one BLANK-NODE frame (identity-deferred); reference fillers become witnessed-identity entities (coreferent), '
          + 'measured values become RDF literals, absent constitutive roles become ImplicitEntityRecords (about the '
          + 'missing type, never a fabricated instance), and a law-violated mapping is an ExcludedFrame (never forced). '
          + st.frameCount + ' frame(s), ' + nT + ' triples, status ' + st.datasetStatus + '.'));
      } else {
        const perRow = st.perRow || [];
        body.appendChild(note('Graph Materialization (the T and L of ETL) ' + EMDASH + ' the Adjudication Manifest '
          + 'projected to a faithful RDF graph under M. Every role lands in exactly one of four honest outcomes: '
          + 'resolved becomes a witnessed-identity node (coreferent because the key is real); constitutive-absent '
          + 'becomes an ImplicitEntityRecord (ABOUT the missing type, never an instance of it); accidental-broken '
          + 'becomes an UnresolvedRole (the broken reference is IN the graph, not silently dropped); frame-excluded '
          + 'never materializes as a valid frame (its reason names every constitutive dangler). ' + nT + ' triples.'));
        body.appendChild(table(['Frame', 'Outcome', 'Triples'],
          perRow.map((r) => ['ord-' + ((r.row && r.row.order_id) ?? '?'), String(r.outcome).toUpperCase(), String((r.triples || []).length)])));
      }
      const pre = document.createElement('pre'); pre.className = 'turtle'; pre.textContent = st.turtle || '';
      body.appendChild(pre);
      const gbtn = document.createElement('button'); gbtn.className = 'btn'; gbtn.textContent = 'Download graph (Turtle)';
      gbtn.style.marginTop = '.5rem';
      gbtn.addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([st.turtle || ''], { type: 'text/turtle' }));
        const a = document.createElement('a'); a.href = url; a.download = 'materialized-graph.ttl'; a.click();
        URL.revokeObjectURL(url);
      });
      body.appendChild(gbtn);
    }
    // gate stages keep their static, verbatim "not built / not reached" copy (honest gating -- never overwritten)
  },
};

function setFront(which) {
  const raw = $('front-raw'), star = $('front-star');
  if (raw) { raw.classList.toggle('active', which === 'raw'); raw.classList.toggle('dim', which !== 'raw'); }
  if (star) { star.classList.toggle('active', which === 'star'); star.classList.toggle('dim', which !== 'star'); }
}

async function execute(raw) {
  clearState();
  setFront('raw');
  await run(raw, callbacks);
  // raw-bytes front: SNP -> BIBSS -> SAS form the percept; the shared Binder -> OCE -> FSDD core adjudicates.
}

async function executeStar(factRows) {
  clearState();
  setFront('star');
  await runStar(factRows, callbacks);
  // structured-source front: SSM resolves FKs + binds roles; the SAME shared Binder -> OCE -> FSDD core adjudicates.
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
$('btn-clinical').addEventListener('click', () => execute(CLINICAL_CSV));
$('btn-disputed').addEventListener('click', () => execute(DISPUTED_CSV));
$('btn-run').addEventListener('click', () => execute($('adhoc-text').value || ''));
$('btn-star-clean').addEventListener('click', () => executeStar(STAR_SAMPLES.clean.factRows));
$('btn-star-ice').addEventListener('click', () => executeStar(STAR_SAMPLES.ice.factRows));
$('btn-star-orphan').addEventListener('click', () => executeStar(STAR_SAMPLES.orphan.factRows));
$('btn-star-snowflake').addEventListener('click', () => executeStar(STAR_SAMPLES.snowflake.factRows));
$('tab-sample').addEventListener('click', () => switchTab('sample'));
$('tab-adhoc').addEventListener('click', () => switchTab('adhoc'));
