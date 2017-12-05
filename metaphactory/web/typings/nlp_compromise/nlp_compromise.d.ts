declare module NlpCompromise {
  interface Nlp {
    noun(word: string): Noun
  }

  interface Noun {
    pluralize(): string
    article(): string
  }
}


// node
declare module 'nlp_compromise' {
  var nlp: NlpCompromise.Nlp
  export = nlp
}
