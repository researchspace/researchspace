/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSigma } from '@react-sigma/core';
import { MultiDirectedGraph } from 'graphology';
import { SigmaGraphLayout } from './Config';
import {
  GraphLayoutRunner,
  LayoutExploration,
  LayoutPause,
  LayoutRunOptions,
  LayoutSnapshot,
  isContinuousLayout,
} from './GraphLayoutRunner';

export type GraphLayoutName = SigmaGraphLayout;
export const GRAPH_LAYOUT_OPTIONS: ReadonlyArray<{ value: GraphLayoutName; label: string }> = [
  { value: 'circular', label: 'Circular' },
  { value: 'circlepack', label: 'Circle pack' },
  { value: 'force', label: 'Force (small graphs)' },
  { value: 'forceAtlas2', label: 'ForceAtlas2' },
  { value: 'noverlap', label: 'Noverlap' },
  { value: 'random', label: 'Random' },
];
export const DEFAULT_GRAPH_LAYOUT: GraphLayoutName = 'circular';
export function isGraphLayoutName(layout: any): layout is GraphLayoutName {
  return GRAPH_LAYOUT_OPTIONS.some((option) => option.value === layout);
}
export const isWorkerGraphLayout = isContinuousLayout;
export interface GraphLayoutController extends LayoutSnapshot {
  selectedLayout: GraphLayoutName;
  layoutOptions: typeof GRAPH_LAYOUT_OPTIONS;
  setSelectedLayout: (layout: GraphLayoutName) => void;
  applyLayout: (layout?: GraphLayoutName) => void;
  stopAllWorkerLayouts: () => void;
  pauseLayout: () => LayoutPause;
  resumeLayout: (token?: LayoutPause) => void;
  exploreGraph: (change?: () => void) => LayoutExploration | undefined;
  mutateGraph: (change: () => void, exploration?: LayoutExploration) => void;
  clearCustomBBox: () => void;
  selectedLayoutIsRunning: boolean;
}
export interface GraphLayoutProviderProps extends LayoutRunOptions {
  initialLayout?: GraphLayoutName;
  preservePositions?: boolean;
}
const GraphLayoutContext = React.createContext<GraphLayoutController | undefined>(undefined);
export const GraphLayoutProvider: React.FC<GraphLayoutProviderProps> = ({
  initialLayout,
  preservePositions,
  layoutRunDuration,
  maxForceNodes,
  children,
}) => {
  const sigma = useSigma();
  const initial = isGraphLayoutName(initialLayout) ? initialLayout : DEFAULT_GRAPH_LAYOUT;
  const [selectedLayout, setSelectedLayout] = useState<GraphLayoutName>(initial);
  const [snapshot, setSnapshot] = useState<LayoutSnapshot>({ appliedLayout: initial });
  const runnerRef = useRef<GraphLayoutRunner>();
  const clearCustomBBox = useCallback(() => {
    if (sigma.getCustomBBox()) sigma.setCustomBBox(null);
  }, [sigma]);

  useEffect(() => {
    const runner = new GraphLayoutRunner(sigma.getGraph() as MultiDirectedGraph, setSnapshot, {
      layoutRunDuration,
      maxForceNodes,
    });
    runnerRef.current = runner;
    const container = sigma.getContainer();
    const ownerDocument = container.ownerDocument;
    const ownerWindow = ownerDocument.defaultView;
    let inViewport = true;
    const updateVisibility = () =>
      runner.setVisible(!ownerDocument.hidden && inViewport && container.getClientRects().length > 0);
    const Observer = ownerWindow && (ownerWindow as any).IntersectionObserver;
    const observer = Observer
      ? new Observer((entries: IntersectionObserverEntry[]) => {
          inViewport = entries[0].isIntersecting;
          updateVisibility();
        })
      : undefined;
    if (observer) observer.observe(container);
    ownerDocument.addEventListener('visibilitychange', updateVisibility);
    updateVisibility();
    runner.apply(initial, preservePositions);
    return () => {
      if (observer) observer.disconnect();
      ownerDocument.removeEventListener('visibilitychange', updateVisibility);
      runnerRef.current = undefined;
      runner.dispose();
    };
  }, [sigma, initial, preservePositions, layoutRunDuration, maxForceNodes]);

  const applyLayout = useCallback(
    (layout: GraphLayoutName = selectedLayout) => {
      if (!isGraphLayoutName(layout)) return;
      clearCustomBBox();
      runnerRef.current?.apply(layout);
      setSelectedLayout(runnerRef.current?.getSnapshot().appliedLayout || layout);
    },
    [selectedLayout, clearCustomBBox]
  );
  const stopAllWorkerLayouts = useCallback(() => runnerRef.current?.stop(), []);
  const pauseLayout = useCallback(() => runnerRef.current?.pause(), []);
  const resumeLayout = useCallback((token?: LayoutPause) => runnerRef.current?.resume(token), []);
  const exploreGraph = useCallback(
    (change?: () => void) => {
      clearCustomBBox();
      return runnerRef.current?.explore(change);
    },
    [clearCustomBBox]
  );
  const mutateGraph = useCallback(
    (change: () => void, exploration?: LayoutExploration) => {
      clearCustomBBox();
      runnerRef.current?.mutate(change, exploration);
    },
    [clearCustomBBox]
  );
  const value = useMemo<GraphLayoutController>(
    () => ({
      ...snapshot,
      selectedLayout,
      layoutOptions: GRAPH_LAYOUT_OPTIONS,
      setSelectedLayout,
      applyLayout,
      stopAllWorkerLayouts,
      pauseLayout,
      resumeLayout,
      exploreGraph,
      mutateGraph,
      clearCustomBBox,
      selectedLayoutIsRunning: snapshot.runningLayout === selectedLayout,
    }),
    [
      snapshot,
      selectedLayout,
      applyLayout,
      stopAllWorkerLayouts,
      pauseLayout,
      resumeLayout,
      exploreGraph,
      mutateGraph,
      clearCustomBBox,
    ]
  );
  return <GraphLayoutContext.Provider value={value}>{children}</GraphLayoutContext.Provider>;
};
export function useGraphLayout(): GraphLayoutController {
  const context = React.useContext(GraphLayoutContext);
  if (!context) throw new Error('useGraphLayout must be used inside GraphLayoutProvider');
  return context;
}
export default GraphLayoutContext;
