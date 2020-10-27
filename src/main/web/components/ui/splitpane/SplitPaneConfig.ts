/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { has } from 'lodash';
import { CSSProperties } from 'react';

export interface BaseSplitPaneConfig {
  /**
   * Width of closed sidebar
   */
  minSize: number;
  /**
   * Width of open sidebar
   * @default 300
   */
  defaultSize?: number;
  /**
   * SplitPane custom class name
   */
  className?: string;
  /**
   * Resizer custom class name
   */
  resizerClassName?: string;
  /**
   * SplitPane custom style
   */
  style?: CSSProperties;
  /**
   * Resizer custom style
   */
  resizerStyle?: CSSProperties;
  /**
   * Pane1 custom style
   */
  sidebarStyle?: CSSProperties;
  /**
   * Pane2 custom style
   */
  contentStyle?: CSSProperties;
  /**
   * Persisting the current size to local storage
   * @default true
   */
  persistResize?: boolean;
  /**
   * Whether should be open by default.
   * @default true
   */
  defaultOpen?: boolean;
  /**
   * Prefix for the local storage identifier
   */
  id?: string;
  /**
   * Dock mode
   */
  dock?: boolean;
  /**
   * Threshold which used for switch the state of the sidebar
   */
  snapThreshold?: number;

  /**
   * Splitting mode
   */
  split?: 'vertical' | 'horizontal';
  /**
   * Defined which pane will be used as a sidebar.
   */
  primary?: 'first' | 'second';

  /**
   * Render opened pane even when it is in closed state
   * @default false
   */
  alwaysRender?: boolean;
}

export interface SplitPaneConfigWithDock extends BaseSplitPaneConfig {
  /**
   * Dock mode
   */
  dock: boolean;
  /**
   * Height of page elements above sidebar. Used to set height of sidebar
   */
  navHeight?: number;
}

export type SplitPaneConfig = BaseSplitPaneConfig | SplitPaneConfigWithDock;

export function configHasDock(config: SplitPaneConfig): config is SplitPaneConfigWithDock {
  return has(config, 'dock') && config.dock === true;
}

export const OpenPaneEvent = 'SplitPane.Open';
