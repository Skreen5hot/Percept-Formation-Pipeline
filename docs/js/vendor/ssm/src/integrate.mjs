// C1 (N-FK assembly): ROLE-MODALITY RULE for multi-FK star assembly.
// Per-FK outcome is governed by the ROLE'S MODALITY (constitutive vs accidental):
//   Resolved       -- either modality: bind relatum (unremarkable).
//   NULL           -- constitutive: OCE empty -> FSDD ICE; accidental: absent (unremarkable, no ICE).
//   Dangling       -- constitutive: WHOLE-FRAME EXCLUSION (frame defect, no dict, no ICE, roleDefects=[]);
//                     accidental: frame adjudicates normally, LOCAL roleDefect recorded.
// CONTRACT INVARIANT #2 (C1): outcome computed from CONSTITUTIVE roles ONLY.
// CONTRACT INVARIANT #3 (C1): frame-level defect XOR roleDefects[] (mutually exclusive).
import { assemble } from './assemble.mjs';
import { binderDriver } from './binderDriver.mjs';
import { adjudicate } from '../../oce/src/adjudicate.mjs';
import { emit } from '../../fsdd/src/emit.mjs';
import { resolveKeyTemporal, resolveKey } from './krs.mjs';
import { assembleAggregation } from './aggregate.mjs';

function cartesian(arrays) {
  return arrays.reduce((acc, arr) => acc.flatMap(a => arr.map(b => [...a, b])), [[]]);
}

// C1: read the constitutive role set from the law (rcr partition or per-role flag).
// Canonicalize a role identifier to its local name (the capstone seam: a COMPILED law has BARE frames[].roles
// but PREFIXED rcr, and a canonical SSM references roles in the bare form; matching by localName makes the
// constitutive/accidental split robust to bare-vs-prefixed without loosening any exact-match -- the law is
// ground truth, the consumer canonicalizes at the boundary).
function roleLocal(r) { const s = String(r); return s.includes(':') ? s.split(':').pop() : s; }

function getConstitutiveRoleSet(law, recordConcept, allRAs) {
  const rcr = law.rcr && law.rcr[recordConcept];
  if (rcr && rcr.constitutive) return new Set(rcr.constitutive.map(roleLocal));
  const frame = law.frames && law.frames[recordConcept];
  if (frame && frame.roles && frame.roles.some(r => typeof r.constitutive === 'boolean')) {
    return new Set(frame.roles.filter(r => r.constitutive === true).map(r => roleLocal(r.role)));
  }
  return new Set(allRAs.map(ra => roleLocal(ra['ssm:role'])));
}

// C1 accidental-dangling: record a LOCAL roleDefect; frame survives (invariant #3).
function detectAccidentalDefects(accidentalRAs, factRow, dimsData) {
  const roleDefects = [];
  for (const ra of accidentalRAs) {
    const fkValue = factRow[ra['ssm:fkColumn']];
    if (fkValue === null || fkValue === undefined) continue; // C1 accidental-NULL: unremarkable
    const candidates = dimsData[ra['ssm:refTable']] || [];
    if (!candidates.some(c => c.businessKey === fkValue)) {
      roleDefects.push({
        role: ra['ssm:role'],
        diagnostic: { code: 'SSM-DANGLING-FK', fieldId: ra['ssm:fkColumn'], reason: 'broken-ref' },
        taint: 'L5'
      });
    }
  }
  return roleDefects;
}

// C1: restrict the law to constitutive roles only so the OCE/FSDD never treats
// accidental roles as necessities or mints ICEs for them (invariant #2).
function buildConstitutiveLaw(law, recordConcept, constitutiveRoles) {
  return {
    ...law,
    frames: law.frames ? {
      ...law.frames,
      [recordConcept]: {
        ...law.frames[recordConcept],
        roles: (law.frames[recordConcept]?.roles || []).filter(r => constitutiveRoles.has(roleLocal(r.role)))
      }
    } : law.frames,
    rcr: law.rcr ? {
      ...law.rcr,
      [recordConcept]: {
        constitutive: law.rcr[recordConcept]?.constitutive || [],
        accidental: []
      }
    } : law.rcr
  };
}

