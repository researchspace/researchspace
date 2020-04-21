/// <reference path='../../node_modules/immutable/dist/immutable.d.ts'/>

declare module Immutable {

    export module Record {
        type IRecord<T> = T & TypedMap<T>;

        interface TypedMap<T> extends Map<string, any> {
            set(key: string, value: any): IRecord<T>
        }

        interface Factory<T> {
            new (): IRecord<T>;
            new (values: T): IRecord<T>;

            (): IRecord<T>;
            (values: T): IRecord<T>;
        }
    }

    export function Record<T>(
        defaultValues: T, name?: string
    ): Record.Factory<T>;

    interface List<T> {
      concat(...valuesOrIterables: /*Array<Iterable<K, V>|V*/any[]): List<T>;


    /**
     * Returns a new Iterable of the same type with values passed through a
     * `mapper` function.
     *
     *     Seq({ a: 1, b: 2 }).map(x => 10 * x)
     *     // Seq { a: 10, b: 20 }
     *
     */
    map<M>(
      mapper: (value?: T, key?: number, iter?: List<T>) => M,
      context?: any
    ): List<M>;

    }

  export interface Set<T> {
    map<M>(
      mapper: (value?: T, key?: T, iter?: Set<T>) => M,
      context?: any
    ): Set<M>;

    flatMap<M>(
      mapper: (value?: T, key?: T, iter?: Set<T>) => Set<M>,
      context?: any
    ): Set<M>;

    filterNot(
      predicate: (value?: T, key?: T, iter?: Set<T>) => boolean,
      context?: any
    ): Set<T>;
  }

  export interface Map<K, V> extends Collection.Keyed<K, V> {
    merge(...iterables: Map<K, V>[]): Map<K, V>;
  }

  export function Map<K, V>(array: ReadonlyArray<[K, V]>): Map<K, V>;
}
