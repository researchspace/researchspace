declare namespace QueryBuilderScssNamespace {
  export interface IQueryBuilderScss {
    actionableItem: string;
    activeTerm: string;
    addConjunctButton: string;
    addDisjunctButton: string;
    andSeparator: string;
    categorySelectionItem: string;
    domainSelection: string;
    editButton: string;
    guideHolder: string;
    guideLinks: string;
    guidePanel: string;
    hierarchySelector: string;
    itemHolder: string;
    magnifierIcon: string;
    mapSelectionButton: string;
    nestedSearchButton: string;
    nestedSearchHolder: string;
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
