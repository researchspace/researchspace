declare namespace AppStateScssNamespace {
  export interface IAppStateScss {
    bottomLeft: string;
    bottomRight: string;
    container: string;
    saveButton: string;
    savedUrl: string;
    topLeft: string;
    topRight: string;
  }
}

declare const AppStateScssModule: AppStateScssNamespace.IAppStateScss;

export = AppStateScssModule;
