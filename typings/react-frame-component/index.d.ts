declare module 'react-frame-component' {
  import * as React from 'react';
  export interface FrameComponentProps {
    className?: string;
    head?: React.ReactNode;
    initialContent?: string;
    mountTarget?: string;
  }
  export default class Frame extends React.Component<FrameComponentProps, {}> {}
}
