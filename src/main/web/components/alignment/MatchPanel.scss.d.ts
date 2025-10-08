declare namespace MatchPanelScssNamespace {
  export interface IMatchPanelScss {
    alignedTerm: string;
    alignmentNodeRow: string;
    alignmentTree: string;
    alignmentTreeContainer: string;
    baseTerm: string;
    cancelScrollingTo: string;
    component: string;
    componentSpinner: string;
    decorateAlignLeaf: string;
    decorateAlignParent: string;
    decorateHighlightLeaf: string;
    decorateHighlightParent: string;
    decoratedNodeBody: string;
    draggableHandle: string;
    draggableWrapper: string;
    findAlignedButton: string;
    nodeInfoButton: string;
    nodeInfoPopup: string;
    scrollNotification: string;
    scrollSpinner: string;
    scrollToName: string;
    unalignButton: string;
  }
}

declare const MatchPanelScssModule: MatchPanelScssNamespace.IMatchPanelScss;

export = MatchPanelScssModule;
