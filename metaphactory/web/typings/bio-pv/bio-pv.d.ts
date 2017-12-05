
declare module pv {
  export interface pv {
    Viewer(domElement: Element, props: any);
    color: any;
    io: any;
  }
}

declare module 'bio-pv' {
  var pv: pv.pv;
  export = pv;
}
