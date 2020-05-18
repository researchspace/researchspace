declare namespace ToolbarScssNamespace {
  export interface IToolbarScss {
    component: string;
    group: string;
    languageSelector: string;
    saveButton: string;
  }
}

declare const ToolbarScssModule: ToolbarScssNamespace.IToolbarScss;

export = ToolbarScssModule;
