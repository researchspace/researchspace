declare module N3 {
  interface N3Static {
    Parser(): Parser
    Writer(opts: {format: string}): Writer
    Util: N3Util
  }

  interface Parser {
    parse(data: string, callback: (err, triple: Triple, prefixes) => void)
    parse(callback: (err, triple?: Triple, prefixes) => void)
  }

  interface Writer {
    addTriple(triple: Triple)
    end(fn: (error, result: string) => void)
  }

  interface N3Util {
    createIRI(iri: string): string
    createLiteral(v: string): string
    createLiteral(v: string, datatype: string): string

    isIRI(v: string): boolean
    isLiteral(v: string): boolean
    isBlank(v: string): boolean
    isPrefixedName(v: string): boolean

    getLiteralType(l: string): string
    getLiteralValue(l: string): string
    getLiteralLanguage(l: string): string
  }

  interface Triple {
    subject: string
    predicate: string
    object: string
    graph?: string
  }
}

declare module "n3" {
  var n3: N3.N3Static
  export = n3;
}
