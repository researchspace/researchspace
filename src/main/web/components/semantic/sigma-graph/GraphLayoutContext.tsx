/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useSigma } from '@react-sigma/core';
import { useLayoutCircular } from '@react-sigma/layout-circular';
import { useLayoutCirclepack } from '@react-sigma/layout-circlepack';
import { useWorkerLayoutForce } from '@react-sigma/layout-force';
import { useWorkerLayoutForceAtlas2 } from '@react-sigma/layout-forceatlas2';
import { useLayoutNoverlap } from '@react-sigma/layout-noverlap';
import { useLayoutRandom } from '@react-sigma/layout-random';
import { inferSettings } from 'graphology-layout-forceatlas2';

export type GraphLayoutName =
  | 'circular'
  | 'circlepack'
  | 'force'
  | 'forceAtlas2'
  | 'noverlap'
  | 'random';

export const GRAPH_LAYOUT_OPTIONS: ReadonlyArray<{
  value: GraphLayoutName;
  label: string;
}> = [
  { value: 'circular', label: 'Circular' },
  { value: 'circlepack', label: 'Circle pack' },
  { value: 'force', label: 'Force' },
  { value: 'forceAtlas2', label: 'ForceAtlas2' },
  { value: 'noverlap', label: 'Noverlap' },
  { value: 'random', label: 'Random' },
];

export function isWorkerGraphLayout(layout: GraphLayoutName): boolean {
  return layout === 'force' || layout === 'forceAtlas2';
}

export interface GraphLayoutController {
  selectedLayout: GraphLayoutName;
  setSelectedLayout: (layout: GraphLayoutName) => void;
  applyLayout: (layout?: GraphLayoutName) => void;
  startSelectedWorkerLayout: () => void;
  stopAllWorkerLayouts: () => void;
  clearCustomBBox: () => void;
  selectedLayoutIsRunning: boolean;
}

const GraphLayoutContext = React.createContext<GraphLayoutController | undefined>(undefined);

export const GraphLayoutProvider: React.FC = ({ children }) => {
  const sigma = useSigma();
  const [selectedLayout, setSelectedLayout] = useState<GraphLayoutName>('forceAtlas2');

  // React hooks must be created unconditionally. The selected layout determines
  // which worker is started or which synchronous assignment is applied.
  const circularLayout = useLayoutCircular();
  const circlepackLayout = useLayoutCirclepack();
  const randomLayout = useLayoutRandom();
  const noverlapLayout = useLayoutNoverlap({
    maxIterations: 100,
    settings: { margin: 5, ratio: 1.1 },
  });

  const forceLayout = useWorkerLayoutForce({});
  const forceAtlas2Settings = useMemo(
    () => inferSettings(sigma.getGraph()),
    [sigma]
  );
  const forceAtlas2Layout = useWorkerLayoutForceAtlas2({
    settings: forceAtlas2Settings,
  });

  const clearCustomBBox = useCallback(() => {
    if (sigma.getCustomBBox()) {
      sigma.setCustomBBox(null);
    }
  }, [sigma]);

  const stopAllWorkerLayouts = useCallback(() => {
    forceLayout.stop();
    forceAtlas2Layout.stop();
  }, [forceLayout.stop, forceAtlas2Layout.stop]);

  const applyLayout = useCallback(
    (layout: GraphLayoutName = selectedLayout) => {
      clearCustomBBox();
      stopAllWorkerLayouts();

      try {
        switch (layout) {
          case 'circular':
            circularLayout.assign();
            break;
          case 'circlepack':
            circlepackLayout.assign();
            break;
          case 'force':
            forceLayout.start();
            break;
          case 'forceAtlas2':
            forceAtlas2Layout.start();
            break;
          case 'noverlap':
            noverlapLayout.assign();
            break;
          case 'random':
            randomLayout.assign();
            break;
        }
        sigma.refresh();
      } catch (error) {
        console.warn(`Failed to apply ${layout} layout:`, error);
      }
    },
    [
      selectedLayout,
      clearCustomBBox,
      stopAllWorkerLayouts,
      circularLayout.assign,
      circlepackLayout.assign,
      forceLayout.start,
      forceAtlas2Layout.start,
      noverlapLayout.assign,
      randomLayout.assign,
      sigma,
    ]
  );

  const startSelectedWorkerLayout = useCallback(() => {
    if (isWorkerGraphLayout(selectedLayout)) {
      applyLayout(selectedLayout);
    }
  }, [applyLayout, selectedLayout]);

  // Apply the initial layout and immediately apply a newly selected layout.
  // Worker hooks kill their supervisors when the provider unmounts; this cleanup
  // additionally stops animation while the selection changes.
  useEffect(() => {
    applyLayout(selectedLayout);
    return stopAllWorkerLayouts;
  }, [applyLayout, selectedLayout, stopAllWorkerLayouts]);

  const selectedLayoutIsRunning =
    selectedLayout === 'force'
      ? forceLayout.isRunning
      : selectedLayout === 'forceAtlas2'
        ? forceAtlas2Layout.isRunning
        : false;

  const value = useMemo<GraphLayoutController>(
    () => ({
      selectedLayout,
      setSelectedLayout,
      applyLayout,
      startSelectedWorkerLayout,
      stopAllWorkerLayouts,
      clearCustomBBox,
      selectedLayoutIsRunning,
    }),
    [
      selectedLayout,
      applyLayout,
      startSelectedWorkerLayout,
      stopAllWorkerLayouts,
      clearCustomBBox,
      selectedLayoutIsRunning,
    ]
  );

  return (
    <GraphLayoutContext.Provider value={value}>
      {children}
    </GraphLayoutContext.Provider>
  );
};

export function useGraphLayout(): GraphLayoutController {
  const context = React.useContext(GraphLayoutContext);
  if (!context) {
    throw new Error('useGraphLayout must be used inside GraphLayoutProvider');
  }
  return context;
}

export default GraphLayoutContext;
