declare module 'kefir' {
  type Event<A> = ValueEvent<A>;

  interface IEvent<T> {
    'type': 'value' | 'error' | 'end';
    value: T;
  }

  interface ValueEvent<T> extends IEvent<T> {
    'type': 'value';
  }

  interface ErrorEvent extends IEvent<any> {
    'type': 'error';
  }

  interface EndEvent extends IEvent<undefined> {
    'type': 'end';
  }

  /**
   * Pool is like merge to which you can dynamically add and remove sources.
   * When you create a new pool it has no sources.
   * Then you can add observables to it using the plug method,
   * and remove them using unplug. Pool never ends.
   */
  function pool<T>(): Pool<T>;

  /**
   * Calls the generator function which is supposed to return an observable.
   * Emits values and errors from the spawned observable; when it ends, calls
   * generator again to get a new one and so on.
   *
   * The generator function is called with one argument — iteration number
   * starting from 0. If a falsy value is returned from the generator,
   * the stream ends.
   */
  function repeat<T>(generator: (iteration: number) => Observable<T> | false | null | undefined): Stream<T>;

  function stream<T>(f: (emitter: Emitter<T>) => void | (() => void)): Stream<T>;

  /**
   * Creates an ended property, with the specified current `value`.
   */
  function constant<T>(value: T): Property<T>;

  /**
   *  Creates an ended property, with the specified current `error`.
   */
  function constantError<T>(error: T): Property<T>;

  /**
   * Converts a Promise to a Kefir Property.
   * Uses promise.then(onFulfilled, onRejected) interface to subscribe to the promise.
   * Also calls promise.done() (if there is such methods) to prevent libraries
   * like Q or when from swallowing exceptions.
   */
  function fromPromise<T>(promise: Promise<T>): Stream<T>;

  /**
   * Creates a stream that already ended and will never produce any events.
   */
  function never<T>(): Stream<T>;

  /**
   * Creates a stream that produces a single value after wait milliseconds, then ends.
   */
  function later<T>(wait: number, value: T): Stream<T>;

  /**
   * Creates a stream that produces the same value each interval milliseconds. Never ends.
   */
  function interval<T>(value: T): Stream<T>;

  /**
   * Creates a stream containing the given `values`,
   * delivered with the given `interval` in milliseconds.
   * Ends after all values are delivered.
   */
  function sequentially<T>(interval: number, values: T[]): Stream<T>;

  /**
   * Creates a stream that polls the given `fn` function,
   * with the given `interval` in milliseconds, and emits the values returned by fn. Never ends.
   */
  function fromPoll<T>(interval: number, fn: () => T): Stream<T>;

  /**
   * General method to create an interval based stream.
   * Creates a stream that calls the given `handler` function,
   * with the given `interval` in milliseconds.
   * The `handler` function is called with one argument — an emitter.
   */
  function withInterval<T>(interval: number, handler: (emitter: Emitter<T>) => never): Stream<T>;

  /**
   * Similar to fromCallback, but the callback passed to fn is
   * a Node.JS style callback — callback(error, result).
   *
   * @see fromCallback
   */
  function fromNodeCallback<T>(
    f: (callback: (error: any, result?: T | Property<T>) => void) => void
  ): Stream<T>;

  /**
   * Convert a function that accepts a callback as the first argument to a stream.
   * Emits at most one value when callback is called, then ends.
   * The fn function will be called at most once,
   * when the first subscriber will be added to the stream.
   */
  function fromCallback<T>(f: (cb: (result: T) => void) => void): Stream<T>;


  /**
   * Merges several obss observables into a single stream i.e.,
   * simply repeats values from each source observable.
   * Ends when all obss observables end.
   */
  function merge<T>(obss: Array<Observable<T>>): Stream<T>;


  // Typed version of zip, if you need to support more than 4 observables just
  // use copy-paste and add new definition

  /**
   * Creates a stream with values from sources lined up with each other.
   * For example if you have two sources with values [1, 2, 3] and [4, 5, 6, 7],
   * the result stream will emit [1, 4], [2, 5], and [3, 6].
   * The result stream will emit the next value
   * only when it has at least one value from each source.
   *
   * You can also provide a combinator function.
   * In this case, instead of emitting an array of values,
   * they will be passed to combinator as arguments,
   * and the returned value will be emitted (same as in combine)
   *
   * This method sometimes is used incorrectly instead of combine.
   * Please make sure you understand the difference and are making right choice.
   */
  function zip<T>(sources: Array<Observable<T>>): Stream<T[]>;

