declare module JsonLd {
  interface JsonLdValue {
    '@value': any;
    '@type'?: string;
    '@language'?: string;
    '@id'?: string;
  }
  interface JsonLdStatic {
    documentLoaders: any;
    documentLoader:Function;
    toRDF(doc:any, options: any, callback : (error:any, data:any) => void) : void;
    expand(doc:any, callback : (error:any, data:any) => void) : void;
    frame(doc:any, frame: any, callback : (error:any, data:any) => void) : void;
    compact(doc:any, context: any, callback : (error:any, data:any) => void) : void;
    fromRdf(src:any, options: any, callback : (error:any, data:any) => void) : void;
  }
}

declare module "jsonld" {
  var jsonld: JsonLd.JsonLdStatic;
  export = jsonld;
}