
declare module ClassNamesModule {
  interface ClassNames {
    (clas: string, objects: {[id:string]: boolean}): string
    (clas: string, clas2: string, objects: {[id:string]: boolean}): string
    (... classes: string[]): string
    (classes: string[]): string
    (classes: {[id:string]: boolean}): string
  }
}

// node
declare module 'classnames' {
  var classnames: ClassNamesModule.ClassNames;
  export = classnames;
}
