//// <reference types="react" />
/// <reference path="../inline-style-prefixer/index.d.ts" />

declare module SplitPaneModule {
  export interface SplitPaneProps {
    primary?: 'first' | 'second';
    minSize?: string | number;
    maxSize?: string | number;
    defaultSize?: string | number;
    size?: string | number;
    allowResize?: boolean;
    split?: 'vertical' | 'horizontal';
    onDragStarted?: () => void;
    onDragFinished?: (size: number|string) => void;
    onChange?: (size: number|string) => void;
    prefixer?: Prefixer;
    style?: React.CSSProperties;
    resizerStyle?: React.CSSProperties;
    paneStyle?: React.CSSProperties;
    pane1Style?: React.CSSProperties;
    pane2Style?: React.CSSProperties;
    className?: string;
    resizerClassName?: string;
    children?: React.ReactNode[];
  }

  interface SplitPaneClass extends React.ComponentClass<SplitPaneProps> {}
}

declare module 'react-split-pane' {
  const SplitPaneComponent: SplitPaneModule.SplitPaneClass;
  export = SplitPaneComponent;
}
