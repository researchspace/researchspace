
declare module 'bem-cn' {
  interface Block {
    (block: string, modifiers?: {}): Element
    setup({mod: string}): void;
  }

  interface Element {
    (element: string, modifiers?: {}): string
  }

  const Block:Block;
  export = Block;
}
