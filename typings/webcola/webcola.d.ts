declare module Cola {
  interface ColaStatic {}
}

declare module 'webcola' {
  const webcola: Cola.ColaStatic;
  export = webcola;
}
