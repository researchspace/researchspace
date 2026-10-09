/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { MultiDirectedGraph } from 'graphology';
import circular from 'graphology-layout/circular';
import circlepack from 'graphology-layout/circlepack';
import random from 'graphology-layout/random';
import noverlap from 'graphology-layout-noverlap';
import ForceSupervisor from 'graphology-layout-force/worker';
import FA2Layout from 'graphology-layout-forceatlas2/worker';
import { inferSettings } from 'graphology-layout-forceatlas2';
import { SigmaGraphLayout } from './Config';

export type ContinuousLayout = 'force' | 'forceAtlas2';
export interface LayoutSupervisor {
  start(): void;
  kill(): void;
}
export interface LayoutSnapshot {
  appliedLayout: SigmaGraphLayout;
  /** User intent, retained during a temporary pause. */
  activeLayout?: ContinuousLayout;
  runningLayout?: ContinuousLayout;
  message?: string;
}
export interface LayoutRunOptions {
  layoutRunDuration?: number;
  maxForceNodes?: number;
}
export interface LayoutPause {
  generation: number;
}
/** A node interaction may restart the layout until Stop or Apply supersedes it. */
export interface LayoutExploration {
  generation: number;
}
export function isContinuousLayout(layout: SigmaGraphLayout): layout is ContinuousLayout {
  return layout === 'force' || layout === 'forceAtlas2';
}
export function createLayoutSupervisor(layout: ContinuousLayout, graph: MultiDirectedGraph): LayoutSupervisor {
  return layout === 'force' ? new ForceSupervisor(graph, {}) : new FA2Layout(graph, { settings: inferSettings(graph) });
}

/** One supervisor per graph. Stop invalidates every older temporary-pause token. */
export class GraphLayoutRunner {
  private snapshot: LayoutSnapshot = { appliedLayout: 'circular' };
  private supervisor: LayoutSupervisor;
  private pauses = new Set<LayoutPause>();
  private generation = 0;
  private visible = true;
  private disposed = false;
  private timer: number;
  private startedAt: number;
  private remaining: number;
  private readonly duration: number;
  private readonly maxForceNodes: number;

  constructor(
    private graph: MultiDirectedGraph,
    private changed: (snapshot: LayoutSnapshot) => void,
    options: LayoutRunOptions = {},
    private createSupervisor = createLayoutSupervisor
  ) {
    this.duration = Number.isFinite(options.layoutRunDuration) ? Math.max(0, options.layoutRunDuration) : 10000;
    this.maxForceNodes = Number.isFinite(options.maxForceNodes) ? Math.max(1, options.maxForceNodes) : 500;
  }
  getSnapshot(): LayoutSnapshot {
    return this.snapshot;
  }
  private publish(update: Partial<LayoutSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...update };
    if (!this.disposed) this.changed(this.snapshot);
  }
  private releaseSupervisor(): void {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }
    if (this.startedAt !== undefined && this.duration > 0) {
      this.remaining = Math.max(0, this.remaining - (Date.now() - this.startedAt));
    }
    this.startedAt = undefined;
    if (this.supervisor) {
      // Destroy before topology changes: FA2 0.10.1 otherwise schedules worker
      // respawns for added/dropped nodes even when its supervisor is stopped.
      this.supervisor.kill();
      this.supervisor = undefined;
    }
  }
  stop(): void {
    ++this.generation;
    this.pauses.clear();
    this.finishRun();
  }
  private finishRun(): void {
    this.releaseSupervisor();
    this.publish({ activeLayout: undefined, runningLayout: undefined });
  }
  apply(layout: SigmaGraphLayout, preservePositions = false): void {
    if (this.disposed) return;
    this.stop();
    this.remaining = this.duration;
    this.publish({ appliedLayout: layout, message: undefined });
    if (preservePositions) return;
    if (isContinuousLayout(layout)) {
      this.publish({ activeLayout: layout });
      this.startIfAllowed();
    } else if (this.graph.order > 0) {
      switch (layout) {
        case 'circular':
          circular.assign(this.graph);
          break;
        case 'circlepack':
          circlepack.assign(this.graph);
          break;
        case 'random':
          random.assign(this.graph);
          break;
        case 'noverlap':
          noverlap.assign(this.graph, { maxIterations: 100, settings: { margin: 5, ratio: 1.1 } });
          break;
      }
    }
  }
  pause(): LayoutPause {
    const token = { generation: this.generation };
    this.pauses.add(token);
    this.releaseSupervisor();
    this.publish({ runningLayout: undefined });
    return token;
  }
  resume(token?: LayoutPause): void {
    if (!token || token.generation !== this.generation || !this.pauses.delete(token)) return;
    this.startIfAllowed();
  }
  setVisible(visible: boolean): void {
    if (this.visible === visible || this.disposed) return;
    this.visible = visible;
    if (!visible) {
      this.releaseSupervisor();
      this.publish({ runningLayout: undefined });
    } else this.startIfAllowed();
  }
  /** Reuse a running supervisor for clicks; rebuild only when the graph changes. */
  explore(change?: () => void): LayoutExploration | undefined {
    if (this.disposed) return undefined;
    const exploration = { generation: this.generation };
    if (change) this.mutate(change, exploration);
    else this.refreshExploration(exploration);
    return exploration;
  }
  private refreshExploration(exploration?: LayoutExploration): void {
    if (!exploration || exploration.generation !== this.generation || !isContinuousLayout(this.snapshot.appliedLayout)) {
      return;
    }
    this.remaining = this.duration;
    this.publish({ activeLayout: this.snapshot.appliedLayout, message: undefined });
    if (this.supervisor) this.scheduleStop();
    else this.startIfAllowed();
  }
  mutate(change: () => void, exploration?: LayoutExploration): void {
    if (this.disposed) return;
    const token = this.pause();
    try {
      change();
      if (!isContinuousLayout(this.snapshot.appliedLayout)) this.apply(this.snapshot.appliedLayout);
      else this.refreshExploration(exploration);
    } finally {
      this.resume(token);
    }
  }
  private scheduleStop(): void {
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.startedAt = Date.now();
    if (this.duration > 0) {
      this.timer = window.setTimeout(() => {
        // Expiry ends this run, but a pending expansion still gets a fresh run
        // when it arrives. Explicit Stop invalidates its exploration token.
        this.finishRun();
        this.publish({ message: 'Layout time limit reached. Click a node or press Start to continue.' });
      }, this.remaining);
    }
  }
  private startIfAllowed(): void {
    if (this.disposed || !this.visible || this.pauses.size || this.supervisor || !this.snapshot.activeLayout) return;
    if (this.graph.order === 0 || (this.duration > 0 && this.remaining <= 0)) {
      this.finishRun();
      return;
    }
    let layout = this.snapshot.activeLayout;
    if (layout === 'force' && this.graph.order > this.maxForceNodes) {
      layout = 'forceAtlas2';
      this.publish({
        activeLayout: layout,
        appliedLayout: layout,
        message: 'Using ForceAtlas2: Force is limited to ' + this.maxForceNodes + ' nodes.',
      });
    }
    try {
      this.supervisor = this.createSupervisor(layout, this.graph);
      this.supervisor.start();
      this.scheduleStop();
      this.publish({ runningLayout: layout });
    } catch (error) {
      this.stop();
      this.publish({ message: 'Unable to start layout: ' + String(error) });
    }
  }
  dispose(): void {
    this.disposed = true;
    this.stop();
  }
}
