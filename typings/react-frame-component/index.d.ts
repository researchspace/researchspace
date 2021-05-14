declare module 'react-frame-component' {
  import * as React from 'react';
  export interface FrameComponentProps {
    className?: string;
    head?: React.ReactNode;
    initialContent?: string;
    mountTarget?: string;
    src?: string;
  }
  export default class Frame extends React.Component<FrameComponentProps, {}> {}

  export class FrameContextConsumer extends React.Component<{}, {}> {}
}
