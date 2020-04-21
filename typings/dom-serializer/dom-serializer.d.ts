

declare module 'dom-serializer' {
  interface Serializer {
    (dom: any, opts?: any): string
  }

  const serializer: Serializer;
  export = serializer;
}
