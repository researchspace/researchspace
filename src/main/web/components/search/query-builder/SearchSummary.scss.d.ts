declare namespace SearchSummaryScssModule {
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

declare const SearchSummaryScssModule: SearchSummaryScssModule.ISearchSummaryScss;

export = SearchSummaryScssModule;
