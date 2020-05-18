declare namespace SparqlQueryEditorScssNamespace {
  export interface ISparqlQueryEditorScss {
    controls: string;
    repositorySelector: string;
    repositorySelectorDropdown: string;
    sparqlQueryEditor: string;
  }
}

declare const SparqlQueryEditorScssModule: SparqlQueryEditorScssNamespace.ISparqlQueryEditorScss;

export = SparqlQueryEditorScssModule;
