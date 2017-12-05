declare class Prefixer {
  constructor(userAgent: string);

  prefix(style: CSSStyleDeclaration): CSSStyleDeclaration;
}

declare module 'inline-style-prefixer' {
  const Prefixer: Prefixer;
  export { Prefixer as default };
}
