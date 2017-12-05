// Type definitions for react-scrollchor 2.2.0
// Project: https://github.com/makotot/react-scrollspy
// Definitions by: Johannes Trame <jt@metaphacts.com>
declare module 'react-scrollchor'  {
    import * as React from 'react';

    interface ScrollchorProps extends React.Props<ScrollchorProps> {
        /**
         * id of tag scroll target node
         * - starting `#` can be omited
         * - this prop is required
         * - let it blank, `to = ''`, for scroll to page top
         */
        to: string;
        /**
         * scroll smooth animation can be customize
         * Accepted options:
         *  { offset: 0, duration: 400, easing: easeOutQuad }
         */
        animate?: any;
        /**
         * callback function triggered before scroll to #hash
         */
        beforeAnimate: () => void,
        /**
         * callback function triggered after scroll to #hash
         */
        afterAnimate: () => void
    }

    interface ScrollchorClass extends React.ComponentClass<ScrollchorProps> {}
    const ReactScrollchorCompoment: ScrollchorClass;
    export { ReactScrollchorCompoment as default };
}
