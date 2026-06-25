# Work item: standards-pure projection drops fields (needs CSVW dual-encoding)

**Status:** open. **Filed:** 2026-06-25. **Severity:** known limitation, marked in the UI (not silently broken).

## What

The FSDD "standards-pure" download (`dictionary-standards-pure.jsonld`) currently contains only the
envelope (`@context`, `dcterms:title`, `prov:wasAttributedTo`) -- **no fields**. `stripToStandards`
(`docs/js/vendor/fsdd/src/standardsPure.mjs`) strips every key matching `/^(fsdd|sas|viz):/`, which
includes `fsdd:hasField` itself and every `fsdd:`-prefixed field property. The fields are only encoded
in `fsdd:` vocabulary; they are not **dual-encoded** in standard W3C vocab (`csvw:column`, etc.), so
the strip removes them entirely.

## Scope

**Pre-existing and general -- affects BOTH the raw-bytes path and the structured-source (star) path.**
This is NOT a star-path regression; the raw samples' standards-pure download is equally envelope-only.
It was discovered while content-reviewing the star path's output (2026-06-25), but it predates that work.

Deliberately scoped OUT of the star-path provenance fix (which fixed F1/F2/F3: structured-source taint
provenance, the qualified-fieldId join, accidental-role visibility) to keep that change to one
unproven thing. Bundling a general CSVW dual-encoding feature would have entangled scopes.

## Honest interim state

The standards-pure download button is labelled **"envelope only -- fields not yet dual-encoded in CSVW"**
so it does not silently present as a complete standards representation.

## The fix (when scheduled)

Dual-encode each `fsdd:DataField` record in standard vocab (a `csvw:Column` with `csvw:name`,
`csvw:datatype`, and SKOS/QUDT/PROV for semantic type / units / provenance) so `stripToStandards`
retains a meaningful, standards-only field representation. Affects the shared FSDD `emit` field
construction + `standardsPure`; needs its own raw-path byte-identical re-verification (the raw path's
standards-pure output changes from empty to populated, which is the intended improvement).
