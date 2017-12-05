declare module ol {
  module Overlay {
    type Point = [number, number]
    
    class Popup {
      constructor(options?:any)
      hide(): void
      show(p: Point, content: string): void
      setOffset(p: Point)
    }
  }
}
