/// <reference types="ol" />

declare module 'ol-popup' {
  class Popup {
    constructor(options?: ol.olx.OverlayOptions)
    hide(): void
    show(p: ol.Coordinate, content: string): void
    setOffset(p: ol.Coordinate)
  }

  const popup = Popup;
  export = popup;
}
