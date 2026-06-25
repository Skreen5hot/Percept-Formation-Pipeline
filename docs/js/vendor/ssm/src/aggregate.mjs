// C-aggregation (Epic §4.4 #3): the derived-artifact two-frame assembly, kept in its OWN small module so the
// loop edits a small file (the edit-module scaling-wall fix -- integrate.mjs delegates here via the seam).
import { adjudicate } from '../../oce/src/adjudicate.mjs';
import { emit } from '../../fsdd/src/emit.mjs';
import { resolveKey } from './krs.mjs';

export function assembleAggregation({ ssm, derivedRows, dimsData, query, law, schema, cism, envelope } = {}) {
  if (!derivedRows || derivedRows.length === 0) return [];

  const facts = ssm?.['ssm:facts'] ?? {};
  const factKey = Object.keys(facts).find(k => facts[k]['ssm:frameKind'] === 'ssm:DerivedInformationArtifact');
  if (!factKey) return [];
  const factDef = facts[factKey];

  const valueColumn = factDef['ssm:valueColumn'];
  const isAboutRole = factDef['ssm:isAboutRole'];
  const producedBy = factDef['ssm:producedBy'];

  const fkColumn = isAboutRole['ssm:fkColumn'];
  const refTable = isAboutRole['ssm:refTable'];
  const candidates = (dimsData ?? {})[refTable] ?? [];

  const validInstant = query?.validInstant ?? query?.['ssm:validInstant'];
  const assertionHorizon = query?.assertionHorizon ?? query?.['ssm:assertionHorizon'];

  const hasProducedBy = producedBy != null;

  const aggOver = producedBy?.aggregatesOver ?? producedBy?.['ssm:aggregatesOver'];
  const inputTable = aggOver?.inputTable ?? aggOver?.['ssm:inputTable'];
  const collectionClass = aggOver?.collectionClass ?? aggOver?.['ssm:collectionClass'];
  const functionClass = producedBy?.functionClass ?? producedBy?.['ssm:functionClass'];
  const fnValue = producedBy?.function ?? producedBy?.['ssm:function'];
  const windowValue = producedBy?.window ?? producedBy?.['ssm:window'];
  const computedBy = producedBy?.computedBy ?? producedBy?.['ssm:computedBy'];

  // witnessed: the input collection's table is present in dimsData (deep case; absent/typed-ICE is sibling unit)
  const inputRows = inputTable != null ? (dimsData ?? {})[inputTable] : undefined;
  const witnessed = inputRows !== undefined;

  return derivedRows.map((row, idx) => {
    const actId = `agg:act-${factKey}-${idx}`;
    const artifactId = `agg:artifact-${factKey}-${idx}`;

    // Resolve isAbout FK (constitutive role on artifact) via the same C1 machinery as the fact path
    const fkValue = row[fkColumn] ?? null;
    const resolution = resolveKey({ fkValue, candidates, validInstant, assertionHorizon });

    // COMPUTED-VS-OBSERVED: when producedBy is absent, no act can be constructed; artifact is derived-but-incomplete
    if (!hasProducedBy) {
      if (resolution.state === 'dangling') {
        return {
          fact: row,
          artifact: {
            id: artifactId,
            recordConcept: 'fan:DerivedInformationArtifact',
            outcome: 'dangling',
            defect: {
              taint: 'dangling',
              diagnostic: `isAbout FK '${fkValue}' is dangling (${resolution.reason})`,
            },
            ice: [],
            roleDefects: [],
            capMarkers: [],
          },
        };
      }

      // Build artifact proposal WITHOUT isOutputOf (leave constitutive role empty)
      const artifactProposalNoAct = {
        recordConcept: 'fan:DerivedInformationArtifact',
        roleBindings: [
          { fieldId: 'hasValue', role: 'hasValue', relatumConcept: 'agg:Quality' },
          { fieldId: 'isAbout',  role: 'isAbout',  relatumConcept: 'agg:Region' },
        ],
      };
      const artJudgmentNoAct = adjudicate({ law, proposal: artifactProposalNoAct, percept: {} });
      const artEmNoAct = emit({ schema, cism, binding: artifactProposalNoAct, judgment: artJudgmentNoAct, envelope });

      // OCE marks isOutputOf empty -> ICE about fan:ActOfAggregation in dictionary['fsdd:hasImplicitEntity']
      const dictIce = artEmNoAct.dictionary?.['fsdd:hasImplicitEntity'];
      const artifactIce = Array.isArray(dictIce) && dictIce.length > 0
        ? dictIce
        : [{
            '@type': ['fsdd:ImplicitEntityRecord'],
            'fsdd:concernsType': { '@id': 'fan:ActOfAggregation' },
            'fsdd:status': 'unwitnessed',
            'fsdd:perceptGrounded': false,
          }];

      return {
        fact: row,
        artifact: {
          id: artifactId,
          recordConcept: 'fan:DerivedInformationArtifact',
          outcome: 'absent',
          ice: artifactIce,
          defect: null,
          roleDefects: [],
          capMarkers: [],
          'fan:hasValue': row[valueColumn],
          isAbout: resolution,
        },
      };
    }

    // ACT frame (producedBy present): all four constitutive roles from producedBy metadata (never FK-resolved)
    const actIce = [];
    let aggregatesOverValue;
    if (witnessed) {
      aggregatesOverValue = { witnessed: true, collectionClass };
    } else {
      // SHALLOW: input rows absent -> typed-ICE for the collection (asserted, members unwitnessed); role NOT dropped
      aggregatesOverValue = { witnessed: false, collectionClass };
      actIce.push({
        '@type': ['fsdd:ImplicitEntityRecord'],
        'fsdd:concernsType': { '@id': collectionClass },
        'fsdd:status': 'members-unwitnessed',
        'fsdd:perceptGrounded': false,
      });
    }

    const actProposal = {
      recordConcept: 'fan:ActOfAggregation',
      roleBindings: [
        { fieldId: 'aggregatesOver',         role: 'aggregatesOver',         relatumConcept: collectionClass },
        { fieldId: 'aggregationOccupies',    role: 'aggregationOccupies',    relatumConcept: 'agg:Time' },
        { fieldId: 'hasAggregationFunction', role: 'hasAggregationFunction', relatumConcept: functionClass },
        { fieldId: 'producesArtifact',       role: 'producesArtifact',       relatumConcept: 'fan:DerivedInformationArtifact' },
      ],
    };
    const actJudgment = adjudicate({ law, proposal: actProposal, percept: {} });
    const actEm = emit({ schema, cism, binding: actProposal, judgment: actJudgment, envelope });

    const act = {
      id: actId,
      recordConcept: 'fan:ActOfAggregation',
      outcome: 'resolved',
      dictionary: actEm.dictionary,
      ice: actIce,
      defect: null,
      roleDefects: [],
      capMarkers: [],
      aggregatesOver: aggregatesOverValue,
      'fan:hasAggregationFunction': fnValue,
      'fan:aggregationOccupies': windowValue,
      producesArtifact: artifactId,
      ...(computedBy != null ? { 'fan:aggregationHasAgent': computedBy } : {}),
    };

    // ARTIFACT frame: C1 modality -- constitutive dangling -> whole-frame exclusion, no dictionary
    if (resolution.state === 'dangling') {
      return {
        fact: row,
        artifact: {
          id: artifactId,
          recordConcept: 'fan:DerivedInformationArtifact',
          outcome: 'dangling',
          defect: {
            taint: 'dangling',
            diagnostic: `isAbout FK '${fkValue}' is dangling (${resolution.reason})`,
          },
          ice: [],
          roleDefects: [],
          capMarkers: [],
          isOutputOf: actId,
        },
        act,
      };
    }

    const artifactProposal = {
      recordConcept: 'fan:DerivedInformationArtifact',
      roleBindings: [
        { fieldId: 'hasValue',   role: 'hasValue',   relatumConcept: 'agg:Quality' },
        { fieldId: 'isAbout',    role: 'isAbout',    relatumConcept: 'agg:Region' },
        { fieldId: 'isOutputOf', role: 'isOutputOf', relatumConcept: 'fan:ActOfAggregation' },
      ],
    };
    const artJudgment = adjudicate({ law, proposal: artifactProposal, percept: {} });
    const artEm = emit({ schema, cism, binding: artifactProposal, judgment: artJudgment, envelope });

    return {
      fact: row,
      artifact: {
        id: artifactId,
        recordConcept: 'fan:DerivedInformationArtifact',
        outcome: 'resolved',
        dictionary: artEm.dictionary,
        ice: [],
        defect: null,
        roleDefects: [],
        capMarkers: [],
        'fan:hasValue': row[valueColumn],
        isAbout: resolution,
        isOutputOf: actId,
      },
      act,
    };
  });
}
