declare namespace ToolbarScssNamespace {
  export interface IToolbarScss {
    component: string;
    group: string;
    groupButtons: string;
    languageSelector: string;
  }
}

declare const ToolbarScssModule: ToolbarScssNamespace.IToolbarScss;

export = ToolbarScssModule;
