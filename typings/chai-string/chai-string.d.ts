/// <reference types="chai" />

declare module Chai {
    interface Assertion {
      equalIgnoreSpaces(obj: string): Assertion
    }

  interface ChaiString {
    (chai: any, utils: any): void;
  }
}

declare module 'chai-string' {
  const chaiString: Chai.ChaiString;
  export = chaiString;
}
