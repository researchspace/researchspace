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

import { ControlsContainer, useCamera } from '@react-sigma/core';
import { useGraphLayout } from './GraphLayoutContext';
import LayoutControl from './LayoutControl';
import ZoomControl from './ZoomControl';

export interface GraphControlsProps {
  position?: 'bottom-right' | 'top-right' | 'top-left' | 'bottom-left';
  layoutControls?: boolean;
}

/**
 * Main graph toolbar. LayoutControl deliberately shares this ControlsContainer
 * with zoom and camera reset so React Sigma positions the controls as one cluster.
 */
export const GraphControls: React.FC<GraphControlsProps> = ({
  position = 'bottom-right',
  layoutControls = true,
}) => {
  const { reset } = useCamera({ duration: 200 });
  const { clearCustomBBox } = useGraphLayout();
  const menuPlacement = position.endsWith('right') ? 'left' : 'right';
  const seeWholeGraph = () => {
    // Keep Sigma, the selected layout, filters and expanded nodes mounted.
    // Recreating the graph here reapplies its initial (usually circular) layout.
    clearCustomBBox();
    reset();
  };

  return (
    <ControlsContainer position={position}>
      <ZoomControl resetFunction={seeWholeGraph}>
        <AiOutlineZoomIn />
        <AiOutlineZoomOut />
        <MdFilterCenterFocus />
      </ZoomControl>
      {layoutControls && <LayoutControl menuPlacement={menuPlacement} />}
    </ControlsContainer>
  );
};

export default GraphControls;
