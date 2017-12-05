///<reference path='../cytoscape/cytoscape.d.ts' />

declare module Cy {
  interface Instance {
    panzoom(opts: Panzoom.Options): Panzoom.Instance;
  }

  /**
   * @see https://github.com/cytoscape/cytoscape.js-panzoom
   */
  module Panzoom {
    interface Static {
      (cy: Cy.Static, jquery: JQueryStatic): void;
    }

    interface Options {
      /**
       * Zoom factor per zoom tick.
       *
       * @default 0.05
       */
      zoomFactor?: number;

      /**
       * How many ms between zoom ticks.
       *
       * @default 45
       */
      zoomDelay?: number;

      /**
       * Min zoom level.
       *
       * @default 0.1
       */
      minZoom?: number;

      /**
       * Max zoom level.
       *
       * @default 10
       */
      maxZoom?: number;

      /**
       * Padding when fitting.
       *
       * @default 50
       */
      fitPadding?: number;

      /**
       * How many ms in between pan ticks.
       *
       * @default 10
       */
      panSpeed?: number;

      /**
       * Max pan distance per tick.
       *
       * @default 10
       */
      panDistance?: number;

      /**
       * The length of the pan drag box in which the vector for panning is calculated
       * (bigger = finer control of pan speed and direction).
       *
       * @default 75
       */
      panDragAreaSize?: number;

      /**
       * The slowest speed we can pan by (as a percent of panSpeed).
       *
       * @default 0.25
       */
      panMinPercentSpeed?: number;

      /**
       * Radius of inactive area in pan drag box.
       *
       * @default 8
       */
      panInactiveArea?: number;

      /**
       * Min opacity of pan indicator (the draggable nib); scales from this to 1.0.
       *
       * @default 0.5
       */
      panIndicatorMinOpacity?: number;

      /**
       * A minimal version of the ui only with zooming.
       * (useful on systems with bad mousewheel resolution)
       *
       * @default false
       */
      zoomOnly?: boolean;

      /**
       * Slider handle icon class.
       *
       * @default 'fa fa-minus'
       */
      sliderHandleIcon?: string;

      /**
       * Zoom-in icon class.
       *
       * @default 'fa fa-plus'
       */
      zoomInIcon?: string;

      /**
       * Zoom out icon class.
       *
       * @default 'fa fa-minus'
       */
      zoomOutIcon?: string;

      /**
       * Reset icon class.
       *
       * @default 'fa fa-expand'
       */
      resetIcon?: string;
    }

    interface Instance {
      destroy(): void;
    }
  }

}

declare module 'cytoscape-panzoom' {
  const panzoom: Cy.Panzoom.Static;
  export = panzoom;
}
