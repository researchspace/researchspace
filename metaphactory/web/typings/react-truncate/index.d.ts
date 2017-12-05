//// <reference types="react" />

declare module ReactTruncateModule {
  interface ReactTruncateProps {
    children?: React.ReactNode;
    ellipsis?: React.ReactNode;
    lines?: number | false;
    onTruncate?: (isTruncated: boolean) => void;
  }

  interface ReactTruncateClass extends React.ComponentClass<ReactTruncateProps> {}
}

declare module 'react-truncate' {
  const ReactTruncateComponent: ReactTruncateModule.ReactTruncateClass;
  export = ReactTruncateComponent;
}
