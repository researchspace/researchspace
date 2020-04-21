declare interface Reporter {
  (name: string): WritableStream;
}

declare const reporter: Reporter;

export = reporter;
