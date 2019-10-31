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
}

export interface SplitPaneConfigWithDock extends BaseSplitPaneConfig {
  /**
   * Dock mode
   */
  dock: boolean;
  /**
   * Height of page elements above sidebar. Used to set height of sidebar
   */
  navHeight?: number
}

export type SplitPaneConfig = BaseSplitPaneConfig | SplitPaneConfigWithDock;

export function configHasDock(
  config: SplitPaneConfig
): config is SplitPaneConfigWithDock {
  return has(config, 'dock') && config.dock === true;
}
