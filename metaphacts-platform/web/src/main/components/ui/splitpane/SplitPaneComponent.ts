/*
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import {
  Component,
  createFactory,
  createElement,
  Children,
  ReactNode,
  cloneElement,
  ReactElement,
  Props as ReactProps,
} from 'react';
import * as SplitPane from 'react-split-pane';
import * as assign from 'object-assign';
import * as _ from 'lodash';

import { BrowserPersistence, universalChildren } from 'platform/components/utils';
import { SplitPaneSidebarClosedComponent } from './SplitPaneSidebarClosedComponent';
import { SplitPaneSidebarOpenComponent } from './SplitPaneSidebarOpenComponent';
import { SplitPaneToggleOnComponent } from './SplitPaneToggleOnComponent';
import { SplitPaneToggleOffComponent } from './SplitPaneToggleOffComponent';

import {SplitPaneConfig, configHasDock } from './SplitPaneConfig';

import './split-pane.scss';

export type Props = SplitPaneConfig & ReactProps<SplitPaneComponent>;

export interface State {
  isOpen?: boolean;
  size?: number;
}

const LocalStorageState = BrowserPersistence.adapter<{
  readonly isOpen?: boolean;
  readonly size?: number;
}>();

/**
 * @example
 * <mp-splitpane min-size=5 default-size=100>
 *     <div>
 *         <mp-splitpane-toggle-on>
 *             <button></button>
 *         </mp-splitpane-toggle-on>
 *         <mp-splitpane-toggle-off>
 *             <button></button>
 *         </mp-splitpane-toggle-off>
 *         <mp-splitpane-sidebar-open><!-- sidebar content --></mp-splitpane-sidebar-open>
 *     </div>
 *     <div><!-- main component --></div>
 * </mp-splitpane>
 *
 * @example
 * Using the split-pane as left-side sidebar menu by utilizing
 * the pre-defined "split-pane__leftsidebar-*" css classes
 *
 * <mp-splitpane min-size=30 nav-height=103 footer-height=180 dock=true default-size=300 id="my-panel" persist-resize=true style="margin-top:-60px;" snap-threshold=50>
 *   <div class="split-pane__leftsidebar">
 *     <mp-splitpane-toggle-on>
 *       <div class="split-pane__leftsidebar-caption">SIDEBAR TITLE</div>
 *     </mp-splitpane-toggle-on>
 *     <mp-splitpane-sidebar-open>
 *       <h1> Sidebar </h1>
 * 			<!--side bar content here -->
 *     </mp-splitpane-sidebar-open>
 *     <div class="split-pane__leftsidebar-footer">
 *       <mp-splitpane-toggle-on>
 *         <div class="split-pane__leftsidebar-toggle">&raquo;</div>
 *       </mp-splitpane-toggle-on>
 *       <mp-splitpane-toggle-off>
 *         <div class="split-pane__leftsidebar-toggle" >&laquo;</div>
 *       </mp-splitpane-toggle-off>
 *     </div>
 *   </div>
 *   <div >
 *     <!-- main content here -->
 *   </div>
 * </mp-splitpane>
 */
export class SplitPaneComponent extends Component<Props, State> {
  static readonly defaultProps: Partial<Props> = {
    defaultSize: 300,
    defaultOpen: true,
    navHeight: 105, // our default nav + breadcrumbs size
  };

  constructor(props: Props) {
    super(props);

    let isOpen: boolean;
    let size: number;
    if (this.isPersistResize()) {
      const localState = LocalStorageState.get(this.getLSIdentifier());
      isOpen = localState.isOpen;
      size = localState.size;
    }

    this.state = {
      isOpen: isOpen === undefined ? Boolean(this.props.defaultOpen) : isOpen,
      size: size === undefined ? this.props.defaultSize : size,
    };
  }

  private getLSIdentifier = () => {
    const id = this.props.id;
    return `mp-splitpane${id ? `-${id}` : ``}`;
  };

  private isPersistResize = (): boolean => {
    return this.props.persistResize || this.props.persistResize === undefined;
  };

