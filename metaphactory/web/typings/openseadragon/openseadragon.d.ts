// Type definitions for OpenSeaDragon v2.1.0
// Project: https://openseadragon.github.io/

declare namespace OpenSeadragon {
	class TileSource {
		constructor(options: TileSourceOptions);
	}

	interface TileSourceOptions {
		url?: string;
	}

	class IIIFTileSource extends TileSource {
		constructor(options: IIIFTileSourceOptions);
	}

	interface IIIFTileSourceOptions extends TileSourceOptions {
		'@id': string;
		width: number;
		height: number;
	}

  class Point {
    x: number;
    y: number;
    constructor(x?: number, y?: number);
    apply(func: (coord: number) => number);
    clone(): Point;
    distanceTo(point: Point): Point;
    divide(factor: number): Point;
    equals(point: Point): Point;
    minus(point: Point): Point;
    negate(): Point;
    plus(point: Point): Point;
    rotate(degress: number, pivot?: Point): Point;
    times(factor: number): Point;
    toString(): string;
  }

  class Rect {
    x: number;
    y: number;
    width: number;
    height: number;

    constructor(x?: number, y?: number, width?: number, height?: number, degrees?: number);
    clone(): Rect;
    containsPoint(point: Point, epsilon?: number): boolean;
    equals(rectangle: Rect): boolean;
    getAspectRatio(): number;
    getBottomLeft(): Point;
    getBottomRight(): Point;
    getBoundingBox(): Rect;
    getCenter(): Point;
    getIntegerBoundingBox(): Rect;
    getSize(): Point;
    getTopLeft(): Point;
    getTopRight(): Point;
    intersection(rect: Rect): Rect;
    rotate(degrees: number, pivot?: Point): Rect;
    times(factor: number): Rect;
    toString(): string;
    translate(delta: Point): Rect;
    union(rect: Rect): Rect;
  }

  class Tile {}

  class TiledImage {
    addHandler(eventName: string, handler: EventHandler, userData?: any): void;
    addOnceHandler(eventName: string, handler: EventHandler, userData?: any, times?: number): void;
    getHandler(eventName: string): Function;
    removeHandler(eventName: string, handler: EventHandler): void;
    removeAllHandlers(eventName: string): void;
    destroy(): void;
    draw(): void;
    fitBounds(bounds: Rect, anchor?: Placement, immediately?: boolean): void;
    getBounds(current?: boolean): Rect;
    getClip(): Rect | null;
    getClippedBounds(current?: boolean): Rect;
    getCompositeOperation(): CompositeOperation | undefined;
    getContentSize(): Point;
    getOpacity(): number;
    reset(): void;
    setClip(newClip: Rect | null): void;
    setCompositeOperation(compositeOperation: CompositeOperation): void;
    setHeight(height: number, immediately?: boolean): void;
    setOpacity(opacity: number): void;
    setPosition(position: Point, immediately?: boolean): void;
    setWidth(width: number, immediately?: boolean): void;
    update(): boolean;
  }

  type EventHandler = (...args: any[]) => void;

  class Viewer {
    canvas: any;
    container: any;
    drawer: any;
    element: HTMLElement;
    navigator: any;
    viewport: Viewport;
		constructor(options: ViewerOptions);
    addHandler(eventName: string, handler: EventHandler, userData?: any): void;
    addOnceHandler(eventName: string, handler: EventHandler, userData?: any, times?: number): void;
    getHandler(eventName: string): Function;
    removeHandler(eventName: string, handler: EventHandler): void;
    removeAllHandlers(eventName: string): void;
		addTiledImage(options: ViewerAddTiledImageOptions): void;
		destroy(): void;
    forceRedraw(): Viewer;
	}

	interface ViewerOptions {
		id?: string;
		element?: Element;
		prefixUrl?: string;
		tileSources?: any;
		constrainDuringPan?: boolean;
    /** @default 1 */
    opacity?: number;
    /** @default 0.5 */
		visibilityRatio?: number;
    /** @default 0.5 */
		minPixelRatio?: number;
    /** @default 0.8 */
		minZoomImageRatio?: number;
    /** @default 2 */
		maxZoomPixelRatio?: number;
    /** @default 0 */
		defaultZoomLevel?: number;
    /** @default null */
		minZoomLevel?: number;
    /** @default null */
		maxZoomLevel?: number;
    /** @default {} */
    viewportMargins?: ViewportMargins;
    alwaysBlend?: boolean;
    compositeOperation?: CompositeOperation;
    navImages?: any;
    showNavigationControl?: boolean;
    debugMode?: boolean;
	}

  type CompositeOperation =
    'source-over' | 'source-atop' | 'source-in' | 'source-out' |
    'destination-over' | 'destination-atop' | 'destination-in' |
    'destination-out' | 'lighter' | 'copy' | 'xor';

  interface ViewportMargins {
    left?: number;
    top?: number;
    right?: number;
    bottom?: number;
  }

  interface ViewerAddTiledImageOptions {
		tileSource?: TileSource | TileSourceOptions | string;
    index?: number;
    replace?: boolean;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fitBounds?: Rect;
    fitBoundsPlacement?: Placement;
    clip?: Rect;
    opacity?: number;
    compositeOperation?: CompositeOperation;
    success?: (event: AddTiledImageSuccessEvent) => void;
    error?: (event: ErrorEvent) => void;
    collectionImmediately?: boolean;
    placeholderFillStyle?: any;
	}

  enum Placement {
    CENTER,
    TOP_LEFT,
    TOP,
    TOP_RIGHT,
    RIGHT,
    BOTTOM_RIGHT,
    BOTTOM,
    BOTTOM_LEFT,
    LEFT,
  }

  class Viewport {
    constructor(options: ViewportOptions);
    getBounds(current: boolean): Rect;
    fitBounds(bounds: Rect, immediately?: boolean): Viewport;
    imageToViewportRectangle(rect: Rect): Rect;
    imageToViewportRectangle(
      imageX: number,
      imageY: number,
      pixelWidth: number,
      pixelHeight: number
    ): Rect;
    viewportToImageRectangle(rect: Rect): Rect;
    viewportToImageRectangle(
      viewerX: number,
      viewerY: number,
      pointWidth: number,
      pointHeight: number,
    ): Rect;
  }

  interface ViewportOptions {
    /** @see ViewerOptions.viewportMargins */
    margins?: ViewportMargins;
  }

  interface TileLoadedEvent {
    image: HTMLImageElement;
    tiledImage: TiledImage;
    tile: Tile;
    getCompletionCallback: Function;
  }

  interface AddTiledImageSuccessEvent {
    item: OpenSeadragon.TiledImage;
  }

  interface ErrorEvent {
    message: string;
    source: any;
  }
}

declare function OpenSeadragon(
  options: OpenSeadragon.ViewerOptions): OpenSeadragon.Viewer;

declare module "openseadragon" {
  export = OpenSeadragon;
}
