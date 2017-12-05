///<reference path='../cytoscape/cytoscape.d.ts' />

declare module Cy {
  interface Instance {
    navigator(opts: Cy.Navigator.Options): Cy.Navigator.Instance;
  }

  /**
   * @see https://github.com/cytoscape/cytoscape.js-navigator
   */
  module Navigator {
    interface Static {
      (cy: Cy.Static, jquery: JQueryStatic): void;
    }

    interface Instance {
      destroy(): void;
    }

    interface Options {
      /**
       * Container to put navigator into.
       *
       * @default false
       */
      container?: boolean | HTMLElement | JQuery;

      /**
       * Set false to update graph pan only on drag end; set 0 to do it instantly;
       * set a number (frames per second) to update not more than N times per second
       *
       * @default 0
       */
      viewLiveFramerate?: boolean | number;

      /**
       * Max thumbnail's updates per second triggered by graph updates.
       *
       * @default 30
       */
      thumbnailEventFramerate?: number;

      /**
       * Max thumbnail's updates per second. Set false to disable.
       *
       * @default false
       */
      thumbnailLiveFramerate?: boolean | number;

      /**
       * Double-click delay in milliseconds.
       *
       * @default 200
       */
      dblClickDelay?: number;

      /**
       * Destroy the container specified by user on plugin destroy.
       *
       * @default: true
       */
      removeCustomContainer?: boolean;

      /**
       * ms to throttle rerender updates to the panzoom for performance.
       *
       * @default 100
       */
      rerenderDelay?: number;
    }
  }
}

declare module 'cytoscape-navigator' {
  const cytoscapeNavigator: Cy.Navigator.Static;
  export = cytoscapeNavigator;
}
