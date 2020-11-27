declare namespace ToolbarScssNamespace {
  export interface IToolbarScss {
    component: string;
    group: string;
    groupButtons: string;
    groupSave: string;
    languageSelector: string;
    saveButton: string;
  }
}

declare const ToolbarScssModule: ToolbarScssNamespace.IToolbarScss;

export = ToolbarScssModule;
