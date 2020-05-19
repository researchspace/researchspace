declare namespace AssertionComponentScssNamespace {
  export interface IAssertionComponentScss {
    beliefCell: string;
    beliefTitle: string;
    body: string;
    canonical: string;
    dot: string;
    dotCell: string;
    hasArgument: string;
    item: string;
    label: string;
    notCanonical: string;
    note: string;
    noteDot: string;
    row: string;
    valueCell: string;
  }
}

declare const AssertionComponentScssModule: AssertionComponentScssNamespace.IAssertionComponentScss;

export = AssertionComponentScssModule;