function runPipeline(ssm, factRow, dimsData, query, factTableKey, law, scope, lexis, schema, cism, envelope) {
  const factSpec = ssm['ssm:facts'][factTableKey];
  const recordConcept = factSpec['ssm:recordConcept'];
  const roleAssignments = factSpec['ssm:roleAssignments'] || [];
  const constitutiveRoles = getConstitutiveRoleSet(law, recordConcept, roleAssignments);

  const constitutiveRAs = roleAssignments.filter(ra => constitutiveRoles.has(roleLocal(ra['ssm:role'])));
  const accidentalRAs = roleAssignments.filter(ra => !constitutiveRoles.has(roleLocal(ra['ssm:role'])));

  // C1 accidental-dangling: detect local role defects before assembly (invariant #3: excluded frames get no roleDefects).
  const roleDefects = detectAccidentalDefects(accidentalRAs, factRow, dimsData);

  // F2 (accidental visibility): bind the accidental roles that RESOLVE so they appear in the dictionary -- bound
  // and real, just not identity-defining. They are kept OUT of the constitutive necessity adjudication
  // (lawForOCE below stays constitutive-only), so each carries role + relatum but no necessity (fulfillment
  // n/a) -- the honest "accidental, resolved" shape. Same businessKey match detectAccidentalDefects uses.
  const accDimDefs = ssm['ssm:dimensions'] || {};
  const accidentalBindings = [];
  for (const ra of accidentalRAs) {
    const fkValue = factRow[ra['ssm:fkColumn']];
    if (fkValue === null || fkValue === undefined) continue;
    const candidates = dimsData[ra['ssm:refTable']] || [];
    if (candidates.some(c => c.businessKey === fkValue)) {
      accidentalBindings.push({
        'bind:fieldId': ra['ssm:fkColumn'],
        'bind:role': ra['ssm:role'],
        'bind:relatumConcept': (accDimDefs[ra['ssm:refTable']] || {})['ssm:entityClass'],
      });
    }
  }

  const useSSM = accidentalRAs.length > 0 ? {
    ...ssm,
    'ssm:facts': {
      ...ssm['ssm:facts'],
      [factTableKey]: { ...factSpec, 'ssm:roleAssignments': constitutiveRAs }
    }
  } : ssm;

  const a = assemble(useSSM, [factRow], dimsData, query);

  // C1 constitutive-dangling: WHOLE-FRAME EXCLUSION (invariant #3: no roleDefects on excluded frame).
  if (a.dangling.length > 0) {
    const d = a.dangling[0];
    return {
      outcome: 'dangling',
      dictionary: null,
      ice: [],
      defect: {
        // sec 3a.2 (graph-materialization v1.5): taint = worst over ALL danglers; single-dangler unchanged.
        taint: a.dangling.some(x => x.reason === 'broken-ref') ? 'L5' : 'L4',
        // fieldId/reason kept (first dangler) for backward compat; danglers[] ADDITIVE -- every constitutive
        // dangler so the materialized ExcludedFrame reason can name them all (assemble already collected them).
        diagnostic: {
          code: 'SSM-DANGLING-FK',
          fieldId: d.fieldId,
          reason: d.reason,
          danglers: a.dangling.map(x => ({ fieldId: x.fieldId, reason: x.reason }))
        }
      },
      roleDefects: [], // C1 invariant #3: excluded frame never carries local defects
      capMarkers: []
    };
  }

  const fb = a.bindings.find(b => b.frame === factTableKey);
  const accidentalFkCols = new Set(accidentalRAs.map(ra => ra['ssm:fkColumn']));

  const residualSchema = {
    'viz:rawInputHash': schema['viz:rawInputHash'],
    'viz:hasField': schema['viz:hasField'].filter(f =>
      fb.residualFieldIds.includes(f.fieldId) && !accidentalFkCols.has(f['viz:fieldName'] || '')
    )
  };

  // F2: emit over the FULL schema/cism (incl. accidental FK cols) so resolved accidental roles surface as
  // fields. (residualSchema above still excludes them from the Binder's residual conjecture -- they are bound
  // explicitly via accidentalBindings, not conjectured.) The accidental fields carry role+relatum but no
  // constitutive necessity, so they never become OCE necessities or mint ICEs (lawForOCE stays restricted).
  const schemaForEmit = schema;
  const cismForEmit = cism;

  // C1 invariant #2: restrict the law to constitutive roles only so accidental roles
  // never become OCE necessities and never yield ICEs or make the dict 'incomplete'.
  const lawForOCE = accidentalRAs.length > 0
    ? buildConstitutiveLaw(law, recordConcept, constitutiveRoles)
    : law;

  const bd = binderDriver({ factBinding: fb, factSchema: residualSchema, law: lawForOCE, scope, lexis });
  // binderDriver rejects a roleBinding whose relatumConcept fails the concept-check (e.g. a mis-ratified
  // polymorphic typeMap entry, or any mis-ratified FK->role). It returns { ok:false, rejected, proposal:null } --
  // the frame cannot be honestly built. Surface a 'fails' frame naming the rejection rather than crashing on
  // bd.proposal (additive: a valid binding has bd.ok===true and is unaffected; no prior test hit a rejection).
  if (!bd.ok || !bd.proposal) {
    return {
      outcome: 'fails',
      dictionary: null,
      ice: [],
      defect: { taint: 'concept-check', diagnostic: `roleBinding rejected at the concept-check gate: ${bd.rejected ? `${bd.rejected.role} (${bd.rejected.reason})` : 'binder rejection'}` },
      roleDefects: [],
      capMarkers: []
    };
  }
  const j = adjudicate({ law: lawForOCE, proposal: bd.proposal, percept: {} });

  // F3: the FSDD field-join matches bind:fieldId against the schema's bare viz:fieldName, but the SSM binding
  // carries qualified fieldIds -> the join missed and role/relatum/fulfillment dropped to n/a. Map each role
  // back to its declared (bare) column so the join lands. Append the resolved accidental roles (F2).
  const colByRole = {};
  for (const ra of roleAssignments) colByRole[ra['ssm:role']] = ra['ssm:fkColumn'] || ra['ssm:discriminatorColumn'];
  const B = [
    ...bd.proposal.roleBindings.map(rb => ({
      'bind:fieldId': colByRole[rb.role] || rb.fieldId,
      'bind:role': rb.role,
      'bind:relatumConcept': rb.relatumConcept
    })),
    ...accidentalBindings,
  ];

  const binding = {
    '@type': 'bind:BindingProposal',
    'bind:proposalSource': 'deterministic',
    'bind:proposals': [{
      'bind:proposedBinding': { recordConcept: bd.proposal.recordConcept, bindings: B },
      'bind:bindings': B
    }]
  };

  const em = emit({ schema: schemaForEmit, cism: cismForEmit, binding, judgment: j, envelope, sourceKind: 'structured' });

  return {
    outcome: a.absent.length > 0 ? 'absent' : 'resolved',
    dictionary: em.dictionary,
    ice: em.dictionary && em.dictionary['fsdd:hasImplicitEntity'] ? em.dictionary['fsdd:hasImplicitEntity'] : [],
    defect: null,
    roleDefects, // C1 accidental-dangling: local defects ride here on adjudicated frames
    capMarkers: []
  };
}

