declare module Core {
  interface Operators {
    get<T>(key: string): (object: {}) => T
  }
}

// node
declare module 'core.operators' {
  var Operators: Core.Operators;
  export = Operators;
}