  /**
   * @see zip
   */
  function zip<X1, X2>(sources: [Observable<X1>, Observable<X2>]): Stream<[X1, X2]>;

  /**
   * @see zip
   */
  function zip<X1, X2, X3>(sources: [Observable<X1>, Observable<X2>, Observable<X3>]): Stream<[X1, X2, X3]>;

  /**
   * @see zip
   */
  function zip<X1, X2, X3, X4>(sources: [Observable<X1>, Observable<X2>, Observable<X3>, Observable<X4>]): Stream<[X1, X2, X3, X4]>;

  /**
   * @see zip
   */
  function zip<X1, X2, K>(
    sources: [Observable<X1>, Observable<X2>],
    combinator: (x1: X1, x2: X2) => K
  ): Stream<K>;

  /**
   * @see zip
   */
  function zip<X1, X2, X3, K>(
    sources: [Observable<X1>, Observable<X2>, Observable<X3>],
    combinator: (x1: X1, x2: X2, x3: X3) => K
  ): Stream<K>;

  /**
   * @see zip
   */
  function zip<X1, X2, X3, X4, K>(
    sources: [Observable<X1>, Observable<X2>, Observable<X3>, Observable<X4>],
    combinator: (x1: X1, x2: X2, x3: X3, x4: X4) => K
  ): Stream<K>;


  /**
   * Returns a stream. Combines two or more observables together.
   * On each value from any source observable (obss array), emits a combined value,
   * generated by the combinator function from the latest values from each source observable.
   * The combinator function is called with the latest values as arguments.
   * If no combinator is provided, it emits an array containing the latest values.
   *
   * You can also pass part of the source observables as passiveObss in a second array,
   * the result stream won't emit on values from passiveObss,
   * but all the values will be available in the combinator function.
   *
   * The result stream emits a value only when it has at least one value
   * from each of source observables.
   * Ends when all the active source observables (obss array) end.
   * You can also combine two observables by calling a.combine(b, combinator) if you like.
   */
  function combine<T>(obs: Array<Observable<T>>): Stream<Array<T>>;

  /**
   * @see combine
   */
  function combine<T>(
    obs: Array<Observable<T>>,
    passiveObs: Array<Observable<T>>
  ): Stream<Array<T>>;

  /**
   * @see combine
   */
  function combine<T, K>(
    obs: Array<Observable<T>>,
    passiveObs: Array<Observable<T>>,
    combinator: (...T) => K
  ): Stream<K>;

  /**
   * @see combine
   */
  function combine<X1, X2>(obss: [Observable<X1>, Observable<X2>]): Stream<[X1, X2]>;

  /**
   * @see combine
   */
  function combine<X1, X2, X3>(
    obss: [Observable<X1>, Observable<X2>, Observable<X3>]
  ): Stream<[X1, X2, X3]>;

  /**
   * @see combine
   */
  function combine<X1, X2, B>(
    obss: [Observable<X1>, Observable<X2>],
    combinator: (x1: X1, x2: X2) => B
  ): Stream<B>;

  /**
   * @see combine
   */
  function combine<X1, X2, X3, B>(
    obss: [Observable<X1>, Observable<X2>, Observable<X3>],
    combinator: (x1: X1, x2: X2, x3: X3) => B
  ): Stream<B>;

  /**
   * Also, combine supports passing objects as both obss and passiveObss.
   * The combinator function will then be called with a single argument,
   * a new object with the latest value from each observable.
   * If no combinator is provided, it emits the object containing latest values.
   *
   * If there are duplicate keys in both obss and passiveObss,
   * only the latest values from obss will appear in the combined object for the duplicated keys.
   */
  function combine<T>(
    obs: { [P in keyof T]: Observable<T[P]> },
  ): Stream<{[P in keyof T]: T[P]}>;

  /**
   * @see combine
   */
  function combine<T, K>(
    obs: { [P in keyof T]: Observable<T[P]> },
    combinator: (x: {[P in keyof T]: T[P]}) => K
  ): Stream<K>;

