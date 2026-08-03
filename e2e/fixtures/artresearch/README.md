# ArtResearch semantic-search fixture

This fixture is a deterministic CIDOC-CRM snapshot of 20 resources selected
from `https://dev.artresearch.net/sparql`. It covers recognizable works,
repeated facet values, missing production dates, BCE ranges, a zero-width
range, and one-sided ranges.

The selection is stored in `selected-works.tsv`. Extraction uses the preserved
`queries/construct-resource.rq` query for one explicit resource and predicate
at a time, and retains a bounded CIDOC-CRM graph in the shipped
`src/main/webapp/samples/sample-search.ttl` help sample.

ArtResearch labels are represented with
`crm:P1_is_identified_by/crm:P190_has_symbolic_content`. The extractor does not
invent or depend on `rdfs:label`, SKOS labels, Pharos templates, or ArtResearch
custom label predicates. It preserves the source appellation types and adds the
ResearchSpace `primary_appellation` type to one deterministic appellation for
each labelled resource so the platform's standard label configuration applies.
Preferred thumbnails retain the same
`custom:work_preferred_photo/custom:thumbnail_url` path used by the ArtResearch
card templates.

## Regenerate or extend

1. Add and validate work IRIs in `selected-works.tsv`.
2. From `e2e/`, run `npm run fixtures:artresearch`.
3. Review the generated sample diff and the extractor's validation output.

The endpoint can be overridden when extracting from a local or direct QLever
instance:

```bash
ARTRESEARCH_SPARQL_ENDPOINT=http://localhost:7051 npm run fixtures:artresearch
```

The sample uses the N-Triples subset of Turtle so chunks can be merged,
deduplicated, and sorted deterministically without changing source IRIs or
literals.
