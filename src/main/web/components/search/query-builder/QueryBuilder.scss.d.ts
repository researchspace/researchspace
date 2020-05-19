declare namespace QueryBuilderScssNamespace {
  export interface IQueryBuilderScss {
    actionableItem: string;
    active: string;
    activeTerm: string;
    addConjunctButton: string;
    addDisjunctButton: string;
    andSeparator: string;
    badge: string;
    categorySelectionItem: string;
    disabled: string;
    domainSelection: string;
    'dropdown-toggle': string;
    dropdownToggle: string;
    editButton: string;
    focus: string;
    guideHolder: string;
    guideLinks: string;
    guidePanel: string;
    hierarchySelector: string;
    itemHolder: string;
    magnifierIcon: string;
    mapSelectionButton: string;
    nestedSearchButton: string;
    nestedSearchHolder: string;
    open: string;
    panelHeader: string;
    rangeSelection: string;
    relationPlaceholder: string;
    relationSelector: string;
    removeConjunctButton: string;
    resourceSelector: string;
    searchArea: string;
    searchAreaHolder: string;
    searchBasedTermSelector: string;
    searchBasedTermSelectorHolder: string;
    searchBasedTermSelectorLabel: string;
    searchClause: string;
    searchClauseArea: string;
    searchClauseHolder: string;
    searchCollapse: string;
    searchCollapseExpand: string;
    searchExpand: string;
    searchSummaryHolder: string;
    selectedDomain: string;
    selectedItem: string;
    selectedRange: string;
    selectedRelation: string;
    selectedTerm: string;
    whereSeparator: string;
  }
}

declare const QueryBuilderScssModule: QueryBuilderScssNamespace.IQueryBuilderScss;

export = QueryBuilderScssModule;
