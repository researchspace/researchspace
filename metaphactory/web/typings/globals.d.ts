// Global DOM extensions

interface Document {
  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/Document/registerElement
   */
  registerElement(name: string, opts?: {}): Function
}


declare module 'cytoscape/src/core/index';