  private handleOpen = () => {
    let size = this.state.size;

    const hasEnoughSize = size && this.consideredToBeOpened(size);
    if (!this.state.isOpen && !hasEnoughSize) {
      size = this.props.defaultSize;
    }

    this.setState({isOpen: !this.state.isOpen, size}, () => {
      if (this.isPersistResize()) {
        LocalStorageState.update(this.getLSIdentifier(), {
          isOpen: this.state.isOpen,
          size: this.state.size,
        });
      }

      this.triggerWindowResize();
    });
  };

  private handleDrag = (size: number) => {
    const {minSize} = this.props;
    const isOpen = this.consideredToBeOpened(size);

    this.setState({isOpen: isOpen, size: isOpen ? size : minSize}, () => {
      if (this.isPersistResize()) {
        LocalStorageState.update(this.getLSIdentifier(),
          isOpen ? {size, isOpen} : {isOpen});
      }
      this.triggerWindowResize();
    });
  };

  private consideredToBeOpened(size: number) {
    const {minSize, snapThreshold} = this.props;
    return size > minSize + (snapThreshold || 0);
  }

  private mapChildren = (children: ReactNode) => {
    const isOpen = this.state.isOpen;

    return universalChildren(
      Children.map(children, child => {
        if (!child) { return null; }

        if (typeof child === 'string') { return child; }
        const element = child as ReactElement<any>;
        const isSidebarClosed = element.type === SplitPaneSidebarClosedComponent;
        const isSidebarOpen = element.type === SplitPaneSidebarOpenComponent;
        const isToggleOn = element.type === SplitPaneToggleOnComponent;
        const isToggleOff = element.type === SplitPaneToggleOffComponent;

        if (isSidebarClosed || isToggleOn) {
          return !isOpen ? cloneElement(element, {onClick: this.handleOpen}) : null;
        } else if (isSidebarOpen || isToggleOff) {
          return isOpen ? cloneElement(element, {onClick: this.handleOpen}) : null;
        }

        if (element.type === SplitPaneComponent) {
          return element;
        }

        return cloneElement(element, {}, ...this.mapChildren(element.props.children));
      })
    );
  }

  render() {
    const {minSize, className, resizerClassName, style, sidebarStyle, resizerStyle, split,
           contentStyle, children, primary} = this.props;
    const isOpen = this.state.isOpen;

    const props = {
      minSize: minSize,
      size: isOpen ? this.state.size : minSize,
      onChange: this.handleDrag,
      onDragFinished: this.handleDrag,
      className: className,
      resizerClassName: resizerClassName,
      style: style,
      resizerStyle: resizerStyle,
      pane1Style: sidebarStyle,
      pane2Style: contentStyle,
      split,
      primary,
    };

    let [sidebarChild, contentChild] = [children[0], children[1]];
    if (primary === 'second') {
      [sidebarChild, contentChild] = [contentChild, sidebarChild];
    }

    const sidebarChildStyle = assign(
      {},
      sidebarChild.props.style,
      configHasDock(this.props) ? {
        position: 'sticky',
        top: this.props.navHeight + 'px',
        height: `calc(100vh - ${this.props.navHeight}px)`,
      } : null,
    );

    let [firstChild, secondChild] = [
      cloneElement(sidebarChild, {style: sidebarChildStyle},
        ...this.mapChildren(sidebarChild.props.children)
      ),
      this.mapChildren(contentChild)
    ];
    if (primary === 'second') {
      [firstChild, secondChild] = [secondChild, firstChild];
    }

    return createElement(SplitPane, props, firstChild, secondChild);
  }

  /**
   * We need to trigger resize when size of the panel is changed
   * to force components inside the panel to adjust dimensions.
   *
   * e.g charts, or mp-text-truncate, etc.
   */
  private triggerWindowResize = _.debounce(
    () => window.dispatchEvent(new Event('resize')), 200
  );
}

export type component = SplitPaneComponent;
export const component = SplitPaneComponent;
export const factory = createFactory(component);
export default component;
