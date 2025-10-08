declare namespace LazyTreeScssNamespace {
  export interface ILazyTreeScss {
    alignedTerm: string;
    alignmentNodeRow: string;
    alignmentTree: string;
    alignmentTreeContainer: string;
    baseTerm: string;
    cancelScrollingTo: string;
    component: string;
    componentSpinner: string;
    decorateHighlightLeaf: string;
    decorateHighlightParent: string;
    decoratedNodeBody: string;
    findAlignedButton: string;
    nodeInfoButton: string;
    nodeInfoPopup: string;
    scrollNotification: string;
    scrollSpinner: string;
    scrollToName: string;
    unalignButton: string;
  }
}

declare const LazyTreeScssModule: LazyTreeScssNamespace.ILazyTreeScss;

export = LazyTreeScssModule;
