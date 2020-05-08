declare namespace AlignmentToolScssModule {
  export interface IAlignmentToolScss {
    component: string;
    controlHolder: string;
    controlList: string;
    controlPanel: string;
    controlToolbar: string;
    leftPanel: string;
    rightPanel: string;
    sourcePanel: string;
    swapTerminologies: string;
    targetHolder: string;
    targetPanel: string;
  }
}

declare const AlignmentToolScssModule: AlignmentToolScssModule.IAlignmentToolScss;

export = AlignmentToolScssModule;
