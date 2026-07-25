/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

export interface GraphLayoutOption {
  value: GraphLayoutName;
  label: string;
}

export const GRAPH_LAYOUT_OPTIONS: ReadonlyArray<GraphLayoutOption> = [
  { value: 'circular', label: 'Circular' },
  { value: 'circlepack', label: 'Circle pack' },
  { value: 'force', label: 'Force' },
  { value: 'forceAtlas2', label: 'ForceAtlas2' },
  { value: 'noverlap', label: 'Noverlap' },
  { value: 'random', label: 'Random' },
];

export const DEFAULT_GRAPH_LAYOUT: GraphLayoutName = 'circular';

export function isGraphLayoutName(layout: any): layout is GraphLayoutName {
  return GRAPH_LAYOUT_OPTIONS.some((option) => option.value === layout);
}

export function isWorkerGraphLayout(layout?: GraphLayoutName): boolean {
  return layout === 'force' || layout === 'forceAtlas2';
}

export interface GraphLayoutController {
  /** Layout currently selected in the layout control. Changing this does not run the layout. */
  selectedLayout: GraphLayoutName;

  /** Layout last actually applied or started. Used after graph mutations. */
  appliedLayout: GraphLayoutName;

  layoutOptions: ReadonlyArray<GraphLayoutOption>;
  setSelectedLayout: (layout: GraphLayoutName) => void;
  applyLayout: (layout?: GraphLayoutName) => void;
  startSelectedWorkerLayout: () => void;
  stopAllWorkerLayouts: () => void;
  clearCustomBBox: () => void;
  selectedLayoutIsRunning: boolean;
}

export interface GraphLayoutProviderProps {
  /**
   * Initial layout to apply once after the Sigma instance mounts.
   * When omitted, the provider applies DEFAULT_GRAPH_LAYOUT.
   */
  initialLayout?: GraphLayoutName;
}

interface WorkerLayoutStatus {
  force: boolean;
  forceAtlas2: boolean;
}

interface LayoutControls {
  apply: () => void;
  stop?: () => void;
  isWorker?: boolean;
}

const EMPTY_WORKER_STATUS: WorkerLayoutStatus = {
  force: false,
  forceAtlas2: false,
};

const GraphLayoutContext = React.createContext<GraphLayoutController | undefined>(undefined);

interface LayoutBindingProps {
  layout: GraphLayoutName;
  pendingLayout?: GraphLayoutName;
  registerLayoutControls: (layout: GraphLayoutName, controls: LayoutControls | null) => void;
  onPendingLayoutHandled: (layout: GraphLayoutName) => void;
  onWorkerStatusChange: (layout: GraphLayoutName, isRunning: boolean) => void;
}

function useRegisteredLayout(
  layout: GraphLayoutName,
  controls: LayoutControls,
  pendingLayout: GraphLayoutName | undefined,
  registerLayoutControls: (layout: GraphLayoutName, controls: LayoutControls | null) => void,
  onPendingLayoutHandled: (layout: GraphLayoutName) => void
): void {
  useEffect(() => {
    registerLayoutControls(layout, controls);

    return () => {
      registerLayoutControls(layout, null);
    };
  }, [controls, layout, registerLayoutControls]);

  useEffect(() => {
    if (pendingLayout !== layout) {
      return;
    }

    controls.apply();
    onPendingLayoutHandled(layout);
  }, [controls, layout, onPendingLayoutHandled, pendingLayout]);
}

const CircularLayoutBinding: React.FC<LayoutBindingProps> = ({
  layout,
  pendingLayout,
  registerLayoutControls,
  onPendingLayoutHandled,
}) => {
  const sigma = useSigma();
  const circularLayout = useLayoutCircular();

  const apply = useCallback(() => {
    circularLayout.assign();
    sigma.refresh();
  }, [circularLayout.assign, sigma]);

  const controls = useMemo<LayoutControls>(() => ({ apply }), [apply]);

  useRegisteredLayout(
    layout,
    controls,
    pendingLayout,
    registerLayoutControls,
    onPendingLayoutHandled
  );

  return null;
};