// §4.6: bitemporal point-mode path -- pre-resolves each constitutive FK via resolveKey (assertedAt
// argmax within assertionHorizon), then runs the pipeline with only the winning candidate.
// Surfaces both valid-time + assertion-time faces of versionHandle.
function resolvePointBitemporal(ssm, factRow, dimsData, query, factTableKey, law, scope, lexis, schema, cism, envelope) {
  const factSpec = ssm['ssm:facts'][factTableKey];
  const recordConcept = factSpec['ssm:recordConcept'];
  const roleAssignments = factSpec['ssm:roleAssignments'] || [];
  const constitutiveRoles = getConstitutiveRoleSet(law, recordConcept, roleAssignments);
  const constitutiveRAs = roleAssignments.filter(ra => constitutiveRoles.has(roleLocal(ra['ssm:role'])));

  let anyAbsent = false;
  // sec 3a.2 (graph-materialization v1.5): collect EVERY constitutive dangler (was: break at the first). This is
  // the path the demo (point-mode bitemporal) takes. Scan the WHOLE constitutive set -- do not break on absent
  // either, or a dangler after an absent would be silently dropped. A constitutive dangling EXCLUDES the frame and
  // DOMINATES absent.
  const danglers = [];
  const resolvedFKs = [];

  for (const ra of constitutiveRAs) {
    const fkColumn = ra['ssm:fkColumn'];
    const refTable = ra['ssm:refTable'];
    const fkValue = factRow[fkColumn];
    const candidates = dimsData[refTable] || [];

    const resolution = resolveKey({ fkValue, candidates, validInstant: query.validInstant, assertionHorizon: query.assertionHorizon });

    if (resolution.state === 'absent') {
      anyAbsent = true;
      continue;
    }
    if (resolution.state === 'dangling') {
      danglers.push({ fieldId: fkColumn, reason: resolution.reason });
      continue;
    }

    const winner = candidates.find(c => c.id === resolution.sourceEventId);

    // §4.6 supersedes: candidates this winner beat (same key, covering validInstant, earlier assertedAt within horizon)
    const supersedes = candidates
      .filter(c =>
        c.businessKey === fkValue &&
        c.id !== resolution.sourceEventId &&
        c.validFrom <= query.validInstant &&
        (c.validTo === null || c.validTo > query.validInstant) &&
        c.assertedAt <= query.assertionHorizon &&
        c.assertedAt < resolution.assertedAt
      )
      .map(c => c.id);

    resolvedFKs.push({ fkColumn, refTable, winner, supersedes });
  }

  if (danglers.length > 0) {
    return {
      outcome: 'dangling',
      dictionary: null,
      ice: [],
      defect: {
        taint: danglers.some(d => d.reason === 'broken-ref') ? 'L5' : 'L4',
        diagnostic: { code: 'SSM-DANGLING-FK', fieldId: danglers[0].fieldId, reason: danglers[0].reason, danglers }
      },
      roleDefects: [],
      capMarkers: []
    };
  }

  if (anyAbsent || resolvedFKs.length === 0) {
    return runPipeline(ssm, factRow, dimsData, query, factTableKey, law, scope, lexis, schema, cism, envelope);
  }

  // §4.5 per-ROLE (not per-dimension) version resolution: a role-played dim is N independent bindings sharing
  // a target table. Restrict each constitutive winner's businessKey to its winning version, but KEEP the OTHER
  // businessKeys the other roles (accidental or constitutive) to the SAME dim resolve against -- else those
  // roles get FALSE broken-ref roleDefects (the capstone date_dim x3 grain seam: order/required/shippedOccupies).
  const modifiedDimsData = { ...dimsData };
  const winnersByTable = {};
  for (const { refTable, winner } of resolvedFKs) { (winnersByTable[refTable] ||= []).push(winner); }
  for (const refTable of Object.keys(winnersByTable)) {
    const chosen = winnersByTable[refTable];
    const chosenKeys = new Set(chosen.map(c => c.businessKey));
    const others = (dimsData[refTable] || []).filter(c => !chosenKeys.has(c.businessKey));
    modifiedDimsData[refTable] = [...chosen, ...others];
  }

  const pipeResult = runPipeline(ssm, factRow, modifiedDimsData, query, factTableKey, law, scope, lexis, schema, cism, envelope);

  // §4.6: versionHandle with valid-time face + assertion-time face
  let versionHandle;
  const primaryFK = resolvedFKs[0];
  if (primaryFK && primaryFK.winner && pipeResult.outcome === 'resolved') {
    versionHandle = {
      versionKey: primaryFK.winner.id,
      validInterval: { validFrom: primaryFK.winner.validFrom, validTo: primaryFK.winner.validTo },
      entityKey: primaryFK.winner.businessKey,
      assertedAt: primaryFK.winner.assertedAt,
    };
    if (primaryFK.supersedes.length > 0) {
      versionHandle.supersedes = primaryFK.supersedes;
    }
  }

  return { ...pipeResult, versionHandle };
}

