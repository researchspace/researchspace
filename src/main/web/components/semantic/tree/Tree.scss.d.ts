declare namespace TreeScssModule {
  export interface ITreeScss {
    activeNode: string;
    leafNode: string;
    tree: string;
    treeNode: string;
  }
}

declare const TreeScssModule: TreeScssModule.ITreeScss;

export = TreeScssModule;
