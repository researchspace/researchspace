declare module 'ol-popup' {
  import Overlay, { Options } from 'ol/Overlay';
  import { Coordinate } from 'ol/coordinate';

  class Popup extends Overlay {
    constructor(options?: Partial<Options>);
    hide(): void;
    show(p: Coordinate, content: string | HTMLElement): this;
    isOpened(): boolean;
  }

  const popup: typeof Popup;
  export = popup;
}
