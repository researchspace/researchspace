
declare module BasilJsModule {
  interface Basil {
    new();
    new(opts: BasilOptions)

    set(key: string, value: string)
    set(key: string, value: any)
    set(key: any, value: any)
    get(key: string | any): string
    get<T>(key: string | any): T
    remove(key: string): boolean
    check(key: string): boolean
  }

  interface BasilOptions {
    /**
     * Namespace. Namespace your Basil stored data
     * default: 'b45i1'
     */
    namespace?: string

    // storages. Specify all Basil supported storages and priority order
    // default: `['local', 'cookie', 'session', 'memory']`
    storages?: string []

    // expireDays. Default number of days before cookies expiration
    // default: 365
    expireDays?: number
  }
}

// node
declare module 'basil.js' {
  var Basil: BasilJsModule.Basil;
  export = Basil;
}
