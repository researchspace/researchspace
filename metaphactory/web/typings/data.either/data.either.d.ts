
declare module Data {
  interface Either<L,R> {
    isLeft: boolean
    isRight: boolean
    map<B>(fn: (x:R) => B): Either<L, B>
    leftMap<B>(fn: (x:L) => B): Either<B,R>
    get(): R
    getOrElse(x: R): R
    fold<B>(lfn: (x:L) => B, rfn: (x:R) => B): B
  }

  interface Left<L,R> extends Either<L,R> {}
  interface Right<L,R> extends Either<L,R> {}

  interface EitherStatic {
    Left<L,R>(t: L): Left<L,R>
    Right<L,R>(t: R): Right<L,R>
    fromNullable<L,R>(t: R): Either<L,R>
    of<L,R>(t: R): Either<L, R>
  }
}

// node
declare module 'data.either' {
  var Either: Data.EitherStatic;
  export = Either;
}