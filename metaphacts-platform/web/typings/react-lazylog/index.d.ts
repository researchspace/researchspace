declare module 'react-lazylog'  {
    import { Component, ReactNode, CSSProperties } from "react";
    import { Range } from "immutable";

    export interface LazyLogProps {
        url: string;
        fetchOptions?: RequestInit;
        stream?: boolean;
        height?: string | number;
        width?: string | number;
        follow?: boolean;
        scrollToLine?: number;
        highlight?: number | number[];
        selectableLines?: boolean;
        formatPart?: (text: string) => ReactNode;
        onLoad?: () => any;
        onError?: (error: any) => any;
        onHighlight?: (range: Range) => any;
        rowHeight?: number;
        overscanRowCount?: number;
        containerStyle?: CSSProperties;
        style?: CSSProperties;
        enableSearch?: boolean;
        extraLines?: number;
    }

    export class LazyLog extends Component<LazyLogProps> {
        static defaultProps: Partial<LazyLogProps>;
    }

    import { Component, ReactNode } from "react";

    export interface ScrollFollowRenderProps {
        onScroll: (
            args: { scrollTop: number; scrollHeight: number; clientHeight: number }
        ) => void;
        follow: boolean;
        startFollowing: () => void;
        stopFollowing: () => void;
    }

    export interface ScrollFollowProps {
        render: (props: ScrollFollowRenderProps) => ReactNode;
        startFollowing?: boolean;
    }

    export class ScrollFollow extends Component<ScrollFollowProps> {}
}


