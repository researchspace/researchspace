
declare module CoreLambda {
  interface Lambda {
    identity<A>(a: A): A
    curry<T1, T2, T3>(n: number, fn: (a: T1, b: T2) => T3): (a: T1) => (b: T2) => T3;
    curry<T1, T2, T3, T4>(n: number):
      (fn: (a: T1, b: T2, c: T3) => T4) => (a: T1) => (b: T2) => (c: T3) => T4;
    compose<A,B,C>(fn1: (b:B)=> C): (fn2: (a:A) => B) => (a:A) => C

    constant<A,B>(a:A): (b:B) => A
    apply<A,B>(f: (a:A) => B): (a:A) => B
    flip<A, B, C>(f: (a: A, b: B) => C): (b: B, a: A) => C;
  }
}

// node
declare module 'core.lambda' {
  var Lambda: CoreLambda.Lambda;
  export = Lambda;
}
