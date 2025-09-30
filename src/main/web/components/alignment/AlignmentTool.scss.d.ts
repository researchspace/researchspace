declare namespace AlignmentToolScssNamespace {
  export interface IAlignmentToolScss {
    component: string;
    controlHolder: string;
    controlList: string;
    controlPanel: string;
    controlToolbar: string;
    leftPanel: string;
    rightPanel: string;
    swapTerminologies: string;
    targetHolder: string;
  }
}

declare const AlignmentToolScssModule: AlignmentToolScssNamespace.IAlignmentToolScss;

export = AlignmentToolScssModule;
