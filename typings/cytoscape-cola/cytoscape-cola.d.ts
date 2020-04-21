///<reference path='../cytoscape/cytoscape.d.ts' />
///<reference path='../webcola/webcola.d.ts' />

declare module CyCola {
  interface CyColaStatic {
    (cy: Cy.Static, cola: Cola.ColaStatic): void;
  }
}

declare module 'cytoscape-cola' {
  const cycola: CyCola.CyColaStatic;
  export = cycola;
}
