declare namespace ConfigDocComponentScssNamespace {
  export interface IConfigDocComponentScss {
    file: string;
    mappings: string;
    names: string;
    sources: string;
    sourcesContent: string;
    version: string;
  }
}

declare const ConfigDocComponentScssModule: ConfigDocComponentScssNamespace.IConfigDocComponentScss;

export = ConfigDocComponentScssModule;