// §4.4: resolve a single bridge endpoint via C1's resolveKey machinery.
function resolveBridgeEndpoint(fkValue, refTable, dimsData, query) {
  const candidates = dimsData[refTable] || [];
  const validInstant = query && query.validInstant;
  const assertionHorizon = (query && query.assertionHorizon) || '9999-12-31';
  const resolution = resolveKey({ fkValue, candidates, validInstant, assertionHorizon });
  const winner = resolution.state === 'resolved'
    ? candidates.find(c => c.id === resolution.sourceEventId)
    : null;
  return { resolution, winner };
}

// §4.4: build a versionHandle from a winning dim candidate (same shape as the fact path).
function buildRelVersionHandle(winner) {
  if (!winner) return null;
  return {
    versionKey: winner.id,
    validInterval: { validFrom: winner.validFrom, validTo: winner.validTo },
    entityKey: winner.businessKey,
    assertedAt: winner.assertedAt
  };
}

// §4.4: find which bridge definition owns this bridgeRow (both FK columns must be present in the row).
function findBridgeForRow(bridges, bridgeRow) {
  for (const [name, def] of Object.entries(bridges)) {
    const subjCol = def['ssm:subjectRole']['ssm:fkColumn'];
    const objCol = def['ssm:objectRole']['ssm:fkColumn'];
    if (subjCol in bridgeRow && objCol in bridgeRow) return [name, def];
  }
  return [null, null];
}

