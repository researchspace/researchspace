declare namespace ToolbarScssModule {
  export interface IToolbarScss {
    component: string;
    group: string;
    languageSelector: string;
    saveButton: string;
  }
}

declare const ToolbarScssModule: ToolbarScssModule.IToolbarScss;

export = ToolbarScssModule;
