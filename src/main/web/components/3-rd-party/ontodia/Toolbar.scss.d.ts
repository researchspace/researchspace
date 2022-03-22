declare namespace ToolbarScssNamespace {
  export interface IToolbarScss {
    buttonsContainer: string;
    component: string;
    groupButtons: string;
    languageSelector: string;
  }
}

declare const ToolbarScssModule: ToolbarScssNamespace.IToolbarScss;

export = ToolbarScssModule;
