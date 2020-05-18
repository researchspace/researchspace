declare namespace SearchSummaryScssNamespace {
  export interface ISearchSummaryScss {
    Resource: string;
    Text: string;
    domain: string;
    relation: string;
    resource: string;
    separator: string;
    start: string;
    text: string;
    word: string;
  }
}

declare const SearchSummaryScssModule: SearchSummaryScssNamespace.ISearchSummaryScss;

export = SearchSummaryScssModule;