  /**
   * @see combine
   */
  function combine<T, T1>(
    obs: { [P in keyof T]: Observable<T[P]> },
    pasiveObs: { [P in keyof T1]: Observable<T1[P]> }
  ): Stream<{[P in keyof T]: T[P]} & {[P in keyof T1]: T1[P]}>;

  /**
   * @see combine
   */
  function combine<T, T1, K>(
    obs: { [P in keyof T]: Observable<T[P]> },
    pasiveObs: { [P in keyof T1]: Observable<T1[P]> },
    combinator: (x: {[P in keyof T]: T[P]} & {[P in keyof T1]: T1[P]}) => K
  ): Stream<K>;

  interface Emitter<T> {
    emit(value: T): void;
    error(err: any): void;
    end(): void;
  }

  // TODO Can be improved when https://github.com/Microsoft/TypeScript/issues/6223 is resolved
  class Observable<A> {
    /**
     * @see combine
     */
    combine<B, C>(obs: Observable<B>, combinator: (a: A, b: B) => C): Stream<C>;


    debounce(wait: number): this;

    delay(milis: number): this;


    /**
     * Filters values from the original observable using the given predicate function.
     *
     * If no predicate is provided, the function x => x will be used.
     */
    filter(predicate: (a: A) => boolean): this;

    /**
     * Same as filter but for errors.
     */
    filterErrors(predicate: (error: any) => any): this;

    flatMapLatest<B>(fn: (el: A) => Observable<B>): Stream<B>;

    /**
     * Works similar to flatten, but instead of arrays, it handles observables.
     * Like in flatten you can either provide a transform function
     * which will return observables, or you can use the source obs observable
     * that already emits observables.
     *
     * Always returns a stream.
     *
     * flatMap ends when obs and all spawned observables end.
     */
    flatMap<B>(fn: (el: A) => Observable<B>): Stream<B>;


    flatMapErrors<B>(fn: (el: any) => Observable<B>): Stream<B>;

    /**
     * Like `flatMapFirst`, but instead of ignoring new observables (if the
     * previous one is still alive), it adds them to the queue. Then, when the
     * current source ends, it takes the oldest observable from the queue, and
     * switches to it.
     */
    flatMapConcat<B>(fn: (el: A) => Observable<B>): Stream<B>;

    ignoreEnd(): this;


    /**
     *  Emits only the last value from the original observable.
     */
    last(): this;

    /**
     * Turns on logging of any event to the browser console.
     * Accepts an optional name argument that will be shown in the log if provided.
     */
    log(name?: string): void;

    /**
     * Turns off logging. If .log was called with a name argument,
     * offLog must be called with the same name argument.
     */
    offLog(name?: string): void;

    /**
     * Turns on spying of any event to the browser console.
     * Similar to .log, however .spy will not cause the stream to activate by itself.
     * Accepts an optional name argument that will be shown in the log if provided.
     */
    spy(name?: string): void;

    /**
     * Turns off spying. If .spy was called with a name argument,
     * offSpy must be called with the same name argument.
     */
    offSpy(name?: string): void;

    /**
     * Unsubscribes callback from values on an observable.
     */
    offValue(f: (a: A) => void): this;

    /**
     * Unsubscribes an onAny subscriber.
     */
    offAny(callback: any): this;

    /**
     * Unsubscribes callback from ending of an observable.
     */
    offEnd(callback: any): this;

    /**
     * Unsubscribes callback from errors on an observable.
     */
    offError(callback: any): this;

    /**
     * Subscribes callback to all three types of events.
     * Callback is called with an event object as argument.
     * Each event object contains three attributes — type, value, and current.
     *
     * type — a 'value', 'error', or 'end' string
     * value — the emitted value or error (undefined if event.type === 'end')
     */
    onAny(f: (event: Event<A>) => void): this;

    /**
     * Subscribes callback to errors on an observable.
     *
     * If called on a property, which has a current error,
     * callback will be called immediately (synchronously) with that error.
     */
    onError(f: (a: any) => void): this;

    /**
     * Subscribes callback to ending of an observable.
     *
     * If observable is already ended, callback will be called immediately (synchronously).
     */
    onEnd(f: () => void): this;

    /**
     * Subscribes callback to values on an observable.
     *
     * If called on a property, which has a current value,
     * callback will be called immediately (synchronously) with that value.
     */
    onValue(f: (a: A) => void): this;

