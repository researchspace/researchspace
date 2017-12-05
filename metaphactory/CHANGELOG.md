# Change Log

## [Unreleased]
### Added
- added a custom implementation of the Federation SAIL (com.metaphacts.repository.federation.MpFederation),
  with generic wrappers to include custom services as SPARQL 1.1 federation members.

- HEAD request on /rdf-graph-store API.
- Ability to specify the repository in all /rdf-graph-store calls.
- Documentation Help:GraphStoreAPI for the /rdf-graph-store API including CURL examples.
- Ability to specify default autosuggestion query in the `semantic-search` resource selector, which is executed when component gets focus, without requiring user to type something in the input field.
- Form nesting via `semantic-form-composite-input` or using `semantic-form` as a child of `semantic-form-autocomplete-input`.
- Form subject URI customization through `new-subject-template` attribute of `semantic-form` and `semantic-form-composite-input`.
- Ability to serialize nested components with children, props, templates and semantic context to RDF and restore back
using `mp-component-toolbar`, `mp-component-toolbar-action-save` and `mp-persisted-component`.

### Changed

- **Breakings** POST on /rdf-graph-store API on existing graph will result in a merge of statements and not return a 409 conflict code any longer. Furthermore, if no graph is specified in POST request, the backend will generate a random graph URI identifier and return it via location header. Previously, statements have been added to default graph.
- **Breakings** `semantic-search`. `categories` and `relations` configuration properties now require that category/relation IRI is enclosed in `<>`, so the configuration is consistent with similar mappings in the `semantic-search-facet`.
- **Breakings** always save form fields to assets repository
- Update `Help:SemanticSearch` page with full documentation for `semantic-search`, `semantic-search-facet` and `semantic-search-query-builder`.
- **Breaking** `semantic-query`, `semantic-table`. Template should have only single root DOM element.
- **Breaking** `semantic-form` property `browser-persistence` is set to `false` by default.
- **Breaking** Moved component persistence vocabulary from `http://www.metaphacts.com/ontology/` to `http://www.metaphacts.com/ontologies/persist/`.

### Removed

- `mp-burger-sidebar` component. `mp-splitpane` is more flexible and lightweight alternative that should be used instead. [378ed93](./commits/378ed93f5f2579aa2ac459e62a7ca006470103a8)
- **Breakings** Aliases for form components (`plain-text-input`, `autocomplete-input`, `datetimepicker-text-input`, `field-description`
and `field-label`), use `semantic-form-*` components instead (`semantic-form-text-input`, `semantic-form-select-input`, `semantic-form-autocomplete-input`,
`semantic-form-datetime-input`, `semantic-form-field-description` and `semantic-form-field-label`).
- **Breakings** Special `$parent` variable to access parent scope inside client-side templates. Instead it's now possible to directly use passed to template partial arguments.
