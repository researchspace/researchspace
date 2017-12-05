//// <reference types="react" />

declare module FrameModule {
  export interface FrameComponentProps {
    className?: string
    head?: React.Node
  }
  export interface FrameComponent extends React.ComponentClass<FrameComponentProps> {}
}

declare module 'react-frame-component' {
  const Frame: FrameModule.FrameComponent;
  export = Frame;
}
