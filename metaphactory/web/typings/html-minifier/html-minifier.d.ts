declare module 'html-minifier' {
  interface MinifierOptions {
  }

  interface Minifier {
    (html: string, opts: MinifierOptions): string
  }
  const minify: Minifier;
}
