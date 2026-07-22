# ArtResearch semantic-search fixture

This fixture is a deterministic CIDOC-CRM snapshot of 20 resources selected
from `https://dev.artresearch.net/sparql`. It covers recognizable works,
repeated facet values, missing production dates, BCE ranges, a zero-width
range, and one-sided ranges.

The selection is stored in `selected-works.tsv`. Extraction uses the preserved
`queries/construct-resource.rq` query for one explicit resource and predicate
at a time, and retains a bounded CIDOC-CRM graph in
`artresearch-semantic-search.nt`.

ArtResearch labels are represented with
`crm:P1_is_identified_by/crm:P190_has_symbolic_content`. The extractor does not
invent or depend on `rdfs:label`, SKOS labels, Pharos templates, or ArtResearch
custom predicates.

## Regenerate or extend

1. Add and validate work IRIs in `selected-works.tsv`.
2. From `e2e/`, run `npm run fixtures:artresearch`.
3. Review the generated N-Triples diff and the extractor's validation output.

The endpoint can be overridden when extracting from a local or direct QLever
instance:

```bash
ARTRESEARCH_SPARQL_ENDPOINT=http://localhost:7051 npm run fixtures:artresearch
```

The fixture is generated as N-Triples so chunks can be merged, deduplicated,
and sorted deterministically without changing the source IRIs or literals.
