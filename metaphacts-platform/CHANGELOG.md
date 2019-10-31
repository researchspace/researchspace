# Change Log

## [Unreleased]
### Added
- support for `target='_blank'` property in `semantic-link` and `semantic-link-container` to open them in the new window.
- `openLinksInNewWindow` property in `semantic-graph` to open links in the new window.
- initial support for user preferred language.
- support for property paths and sparql patterns in `preferredLabels` and `preferredThumbnails` UI configuration options.
- all mp-ldp-**-action components are now listening to semantic-context. Default repository for actions is still assets repository.

### Changed
- **Breaking** add special <mp-code-block> component that should be used instead of <pre><code></code></pre> pattern for code block highlighting in the documentation.
- **Breaking** ID-472. Change default start page from Help:Start to :Start.
- **Breaking** Moved component persistence vocabulary from `http://www.metaphacts.com/ontology/` to `http://www.metaphacts.com/ontologies/persist/`.
- **Breaking** ID-501. semantic-graph-extension-expand-collapse. Collapsed node selector changed from `[expanded-collapsed = 'collapsed']` to `node.cy-expand-collapse-collapsed-node`, meta edge selector changed from `edge.meta` to `cy-expand-collapse-meta-edge`.
- **Breaking** ID-547. Changed `mp-field-visualization` to return for the field value an nested object with value (rdf node), label (string) as well as the original binding with of the selectPattern. Previously returned only the value as rdf node.
- **Breaking** ID-21. Modified SPARQL ACLs to depend on the target repository, i.e., `sparql:{repositoryId}:query:select` instead of `sparql:query:select`. Now by default the guest user has SPARQL query access only to the `default` and `assets` repository, not to all managed repositories as used to be before.   

### Removed
- **Breaking** ID-423. Remove pre-configured guest user.

## [2.1.1]
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
- **Breaking** explore actions in the page toolbar (Ontodia View, Graph View and Table View) are shown only if user has `ui:page:view:toolbar:explore` permission and there is an actual RDF resource that corresponds to the current page.

### Removed

- `mp-burger-sidebar` component. `mp-splitpane` is more flexible and lightweight alternative that should be used instead. [378ed93](./commits/378ed93f5f2579aa2ac459e62a7ca006470103a8)
- **Breakings** Aliases for form components (`plain-text-input`, `autocomplete-input`, `datetimepicker-text-input`, `field-description`
and `field-label`), use `semantic-form-*` components instead (`semantic-form-text-input`, `semantic-form-select-input`, `semantic-form-autocomplete-input`,
`semantic-form-datetime-input`, `semantic-form-field-description` and `semantic-form-field-label`).
- **Breakings** Special `$parent` variable to access parent scope inside client-side templates. Instead it's now possible to directly use passed to template partial arguments.
