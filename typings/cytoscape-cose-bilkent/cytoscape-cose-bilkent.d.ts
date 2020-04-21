///<reference path='../cytoscape/cytoscape.d.ts' />

declare module CyCoseBilkent {
  interface CoseBilkentStatic {
    (cy: Cy.Static): void;
  }
}

declare module 'cytoscape-cose-bilkent' {
  const coseBilkent: CyCoseBilkent.CoseBilkentStatic;
  export = coseBilkent;
}
