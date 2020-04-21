interface NodeRequire {
  ensure(
    dependencies: string[],
    callback: (require: NodeRequire) => void,
    errorCallback: (error: any) => void,
    chunkName: string
  ): void;
}
