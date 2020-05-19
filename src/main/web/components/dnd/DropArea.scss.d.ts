declare namespace DropAreaScssNamespace {
  export interface IDropAreaScss {
    alwaysVisible: string;
    children: string;
    dropArea: string;
    dropMessage: string;
    messageWrapper: string;
  }
}

declare const DropAreaScssModule: DropAreaScssNamespace.IDropAreaScss;

export = DropAreaScssModule;
