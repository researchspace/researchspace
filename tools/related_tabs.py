"""Generate the tabbed related-resources block used in ResourceContent templates.

Usage (from the repository root):
    python3 -c "import sys; sys.path.insert(0, 'tools'); from related_tabs import *; print(related_tabs('research-outputs', RESEARCH))"
and paste the output over the block that starts with the "Related ... as tabs" comment in
src/main/resources/.../ResourceContent.html (or an app override). Apps add categories by
extending the list passed in: (configuration IRI, label, icon, pattern relating ?subject to
the resource, noun for the empty state).
"""
IRI = '[[> iri]]'

def related_tabs(group_id, categories, heading_noun='research outputs'):
    """categories: list of (config IRI, label, icon, restriction pattern, empty-noun)."""
    branches = []
    for n, (config, label, icon, pattern, noun) in enumerate(categories):
        branches.append('''                                     {
                                       VALUES ?config { <%(cfg)s> }
                                       {{#if (getResourceConfigurationValue "%(cfg)s" "resourceOntologyClass")}}
                                       { SELECT (COUNT(DISTINCT ?subject) AS ?count) WHERE {
                                           ?subject a <{{getResourceConfigurationValue "%(cfg)s" "resourceOntologyClass"}}> .
                                           {{#if (getResourceConfigurationValue "%(cfg)s" "p2HasType")}}?subject crm:P2_has_type <{{getResourceConfigurationValue "%(cfg)s" "p2HasType"}}> .{{/if}}
                                           %(pat)s
                                       } }
                                       {{else}}
                                       BIND(0 AS ?count)
                                       {{/if}}
                                     }''' % {'cfg': config, 'pat': pattern})
    values = '\n'.join('                                     (<%s> "%s" "%s" "%s" "%s" %d)' % (c, l, i, p, noun, n + 1)
                       for n, (c, l, i, p, noun) in enumerate(categories))
    return '''            [[!-- Related %(noun)s as tabs (rs-tabs mount-on-enter): ONE query counts every
                  category, each tab shows its count, and a category's search page is
                  mounted the first time its tab is opened and kept afterwards. The first
                  category with results opens by default. To add a category, add one VALUES
                  row (configuration IRI, label, icon, pattern relating ?subject to this
                  resource, noun for the empty state) and one matching count branch. Each
                  branch binds ?config itself and always yields one ?count row (COUNT over
                  no matches is 0), so the join needs no OPTIONAL and no FILTER on an outer
                  variable - Blazegraph does not evaluate the latter and returned no counts. --]]
            <semantic-query query='SELECT ?config ?label ?icon ?restriction ?noun ?count WHERE {
                                     VALUES (?config ?label ?icon ?restriction ?noun ?order) {
%(values)s
                                     }
                                     {
%(branches)s
                                     }
                                   } ORDER BY ?order'
                            template='{{> relatedTabs}}'
                            no-result-template='<div class="muted">No related %(noun)s configured.</div>'>
              <template id='relatedTabs'>
                {{#bind defaultKey=(findFirst bindings "count.value" ">" 0 "config.value")}}
                <rs-tabs id='%(iri)s-%(group)s-tabs' class="rs-secondary-tabs rs-related-tabs" mount-on-enter="true"
                         default-active-key='{{#if defaultKey}}{{defaultKey}}{{else}}{{bindings.0.config.value}}{{/if}}'>
                  {{#each bindings}}
                    <rs-tab event-key='{{config.value}}' title='{{label.value}}' icon='{{icon.value}}' icon-type="outlined" symbol="true"
                            badge='{{#if count.value}}{{count.value}}{{else}}0{{/if}}'
                            muted='{{#ifCond count.value ">" 0}}false{{else}}true{{/ifCond}}'>
                      {{#ifCond count.value ">" 0}}
                        {{#bind config=config.value parentNode="%(iri)s" searchRestrictions=restriction.value}}
                          <div class='search-page-container'>
                            [[> rsp:ResourceSearchContent config='{{config}}' parentNode='{{parentNode}}' searchRestrictions='{{searchRestrictions}}']]
                          </div>
                        {{/bind}}
                      {{else}}
                        <div class="rs-related-tabs__empty">
                          <span class="muted">No {{noun.value}} {{#if (eq icon.value "account_tree")}}include{{else}}are linked to{{/if}} this resource yet.</span>
                          <semantic-link-container uri='http://www.researchspace.org/resource/ThinkingFrames'
                                                   urlqueryparam-view='resource-editor'
                                                   urlqueryparam-entity-type-config='{{config.value}}'
                                                   urlqueryparam-mode='new'>
                            <button type="button" class="btn btn-default btn-textAndIcon">
                              <rs-icon icon-type="rounded" icon-name="add" symbol="true"></rs-icon>
                              <span>New {{getResourceConfigurationValue config.value "resourceLabel"}}</span>
                            </button>
                          </semantic-link-container>
                        </div>
                      {{/ifCond}}
                    </rs-tab>
                  {{/each}}
                </rs-tabs>
                {{/bind}}
              </template>
            </semantic-query>
''' % {'values': values, 'branches': '\n                                     UNION\n'.join(branches), 'iri': IRI,
       'group': group_id, 'noun': heading_noun}


RESEARCH = [
    ('http://www.researchspace.org/resource/system/resource_configurations_container/data/Knowledge_map', 'Knowledge maps', 'account_tree',
     '?subject ontodia:layoutData/ontodia:hasElement/ontodia:resource <%s> .' % IRI, 'knowledge maps'),
    ('http://www.researchspace.org/resource/system/resource_configurations_container/data/Semantic_narrative', 'Semantic narratives', 'description',
     '?subject crm:P67_refers_to <%s> .' % IRI, 'semantic narratives'),
    ('http://www.researchspace.org/resource/system/resource_configurations_container/data/Set', 'Sets', 'topic',
     '?subject <http://www.w3.org/ns/ldp#contains>/<http://www.researchspace.org/resource/system/setItem> <%s> .' % IRI, 'sets'),
]
