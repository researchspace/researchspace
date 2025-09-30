declare namespace TreeScssNamespace {
  export interface ITreeScss {
    activeNode: string;
    leafNode: string;
  }
}

declare const TreeScssModule: TreeScssNamespace.ITreeScss;

export = TreeScssModule;
