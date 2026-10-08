/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as _ from 'lodash';

import { trigger, listen } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';

import {
  ComponentState,
  RegisterComponent,
  UnregisterComponent,
  UpdateSharedState,
  RequestCurrentState,
  SyncStateToComponent,
  StateResolved,
  SyncStateData,
} from './AppStateEvents';

export interface SharedStateManagerOptions {
  componentId: string;
  sharedStateVars: string[];
  /**
   * Id of the app-state component. When undefined, events are sent without target
   * and reach only app-state components without id.
   */
  appStateId?: string;
  onStateSync: (data: SyncStateData) => void;
  onStateResolved: (hasStoredState: boolean) => void;
}

/**
 * Connects one component to its app-state component through events.
 *
 * Only the declared shared variables are sent, and only when their value has changed
 * since it was last sent or received, so that a state received from app-state is not
 * echoed back.
 */
export class SharedStateManager {
  private readonly cancellation = new Cancellation();
  /**
   * Last value sent or received for each shared variable, as JSON.
   */
  private readonly knownValues: { [varName: string]: string } = {};

  constructor(private readonly options: SharedStateManagerOptions) {
    this.cancellation
      .map(listen({ eventType: SyncStateToComponent, target: options.componentId }))
      .onValue((event) => {
        this.remember(event.data.state);
        options.onStateSync(event.data);
      });
    this.cancellation
      .map(listen({ eventType: StateResolved, target: options.componentId }))
      .onValue((event) => options.onStateResolved(event.data.hasStoredState));
  }

  get componentId(): string {
    return this.options.componentId;
  }

  getSharedStateVars(): string[] {
    return [...this.options.sharedStateVars];
  }

  isSharedVariable(varName: string): boolean {
    return this.options.sharedStateVars.indexOf(varName) >= 0;
  }

  /**
   * Registers the component with app-state, with its initial shared state.
   */
  register(currentState: ComponentState) {
    const initial = this.extractSharedState(currentState);
    this.remember(initial);
    trigger({
      eventType: RegisterComponent,
      source: this.options.componentId,
      targets: this.targets(),
      data: {
        componentId: this.options.componentId,
        sharedStateVars: this.getSharedStateVars(),
        currentState: initial,
      },
    });
  }

  unregister() {
    trigger({
      eventType: UnregisterComponent,
      source: this.options.componentId,
      targets: this.targets(),
      data: this.options.componentId,
    });
    this.cancellation.cancelAll();
  }

  /**
   * Sends the shared variables of `state` whose value has changed.
   *
   * @param sendAllIfChanged when any variable has changed, send all the variables of
   *   `state`, for variables that are only meaningful together.
   */
  updateSharedState(state: ComponentState, sendAllIfChanged = false) {
    const shared = this.extractSharedState(state);
    const changes: ComponentState = {};
    _.forEach(shared, (value, varName) => {
      if (this.knownValues[varName] !== JSON.stringify(value)) {
        changes[varName] = value;
      }
    });
    if (_.isEmpty(changes)) {
      return;
    }
    if (sendAllIfChanged) {
      Object.assign(changes, shared);
    }
    this.remember(changes);
    trigger({
      eventType: UpdateSharedState,
      source: this.options.componentId,
      targets: this.targets(),
      data: { componentId: this.options.componentId, stateUpdates: changes },
    });
  }

  /**
   * Records the shared variables of `state` as already known to app-state, without
   * sending them. Later updates are sent only if they differ from these values.
   */
  setBaseline(state: ComponentState) {
    this.remember(this.extractSharedState(state));
  }

  requestCurrentState() {
    trigger({
      eventType: RequestCurrentState,
      source: this.options.componentId,
      targets: this.targets(),
      data: { componentId: this.options.componentId },
    });
  }

  /**
   * Keeps the declared shared variables of `state` that have a value.
   */
  extractSharedState(state: ComponentState): ComponentState {
    const shared: ComponentState = {};
    if (!state) {
      return shared;
    }
    this.options.sharedStateVars.forEach((varName) => {
      if (state[varName] !== undefined) {
        shared[varName] = state[varName];
      }
    });
    return shared;
  }

  private remember(state: ComponentState) {
    _.forEach(state, (value, varName) => {
      this.knownValues[varName] = JSON.stringify(value);
    });
  }

  private targets(): string[] | undefined {
    return this.options.appStateId ? [this.options.appStateId] : undefined;
  }
}

/**
 * Parses the `shared-state-vars` attribute: a comma separated string or an array.
 */
export function parseSharedStateVars(sharedStateVars?: string | string[]): string[] {
  if (!sharedStateVars) {
    return [];
  }
  const vars = Array.isArray(sharedStateVars) ? sharedStateVars : sharedStateVars.split(',');
  return _.uniq(vars.map((name) => name.trim()).filter((name) => name.length > 0));
}