const CirclepackLayoutBinding: React.FC<LayoutBindingProps> = ({
  layout,
  pendingLayout,
  registerLayoutControls,
  onPendingLayoutHandled,
}) => {
  const sigma = useSigma();
  const circlepackLayout = useLayoutCirclepack();

  const apply = useCallback(() => {
    circlepackLayout.assign();
    sigma.refresh();
  }, [circlepackLayout.assign, sigma]);

  const controls = useMemo<LayoutControls>(() => ({ apply }), [apply]);

  useRegisteredLayout(
    layout,
    controls,
    pendingLayout,
    registerLayoutControls,
    onPendingLayoutHandled
  );

  return null;
};

const NoverlapLayoutBinding: React.FC<LayoutBindingProps> = ({
  layout,
  pendingLayout,
  registerLayoutControls,
  onPendingLayoutHandled,
}) => {
  const sigma = useSigma();
  const noverlapLayout = useLayoutNoverlap({
    maxIterations: 100,
    settings: { margin: 5, ratio: 1.1 },
  });

  const apply = useCallback(() => {
    noverlapLayout.assign();
    sigma.refresh();
  }, [noverlapLayout.assign, sigma]);

  const controls = useMemo<LayoutControls>(() => ({ apply }), [apply]);

  useRegisteredLayout(
    layout,
    controls,
    pendingLayout,
    registerLayoutControls,
    onPendingLayoutHandled
  );

  return null;
};

const RandomLayoutBinding: React.FC<LayoutBindingProps> = ({
  layout,
  pendingLayout,
  registerLayoutControls,
  onPendingLayoutHandled,
}) => {
  const sigma = useSigma();
  const randomLayout = useLayoutRandom();

  const apply = useCallback(() => {
    randomLayout.assign();
    sigma.refresh();
  }, [randomLayout.assign, sigma]);

  const controls = useMemo<LayoutControls>(() => ({ apply }), [apply]);

  useRegisteredLayout(
    layout,
    controls,
    pendingLayout,
    registerLayoutControls,
    onPendingLayoutHandled
  );

  return null;
};

const ForceLayoutBinding: React.FC<LayoutBindingProps> = ({
  layout,
  pendingLayout,
  registerLayoutControls,
  onPendingLayoutHandled,
  onWorkerStatusChange,
}) => {
  const forceLayout = useWorkerLayoutForce({});

  const stop = useCallback(() => {
    forceLayout.stop();
  }, [forceLayout.stop]);

  const apply = useCallback(() => {
    forceLayout.stop();
    forceLayout.start();
  }, [forceLayout.start, forceLayout.stop]);

  const controls = useMemo<LayoutControls>(
    () => ({ apply, stop, isWorker: true }),
    [apply, stop]
  );

  useRegisteredLayout(
    layout,
    controls,
    pendingLayout,
    registerLayoutControls,
    onPendingLayoutHandled
  );

  useEffect(() => {
    onWorkerStatusChange(layout, forceLayout.isRunning);
  }, [forceLayout.isRunning, layout, onWorkerStatusChange]);

  useEffect(() => {
    return () => {
      forceLayout.stop();
      onWorkerStatusChange(layout, false);
    };
  }, [forceLayout.stop, layout, onWorkerStatusChange]);

  return null;
};

const ForceAtlas2LayoutBinding: React.FC<LayoutBindingProps> = ({
  layout,
  pendingLayout,
  registerLayoutControls,
  onPendingLayoutHandled,
  onWorkerStatusChange,
}) => {
  const sigma = useSigma();
  const forceAtlas2Settings = useMemo(
    () => inferSettings(sigma.getGraph()),
    [sigma]
  );
  const forceAtlas2Layout = useWorkerLayoutForceAtlas2({
    settings: forceAtlas2Settings,
  });

  const stop = useCallback(() => {
    forceAtlas2Layout.stop();
  }, [forceAtlas2Layout.stop]);

  const apply = useCallback(() => {
    forceAtlas2Layout.stop();
    forceAtlas2Layout.start();
  }, [forceAtlas2Layout.start, forceAtlas2Layout.stop]);

  const controls = useMemo<LayoutControls>(
    () => ({ apply, stop, isWorker: true }),
    [apply, stop]
  );

  useRegisteredLayout(
    layout,
    controls,
    pendingLayout,
    registerLayoutControls,
    onPendingLayoutHandled
  );

  useEffect(() => {
    onWorkerStatusChange(layout, forceAtlas2Layout.isRunning);
  }, [forceAtlas2Layout.isRunning, layout, onWorkerStatusChange]);

  useEffect(() => {
    return () => {
      forceAtlas2Layout.stop();
      onWorkerStatusChange(layout, false);
    };
  }, [forceAtlas2Layout.stop, layout, onWorkerStatusChange]);

  return null;
};

