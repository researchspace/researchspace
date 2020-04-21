/// <reference types="react" />

declare module 'react-truncate' {
  interface ReactTruncateProps {
    children?: React.ReactNode;
    ellipsis?: React.ReactNode;
    lines?: number | false;
    onTruncate?: (isTruncated: boolean) => void;
  }

  export default class ReactTruncate extends React.Component<ReactTruncateProps> {};
}