// §4.4 A2: assemble one relational result for a single bridgeRow.
function assembleRelationalResult(bridgeName, bridgeDef, bridgeRow, ssm, dimsData, query) {
  const subjectRole = bridgeDef['ssm:subjectRole'];
  const objectRole = bridgeDef['ssm:objectRole'];
  const attributes = bridgeDef['ssm:attributes'];
  const verbLabel = bridgeDef['ssm:verbLabel'];
  const dimensions = ssm['ssm:dimensions'] || {};

  // A2 branch (2): link-with-attributes -> detect and route, never crammed into the edge (§1.3).
  if (attributes && attributes.length > 0) {
    return {
      bridge: bridgeName,
      outcome: 'routed',
      routedToEntity: true,
      diagnostic: { code: 'SSM-LINK-WITH-ATTRIBUTES', reason: 'Bridge carries non-FK attribute columns; must be materialized as an entity frame' },
      roleDefects: [],
      capMarkers: []
    };
  }

  // A2 branch (1): pure-link -- resolve both constitutive endpoints via C1 resolveKey.
  const subjectFkCol = subjectRole['ssm:fkColumn'];
  const subjectRefTable = subjectRole['ssm:refTable'];
  const objectFkCol = objectRole['ssm:fkColumn'];
  const objectRefTable = objectRole['ssm:refTable'];

  const subjRes = resolveBridgeEndpoint(bridgeRow[subjectFkCol], subjectRefTable, dimsData, query);
  const objRes = resolveBridgeEndpoint(bridgeRow[objectFkCol], objectRefTable, dimsData, query);

  // C1 constitutive-dangling -> whole-frame exclusion; a healthy endpoint does NOT rescue.
  if (subjRes.resolution.state === 'dangling') {
    return {
      bridge: bridgeName,
      outcome: 'dangling',
      defect: {
        taint: subjRes.resolution.reason === 'temporal-nonoverlap' ? 'L4' : 'L5',
        diagnostic: { code: 'SSM-DANGLING-FK', fieldId: subjectFkCol, reason: subjRes.resolution.reason }
      },
      roleDefects: [],
      capMarkers: []
    };
  }
  if (objRes.resolution.state === 'dangling') {
    return {
      bridge: bridgeName,
      outcome: 'dangling',
      defect: {
        taint: objRes.resolution.reason === 'temporal-nonoverlap' ? 'L4' : 'L5',
        diagnostic: { code: 'SSM-DANGLING-FK', fieldId: objectFkCol, reason: objRes.resolution.reason }
      },
      roleDefects: [],
      capMarkers: []
    };
  }

  if (subjRes.resolution.state === 'absent' || objRes.resolution.state === 'absent') {
    return { bridge: bridgeName, outcome: 'absent', roleDefects: [], capMarkers: [] };
  }

  // Both endpoints resolved: build the authored owl:Restriction shape.
  const subjectConcept = (dimensions[subjectRefTable] || {})['ssm:entityClass'];
  const objectConcept = (dimensions[objectRefTable] || {})['ssm:entityClass'];

  const restriction = {
    '@type': 'owl:Restriction',
    'fandaws:restrictionKind': 'relationship',
    'fandaws:attachedTo': subjectConcept,
    'owl:onProperty': 'fandaws:objectProperty/has',
    'owl:someValuesFrom': objectConcept,
    'fandaws:promoted': false
  };
  if (verbLabel !== undefined) restriction['fandaws:verbLabel'] = verbLabel;

  // ERS register: same epistemic-status fields as the fact-frame path + per-endpoint versionHandles.
  return {
    bridge: bridgeName,
    outcome: 'resolved',
    restriction,
    roleDefects: [],
    capMarkers: [],
    versionHandles: {
      subject: buildRelVersionHandle(subjRes.winner),
      object: buildRelVersionHandle(objRes.winner)
    }
  };
}

