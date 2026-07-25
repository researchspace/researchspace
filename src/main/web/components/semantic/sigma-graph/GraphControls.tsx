/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';

import {
  AiOutlineZoomIn,
  AiOutlineZoomOut,
} from 'react-icons/ai';
import { MdFilterCenterFocus } from 'react-icons/md';

import { ControlsContainer } from '@react-sigma/core';
import LayoutControl from './LayoutControl';
import ZoomControl from './ZoomControl';

export interface GraphControlsProps {
  position?: 'bottom-right' | 'top-right' | 'top-left' | 'bottom-left';
  reset: () => void;
}

/**
 * Main graph toolbar. LayoutControl deliberately shares this ControlsContainer
 * with zoom and reset so React Sigma positions the controls as one cluster.
 */
export const GraphControls: React.FC<GraphControlsProps> = ({
  position = 'bottom-right',
  reset,
}) => {
  const menuPlacement = position.endsWith('right') ? 'left' : 'right';

  return (
    <ControlsContainer position={position}>
      <ZoomControl resetFunction={reset}>
        <AiOutlineZoomIn />
        <AiOutlineZoomOut />
        <MdFilterCenterFocus />
      </ZoomControl>
      <LayoutControl menuPlacement={menuPlacement} />
    </ControlsContainer>
  );
};

export default GraphControls;
