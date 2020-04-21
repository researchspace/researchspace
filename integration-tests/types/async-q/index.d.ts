// Type definitions for async-q 0.3.1
// Project: https://github.com/github.com/dbushong/async-q
// Definitions by: Philip Polkovnikov <https://github.com/polkovnikov-ph>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

interface Map {
  <T, R>(arr: T[], fn: (item: T, index: number, arr: T[]) => Promise<R>): Promise<R[]>;
}

interface MapLimit {
  <T, R>(arr: T[], limit: number, fn: (item: T, index: number, arr: T[]) => Promise<R>): Promise<R[]>;
}

interface Filter {
  <T>(arr: T[], fn: (arg: T) => Promise<boolean>): T[];
}

interface Fold {
  <T, U>(arr: T[], memo: U, fn: (memo: U, item: T) => Promise<U>): Promise<U>;
}

interface Detect {
  <T>(arr: T[], fn: (item: T) => Promise<boolean>): Promise<T>;
}

interface SomeEvery {
  <T>(arr: T[], fn: (item: T) => Promise<boolean>): Promise<boolean>;
}

interface SortBy {
  <T, U>(arr: T[], fn: (item: T) => Promise<U>): T[];
}

interface Concat {
  <T>(arr: T[], fn: (item: T) => Promise<U[]>): Promise<U[]>;
}

interface SeriesArg<R> {
  (): Promise<R>;
}

interface RunAll {
  <R>(fn: SeriesArg<R>[]): Promise<R[]>;
}

interface RunAllLimit {
  <R>(fn: SeriesArg<R>[], limit: number): Promise<R[]>;
}

interface Whilst {
  (test: () => boolean, fn: () => Promise<any>): Promise<void>;
}

interface DoWhilst {
  (fn: () => Promise<any>, test: () => boolean): Promise<void>;
}

interface Forever {
  (fn: Promise<any>): void;
}

interface Task<R> {
  <R>(arg?: R): Promise<R>;
}

interface Waterfall {
  <R>(tasks: Task<R>[]): Promise<R>;
}

interface ComposeArg {
  <R>(arg: R): Promise<R>;
}

interface Compose {
  <R>(...fns: ComposeArg<R>[]): ComposeArg<R>;
}

interface ApplyEachArg<T> {
  <T>(...args: T[]): Promise<any>;
}

interface ApplyEach {
  <T>(fns: ApplyEachArg<T>[], ...args: T[]): Promise<void>;
}

export var each: Map;
export var eachSeries: Map;
export var eachLimit: MapLimit;

export var map: Map;
export var mapSeries: Map;
export var mapLimit: MapLimit;

export var filter: Filter;
export var filterSeries: Filter;

export var reject: Filter;
export var rejectSeries: Filter;

export var reduce: Fold;
export var inject: Fold;
export var foldl: Fold;
export var reduceRight: Fold;
export var foldr: Fold;

export var detect: Detect;
export var detectSeries: Detect;

export var sortBy: SortBy;

export var some: SomeEvery;
export var every: SomeEvery;
export var any: SomeEvery;
export var all: SomeEvery;

export var concat: Concat;
export var concatSeries: Concat;

export var series: RunAll;
export var parallel: RunAll;
export var parallelLimit: RunAllLimit;

export var whilst: Whilst;
export var until: Whilst;
export var doWhilst: DoWhilst;
export var doUntil: DoWhilst;

export var forever: Forever;

export var waterfall: Waterfall;

export var compose: Compose;

export var applyEach: ApplyEach;
export var applyEachSeries: ApplyEach;
