declare module 'slate-react-placeholder' {
  import { Plugin } from 'slate-react';

  interface PlaceholderPluginOptions {
    placeholder?: string;
    when?: string | ((editor: any, node: any) => boolean);
  }

  export default function PlaceholderPlugin(options?: PlaceholderPluginOptions): Plugin;
}
