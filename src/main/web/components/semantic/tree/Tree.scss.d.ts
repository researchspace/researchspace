declare namespace TreeScssNamespace {
  export interface ITreeScss {
    activeNode: string;
    leafNode: string;
    tree: string;
    treeNode: string;
  }
}

declare const TreeScssModule: TreeScssNamespace.ITreeScss;

export = TreeScssModule;
