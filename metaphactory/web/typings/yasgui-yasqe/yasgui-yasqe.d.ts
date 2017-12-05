declare module YasguiYasqe {

  interface YasqeOptions {
    backdrop: number;
    value?: string;
    autocompleters?: string[];
    persistent?: () => string;
    syntaxErrorCheck?: boolean;
  }

  interface YasqeStatic {
    (elem: Element, opts: YasqeOptions): Yasqe
  }

  interface Yasqe {
    setSize(w: number, h: number): void;
    setValue(query: string): void;
    getValue(): string;
    getQueryType(): string;
    getQueryMode(): string;
    setOption(option:string, value: any): void;
    refresh():void;
    clearGutter(gutter: string): void;
    setBackdrop(set: boolean): void;
    on(eventName: string, cb: (doc: any, event: any) => void): void;
  }
}

declare module 'yasgui-yasqe' {
  const yasqe: YasguiYasqe.YasqeStatic;
  export = yasqe;
}