    /**
     * Subscribes the provided observer to an observable.
     */
    observe(handlers: {
      value?: (value: A) => void;
      error?: (error: any) => void;
      end?: () => void;
    }): Subscription;

    /**
     * Skips the first n values from the original observable, then emits all the rest.
     */
    skip(n: number): this;

    /**
     * Skips values from the original observable until
     * the given predicate function applied to a value returns false,
     * then stops applying the predicate to values and emits all of them.
     *
     * If no predicate is provided, the function x => x will be used.
     *
     * @see https://rpominov.github.io/kefir/#skip-while
     */
    skipWhile(predicate: (a: A) => boolean): this;

    /**
     * Skips duplicate values using === for comparison.
     * Accepts an optional comparator function which is then used instead of ===.
     * @see https://kefirjs.github.io/kefir/#skip-duplicates
     */
    skipDuplicates(comparator?: (a: A, b: A) => boolean): this;

    /**
     * Emits the first n values from the original observable, then ends.
     */
    take(n: number): this;

    /**
     * Emits the first n errors from the original observable, then ends. Values just flow through.
     */
    takeErrors(n: number): this;

    /**
     * Emits values from the original observable until
     * the given predicate function applied to a value returns false.
     * Ends when the predicate returns false.
     *
     * If no predicate is provided, the function x => x will be used.
     */
    takeWhile(predicate: (a: A) => boolean): this;

    /**
     * Takes values until the first value from obs i.e., ends on the first value from obs.
     */
    takeUntilBy(obs: Observable<any>): this;

    /**
     * Converts an Kefir Observable to a Promise.
     * If called without arguments the default gloabal.Promise constructor is used,
     * alternatively you can pass a promise constructor.
     *
     * The promise will be fulfilled or rejected at the moment source observable ends,
     * with the latest value or error. If observable ends without any value or error
     * the promise will never be fulfilled/rejected.
     */
    toPromise(): Promise<A>;
    toPromise(promiseConstructor: PromiseConstructorLike): PromiseLike<A>;
  }

  interface Subscription {
    unsubscribe(): void;
  }

  class Stream<A> extends Observable<A> {
    /**
     * Applies the given fn function to each value from the original observable
     * and emits the value returned by fn.
     */
    map<B>(fn: (el: A) => B): Stream<B>;

    /**
     * Same as map but for errors.
     */
    mapErrors<A>(fn: (el: any) => any): Stream<A>;

    sampledBy<B>(obs: Observable<B>): Stream<A>;
    sampledBy<B, C>(obs: Observable<B>, combinator: (a: A, b: B) => C): Stream<C>;

    scan<B>(fn: (prev: B, next: A) => B, seed?: B): Property<B>;
    slidingWindow(max: number, min?: number): Stream<Array<A>>;

    /**
     * Converts a stream to a property.
     * Accepts an optional getCurrent callback,
     * which will be called on each activation to get the current value at that moment.
     */
    toProperty(getCurrent?: () => A): Property<A>;
    bufferWithTimeOrCount(interval: number, count: number, options?: {flushOnEnd: boolean}): Stream<A[]>;
  }

  class Property<A> extends Observable<A> {

    /**
     * Converts a property to a stream.
     * If the property has a current value (or error),
     * it will be ignored (subscribers of the stream won't get it).
     * If you call changes on a stream,
     * it will return a new stream with current values/errors removed.
     */
    changes(): Stream<A>;

    /**
     * Applies the given fn function to each value from the original observable
     * and emits the value returned by fn.
     */
    map<B>(f: (el: A) => B): Property<B>;

    /**
     * Same as map but for errors.
     */
    mapErrors<B = A>(fn: (el: any) => any): Property<B>;

    sampledBy<B>(obs: Observable<B>): Property<A>;
    sampledBy<B, C>(obs: Observable<B>, combinator: (a: A, b: B) => C): Property<C>;
    sampledBy<B, C>(obs: any, combinator: (a: A, b: B) => C): Property<C>;

    scan<B>(fn: (prev: B, next: A) => B, seed?: B): Property<B>;
  }

  interface Pool<A> extends Stream<A> {
    plug(obs: Observable<A>): void;
  }
}