// C1: integrate() -- order-preserving, one result per factRow.
export function integrate({ ssm, factRows, dimsData, query, law, scope, lexis, schema, cism, envelope, bridgeRows, derivedRows }) {
  const factTableKey = Object.keys(ssm['ssm:facts'])[0];
  const results = [];
  const temporalMode = query && query.temporalMode;

  for (const factRow of factRows) {
    if (temporalMode === 'full') {
      const factSpec = ssm['ssm:facts'][factTableKey];
      const recordConcept = factSpec['ssm:recordConcept'];
      const roleAssignments = factSpec['ssm:roleAssignments'] || [];
      const constitutiveRoles = getConstitutiveRoleSet(law, recordConcept, roleAssignments);
      const constitutiveRAs = roleAssignments.filter(ra => constitutiveRoles.has(roleLocal(ra['ssm:role'])));

      let anyAbsent = false;
      let danglingResult = null;
      const fkData = [];

      for (const ra of constitutiveRAs) {
        const fkColumn = ra['ssm:fkColumn'];
        const refTable = ra['ssm:refTable'];
        const fkValue = factRow[fkColumn];
        const candidates = dimsData[refTable] || [];
        const resolution = resolveKeyTemporal({ fkValue, candidates, assertionHorizon: query.assertionHorizon });

        if (resolution.state === 'absent') {
          anyAbsent = true;
          break;
        }
        if (resolution.state === 'dangling') {
          danglingResult = {
            outcome: 'dangling',
            dictionary: null,
            ice: [],
            defect: {
              taint: 'L5',
              diagnostic: { code: 'SSM-DANGLING-FK', fieldId: fkColumn, reason: resolution.reason }
            },
            roleDefects: [], // C1 invariant #3
            capMarkers: []
          };
          break;
        }

        // §5.3: track fkColumn alongside versions so cap can annotate it
        fkData.push({ fkColumn, refTable, candidates, versions: resolution.versions });
      }

      if (danglingResult) {
        results.push(danglingResult);
        continue;
      }

      if (anyAbsent || fkData.length === 0) {
        results.push(runPipeline(ssm, factRow, dimsData, query, factTableKey, law, scope, lexis, schema, cism, envelope));
        continue;
      }

      // §5.3 BOUNDED-AND-MARKED: apply fanoutCap per FK; a resource limit is not a data defect.
      const fanoutCap = query && query.fanoutCap;
      const capMarkersForFact = [];
      for (const fkEntry of fkData) {
        const K = fkEntry.versions.length;
        if (fanoutCap && K > fanoutCap) {
          // Pair each version with its candidate to sort by validFrom
          const withC = fkEntry.versions.map(v => ({
            v,
            c: fkEntry.candidates.find(c => c.id === v.sourceEventId)
          }));
          // Select most-recent N by validInterval.validFrom descending
          withC.sort((a, b) => (b.c.validFrom || '').localeCompare(a.c.validFrom || ''));
          // Re-sort kept N ascending by assertedAt for stable output order
          const kept = withC.slice(0, fanoutCap).sort((a, b) =>
            (a.c.assertedAt || '').localeCompare(b.c.assertedAt || '')
          );
          fkEntry.versions = kept.map(x => x.v);
          capMarkersForFact.push({ fk: fkEntry.fkColumn, cap: fanoutCap, actual: K, axis: 'temporal' });
        }
      }

      const versionLists = fkData.map(({ refTable, candidates, versions }) =>
        versions.map(v => ({
          refTable,
          candidate: candidates.find(c => c.id === v.sourceEventId)
        }))
      );

      const combinations = cartesian(versionLists);

      for (const combo of combinations) {
        const modifiedDimsData = { ...dimsData };
        const comboValidInstant = combo.reduce(
          (max, { candidate }) => (candidate.validFrom > max ? candidate.validFrom : max),
          '0000-01-01'
        );
        // §4.5 per-ROLE (not per-dimension) version resolution: a role-played dim is N independent bindings
        // sharing a target table. Restrict each fanned businessKey to its chosen version, but KEEP the OTHER
        // businessKeys that the other roles (accidental or constitutive) to the SAME dim resolve against --
        // else those roles get FALSE broken-ref roleDefects (the capstone date_dim x3 grain seam).
        const comboByTable = {};
        for (const { refTable, candidate } of combo) { (comboByTable[refTable] ||= []).push(candidate); }
        for (const refTable of Object.keys(comboByTable)) {
          const chosen = comboByTable[refTable];
          const chosenKeys = new Set(chosen.map(c => c.businessKey));
          const others = (dimsData[refTable] || []).filter(c => !chosenKeys.has(c.businessKey));
          modifiedDimsData[refTable] = [...chosen, ...others];
        }
        const modifiedQuery = { ...query, validInstant: comboValidInstant };
        const pipeResult = runPipeline(ssm, factRow, modifiedDimsData, modifiedQuery, factTableKey, law, scope, lexis, schema, cism, envelope);

        // §4.5 VERSION IDENTITY: the version a fact binds is content; each result carries its handle.
        const primaryCandidate = combo[0] && combo[0].candidate;
        const versionHandle = primaryCandidate ? {
          versionKey: primaryCandidate.id,
          validInterval: { validFrom: primaryCandidate.validFrom, validTo: primaryCandidate.validTo },
          entityKey: primaryCandidate.businessKey
        } : undefined;

        results.push({
          ...pipeResult,
          versionHandle,
          capMarkers: capMarkersForFact.length > 0 ? capMarkersForFact : []
        });
      }
      continue;
    }

    // §4.6 POINT MODE: if assertionHorizon is present, use bitemporal pre-resolution
    // to surface the assertion-time face of versionHandle.
    if (query && query.assertionHorizon && query.validInstant) {
      results.push(resolvePointBitemporal(ssm, factRow, dimsData, query, factTableKey, law, scope, lexis, schema, cism, envelope));
      continue;
    }

    results.push(runPipeline(ssm, factRow, dimsData, query, factTableKey, law, scope, lexis, schema, cism, envelope));
  }

  // §4.4: relational path -- order-preserving, one result per bridgeRow.
  const relationships = [];
  if (bridgeRows && bridgeRows.length > 0) {
    const bridges = (ssm && ssm['ssm:bridges']) || {};
    for (const bridgeRow of bridgeRows) {
      const [bridgeName, bridgeDef] = findBridgeForRow(bridges, bridgeRow);
      if (!bridgeName) continue;
      relationships.push(assembleRelationalResult(bridgeName, bridgeDef, bridgeRow, ssm, dimsData, query));
    }
  }

  // §4.4 #3: derived-artifact path -- delegated to the aggregate module (kept a separate file so the loop edits
  // a small file, not this large orchestrator -- the edit-module scaling-wall fix). order-preserving per derivedRow.
  const derivedArtifacts = assembleAggregation({ ssm, derivedRows, dimsData, query, law, scope, lexis, schema, cism, envelope });

  return { results, relationships, derivedArtifacts };
}
