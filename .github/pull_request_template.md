# Why

The semantic-form-tree-picker-input in forms allows to render a dropdown where the user can select terms from a vocabulary (called 'scheme') structured as a tree.

The current version of the semantic-form-tree-picker-input has:
-  'tree-patterns' to specify the scheme details ;
-  'nested-form-template' to displays a button (New) that open a modal where the user can create a new term in the vocabulary.

An update of the Semantic Tree Input is requested for the following actions:

- allow the user to easily open the entire Vocabulary in a new frame;
- allow an easy customisation of the term labels when displayed in the vocabulary list or in the selected term.

# What
```
<semantic-form-tree-picker-input 
   for='type' label="Type" 
   placeholder="Select type"
   close-dropdown-on-selection='false'
   tree-patterns='{"scheme": "http://www.researchspace.org/resource/vocab/types", 
                               "schemePattern": "?item <http://www.cidoc-crm.org/cidoc-crm/P71i_is_listed_in> <http://www.researchspace.org/resource/vocab/types>",
                               "relationPattern": "?item crm:P127_has_broader_term ?parent",
                                 "labelPattern": "?item skos:prefLabel ?label"}'

 scheme-page-button-config='{"iri": "http://www.researchspace.org/resource/ThinkingFrames",
                   "view": "authority-content",
                    "scheme": "http://www.researchspace.org/resource/vocab/types",
                     "tooltip": "Open list of terms"
                                                      }'

 nested-form-template='{{{{raw}}}}
                                            {{> forms:E55_Type nested=true editable=true 
                                                scheme="http://www.researchspace.org/resource/vocab/types"
                                                entityType="type" }}
                                          {{{{/raw}}}}'

 query-item-label='SELECT ?label WHERE {
                                    ?item skos:altLabel ?label .
                                 }'
>
</semantic-form-tree-picker-input> 
```

<img width="723" alt="semantic-tree-input example" src="https://github.com/researchspace/researchspace/assets/25387447/22c296a0-543b-44ec-b6c8-1dbc59fd43ed">




The Semantic Tree Input has been updated with two new features.



# Video / Gif / Screenshot

If there are UI changes, it’s **highly recommended** to include images/videos showcasing what work has been done. 📸

# Meta

Perhaps detail specific files you would like reviewed or discuss some architectural challenges/decisions you
encountered. 🤓

# How To Test

If it’s a non-trivial change to the app, or if you fixed a bug, include detail on how to test the changes in the PR.
Perhaps specify a few test cases to run through. 🧪