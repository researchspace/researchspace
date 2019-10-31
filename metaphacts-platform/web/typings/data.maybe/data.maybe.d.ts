
declare module Data {
  interface Maybe<T> extends Function {
    isNothing: boolean
    isJust: boolean
    get(): T
    getOrElse(d: T): T
    orElse<M>(fn: () => Maybe<M>): Maybe<M>
    map<B>(fn: (x:T) => B): Maybe<B>
    chain<B>(fn: (x:T) => Maybe<B>): Maybe<B>
    cata<B>(opts: {
      Nothing: (x: Nothing<T>) => B
      Just: (x: T) => B
    }): B
    isEqual<T>(t: Maybe<T>): boolean
  }

  interface Just<T> extends Maybe<T> {}
  interface Nothing<T> extends Maybe<T> {}

  interface MaybeStatic extends Maybe<any> {
    Nothing<T>(): Nothing<T>
    Just<T>(t: T): Just<T>
    fromNullable<T>(t: T): Maybe<T>
    of<T>(t: T): Maybe<T>
  }
}

// node
declare module 'data.maybe' {
  var Maybe: Data.MaybeStatic;
  export = Maybe;
}
