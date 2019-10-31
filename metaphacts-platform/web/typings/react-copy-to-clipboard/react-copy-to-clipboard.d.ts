///<reference types="react"/>

declare module 'react-copy-to-clipboard' {
  interface CopyToClipboardProps extends React.Props<CopyToClipboard> {
    /**
     * Text to be copied to clipboard.
     */
    text: string;

    /**
     * Optional callback, will be called when text is copied.
     */
    onCopy?: () => void;

    options?: {
      /**
       * Enable output to console.
       *
       * @default false
       */
      debug?: boolean;

      /**
       * Prompt message. All occurrences of #{key} are replaced with ⌘+C
       * for macOS/iOS users, and Ctrl+C otherwise
       *
       * @default 'Copy to clipboard: #{key}, Enter'
       */
      message?: string;

      /**
       * CopyToClipboard is a simple wrapping component, it does not render any tags,
       * so it requires the only child element to be present, which will be used to capture clicks.
       */
      children?: React.ReactElement<any>;
    }
  }

  interface CopyToClipboard extends React.ComponentClass<CopyToClipboardProps> {}
  const CopyToClipboard: CopyToClipboard;
  export = CopyToClipboard;
}
