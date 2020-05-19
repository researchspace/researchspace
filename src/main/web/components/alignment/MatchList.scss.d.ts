declare namespace MatchListScssNamespace {
  export interface IMatchListScss {
    component: string;
    entry: string;
    scrollTo: string;
    unsaved: string;
  }
}

declare const MatchListScssModule: MatchListScssNamespace.IMatchListScss;

export = MatchListScssModule;