const LayoutBinding: React.FC<LayoutBindingProps> = (props) => {
  switch (props.layout) {
    case 'circular':
      return <CircularLayoutBinding {...props} />;
    case 'circlepack':
      return <CirclepackLayoutBinding {...props} />;
    case 'force':
      return <ForceLayoutBinding {...props} />;
    case 'forceAtlas2':
      return <ForceAtlas2LayoutBinding {...props} />;
    case 'noverlap':
      return <NoverlapLayoutBinding {...props} />;
    case 'random':
      return <RandomLayoutBinding {...props} />;
    default:
      return null;
  }
};

export const GraphLayoutProvider: React.FC<GraphLayoutProviderProps> = ({
  initialLayout,
  children,
}) => {
  const sigma = useSigma();
  const initialLayoutToUse = isGraphLayoutName(initialLayout)
    ? initialLayout
    : DEFAULT_GRAPH_LAYOUT;

  const [selectedLayout, setSelectedLayoutState] = useState<GraphLayoutName>(
    initialLayoutToUse
  );
  const [appliedLayout, setAppliedLayout] = useState<GraphLayoutName>(
    initialLayoutToUse
  );
  const [pendingLayout, setPendingLayout] = useState<GraphLayoutName | undefined>(undefined);
  const [workerStatus, setWorkerStatus] = useState<WorkerLayoutStatus>(EMPTY_WORKER_STATUS);

  const initialLayoutAppliedRef = useRef(false);
  const layoutControlsRef = useRef<Partial<Record<GraphLayoutName, LayoutControls>>>({});
  const workerStatusRef = useRef<WorkerLayoutStatus>(EMPTY_WORKER_STATUS);
  const lastStoppedWorkerLayoutRef = useRef<GraphLayoutName | null>(null);

  useEffect(() => {
    workerStatusRef.current = workerStatus;
  }, [workerStatus]);

  const setSelectedLayout = useCallback((layout: GraphLayoutName) => {
    if (isGraphLayoutName(layout)) {
      setSelectedLayoutState(layout);
    }
  }, []);

  const registerLayoutControls = useCallback(
    (layout: GraphLayoutName, controls: LayoutControls | null) => {
      if (controls) {
        layoutControlsRef.current[layout] = controls;
      } else {
        delete layoutControlsRef.current[layout];
      }
    },
    []
  );

  const handleWorkerStatusChange = useCallback((layout: GraphLayoutName, isRunning: boolean) => {
    setWorkerStatus((current) => {
      if (layout === 'force') {
        return current.force === isRunning
          ? current
          : { ...current, force: isRunning };
      }

      if (layout === 'forceAtlas2') {
        return current.forceAtlas2 === isRunning
          ? current
          : { ...current, forceAtlas2: isRunning };
      }

      return current;
    });
  }, []);

  const clearCustomBBox = useCallback(() => {
    if (sigma.getCustomBBox()) {
      sigma.setCustomBBox(null);
    }
  }, [sigma]);

  const stopRegisteredWorkerLayouts = useCallback(() => {
    const controls = layoutControlsRef.current;

    if (controls.force && controls.force.stop) {
      controls.force.stop();
    }

    if (controls.forceAtlas2 && controls.forceAtlas2.stop) {
      controls.forceAtlas2.stop();
    }
  }, []);

  const stopAllWorkerLayouts = useCallback(() => {
    const status = workerStatusRef.current;

    if (appliedLayout === 'force' && status.force) {
      lastStoppedWorkerLayoutRef.current = 'force';
    } else if (appliedLayout === 'forceAtlas2' && status.forceAtlas2) {
      lastStoppedWorkerLayoutRef.current = 'forceAtlas2';
    }

    stopRegisteredWorkerLayouts();
  }, [appliedLayout, stopRegisteredWorkerLayouts]);

  const completeLayoutApplication = useCallback((layout: GraphLayoutName) => {
    setAppliedLayout(layout);
    setPendingLayout(undefined);
  }, []);

  const applyLayout = useCallback(
    (layout: GraphLayoutName = selectedLayout) => {
      if (!isGraphLayoutName(layout)) {
        return;
      }

      clearCustomBBox();
      setSelectedLayoutState(layout);
      lastStoppedWorkerLayoutRef.current = null;

      try {
        // A new explicit layout request replaces any running continuous layout.
        stopRegisteredWorkerLayouts();

        const controls = layoutControlsRef.current[layout];
        if (controls) {
          controls.apply();
          completeLayoutApplication(layout);
        } else {
          // The hook for this layout is intentionally mounted lazily. Request it
          // and let the binding apply the layout once it has registered itself.
          setPendingLayout(layout);
        }
      } catch (error) {
        console.warn(`Failed to apply ${layout} layout:`, error);
      }
    },
    [clearCustomBBox, completeLayoutApplication, selectedLayout, stopRegisteredWorkerLayouts]
  );

  /**
   * Resume a worker layout only when this provider previously stopped a running
   * worker layout during drag or topology mutation. This prevents ordinary node
   * clicks from starting Force/ForceAtlas2 merely because the layout is selected
   * in the menu.
   */
  const startSelectedWorkerLayout = useCallback(() => {
    const layoutToResume = lastStoppedWorkerLayoutRef.current;

    if (
      layoutToResume &&
      isWorkerGraphLayout(layoutToResume) &&
      layoutToResume === appliedLayout
    ) {
      applyLayout(layoutToResume);
    }
  }, [appliedLayout, applyLayout]);

  useEffect(() => {
    if (initialLayoutAppliedRef.current) {
      return;
    }

    initialLayoutAppliedRef.current = true;

    const timeoutId = window.setTimeout(() => {
      applyLayout(initialLayoutToUse);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [applyLayout, initialLayoutToUse]);

  useEffect(() => {
    return () => {
      stopRegisteredWorkerLayouts();
    };
  }, [stopRegisteredWorkerLayouts]);

  const selectedLayoutIsRunning =
    selectedLayout === 'force'
      ? workerStatus.force
      : selectedLayout === 'forceAtlas2'
        ? workerStatus.forceAtlas2
        : false;

  const value = useMemo<GraphLayoutController>(
    () => ({
      selectedLayout,
      appliedLayout,
      layoutOptions: GRAPH_LAYOUT_OPTIONS,
      setSelectedLayout,
      applyLayout,
      startSelectedWorkerLayout,
      stopAllWorkerLayouts,
      clearCustomBBox,
      selectedLayoutIsRunning,
    }),
    [
      selectedLayout,
      appliedLayout,
      setSelectedLayout,
      applyLayout,
      startSelectedWorkerLayout,
      stopAllWorkerLayouts,
      clearCustomBBox,
      selectedLayoutIsRunning,
    ]
  );

  const mountedLayouts = useMemo(() => {
    const layouts = new Set<GraphLayoutName>();
    layouts.add(appliedLayout);
    if (pendingLayout) {
      layouts.add(pendingLayout);
    }
    return Array.from(layouts);
  }, [appliedLayout, pendingLayout]);

  return (
    <GraphLayoutContext.Provider value={value}>
      {mountedLayouts.map((layout) => (
        <LayoutBinding
          key={layout}
          layout={layout}
          pendingLayout={pendingLayout}
          registerLayoutControls={registerLayoutControls}
          onPendingLayoutHandled={completeLayoutApplication}
          onWorkerStatusChange={handleWorkerStatusChange}
        />
      ))}
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
