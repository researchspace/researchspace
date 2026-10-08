/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { EventMaker } from 'platform/api/events';

/**
 * Shared state of one component: shared variable name -> JSON value.
 */
export type ComponentState = { [varName: string]: any };

/**
 * Shared states of several components, keyed by component id.
 */
export type ComponentStates = { [componentId: string]: ComponentState };

/**
 * How a state is applied to a component:
 * - `merge`: only the given variables change;
 * - `replace`: the given state is the complete state of the component, variables
 *   that are missing go back to their defaults (when the component supports it).
 */
export type ApplyMode = 'merge' | 'replace';

/**
 * Where a state sent to a component comes from.
 */
export type SyncOrigin = 'url' | 'backend' | 'apply' | 'request';

export interface StateTransition {
  /**
   * Whether components should animate to the new state (e.g. map fly-to).
   */
  animate?: boolean;
  /**
   * Animation duration in milliseconds.
   */
  duration?: number;
}

export interface ComponentStateRegistration {
  componentId: string;
  sharedStateVars: string[];
  currentState: ComponentState;
}

export interface SyncStateData {
  state: ComponentState;
  mode: ApplyMode;
  origin: SyncOrigin;
  transition?: StateTransition;
}

export interface ApplyStateData {
  /**
   * States to apply, keyed by component id.
   */
  states: ComponentStates;
  /**
   * @default 'merge'
   */
  mode?: ApplyMode;
  transition?: StateTransition;
  /**
   * Whether the URL is updated with the new state.
   * Defaults to the `auto-sync` setting of the app-state component.
   */
  updateUrl?: boolean;
  /**
   * Whether the applied state counts as an unsaved change (backend mode).
   * @default false
   */
  markDirty?: boolean;
}

export interface AppStateEventData {
  /**
   * Component -> AppState: a component with shared state variables has mounted.
   */
  'AppState.RegisterComponent': ComponentStateRegistration;
  /**
   * Component -> AppState: a component has unmounted. Data is the component id.
   */
  'AppState.UnregisterComponent': string;
  /**
   * Component -> AppState: shared variables of a component have changed.
   */
  'AppState.UpdateSharedState': { componentId: string; stateUpdates: ComponentState };
  /**
   * Component -> AppState: asks AppState to send the current state of the component again.
   */
  'AppState.RequestCurrentState': { componentId: string };
  /**
   * AppState -> component: state to apply to the component.
   */
  'AppState.SyncStateToComponent': SyncStateData;
  /**
   * AppState -> component: the initial state (from URL or backend) has been resolved.
   * Sent once per registration, after the stored state (if any) has been synced.
   */
  'AppState.StateResolved': { hasStoredState: boolean };
  /**
   * Any -> AppState: applies new states to components, without reloading the page.
   */
  'AppState.ApplyState': ApplyStateData;
  /**
   * Any -> AppState: loads a state saved in the backend and applies it.
   */
  'AppState.LoadState': { stateId: string; transition?: StateTransition };
  /**
   * AppState -> any: the shared states have changed.
   */
  'AppState.StateChanged': { states: ComponentStates };
}

const event: EventMaker<AppStateEventData> = EventMaker;

export const RegisterComponent = event('AppState.RegisterComponent');
export const UnregisterComponent = event('AppState.UnregisterComponent');
export const UpdateSharedState = event('AppState.UpdateSharedState');
export const RequestCurrentState = event('AppState.RequestCurrentState');
export const SyncStateToComponent = event('AppState.SyncStateToComponent');
export const StateResolved = event('AppState.StateResolved');
export const ApplyState = event('AppState.ApplyState');
export const LoadState = event('AppState.LoadState');
export const StateChanged = event('AppState.StateChanged');
