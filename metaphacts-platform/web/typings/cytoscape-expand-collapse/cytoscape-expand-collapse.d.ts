///<reference path='../cytoscape/cytoscape.d.ts' />

declare module Cy {
  interface Instance {
    expandCollapse(options: ExpandCollapse.Options): ExpandCollapse.Instance;
  }

  module ExpandCollapse {
    interface Static {
      (cy: Cy.Static, jquery: JQueryStatic): void;
    }

    interface Options {
      /**
       * for rearrange after expand/collapse.
       * It's just layout options or whole layout function. Choose your side!
       *
       * @default null
       */
      layoutBy?: any;


      /**
       * whether to perform fisheye view after expand/collapse you can specify a function too
       *
       * @default true
       */
      fisheye?: boolean;

      /**
       * whether to animate on drawing changes you can specify a function too
       */
      animate?: boolean | Function;

      /**
       * callback when expand/collapse initialized
       */
      ready?: Function;

      /**
       * and if undoRedoExtension exists
       *
       * @default true
       */
      undoable?: boolean;

      /**
       * Whether cues are enabled
       *
       * @default true
       */
      cueEnabled?: boolean;

      /**
       * default cue position is top left you can specify a function per node too
       *
       * @default 'top-left'
       */
      expandCollapseCuePosition?: string | Function;

      /**
       * size of expand-collapse cue
       *
       * @default 12
       */
      expandCollapseCueSize?: number;

      /**
       * size of lines used for drawing plus-minus icons
       *
       * @default 8
       */
      expandCollapseCueLineSize?: number;


      /**
       * image of expand icon if undefined draw regular expand cue
       */
      expandCueImage?: string;

      /**
       * image of collapse icon if undefined draw regular collapse cue
       */
      collapseCueImage?: string;

      /**
       * sensitivity of expand-collapse cues
       *
       * @default 1
       */
      expandCollapseCueSensitivity?: number;
    }

    interface Instance {
      collapseAll(options?: ExpandCollapse.Options);
      destroy(): void;
    }
  }
}

declare module 'cytoscape-expand-collapse' {
  const expand_collapse: Cy.ExpandCollapse.Static;
  export = expand_collapse;
}
