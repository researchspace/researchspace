declare module YasguiYasr {

  interface YasrOptions {
    useGoogleCharts?: boolean;
    persistency?: {
      results: boolean;
    };
    // default: ["error", "boolean", "rawResponse", "table", "pivot"],
    outputPlugins?: string[];
  }

  interface YasrStatic {
    (elm: Element, opts: YasrOptions): Yasr;
    registerOutput(pluginName: string, plugin: any);
    plugins: {[plugin: string]: any}
  }

  interface Yasr {
    setResponse(response: string | JSON);
  }
}

declare module 'yasgui-yasr' {
  const yasr: YasguiYasr.YasrStatic;
  export = yasr
}

declare module 'yasgui-yasr/src/bindingsToCsv.js' {
  const f: (result: any ) => any ;
  export = f;
}
