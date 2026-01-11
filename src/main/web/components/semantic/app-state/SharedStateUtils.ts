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

import { trigger, listen } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import {
  APP_STATE_REGISTER_COMPONENT,
  APP_STATE_UNREGISTER_COMPONENT,
  APP_STATE_UPDATE_SHARED_STATE,
  APP_STATE_SYNC_STATE_TO_COMPONENT,
  APP_STATE_REQUEST_CURRENT_STATE,
  ComponentStateRegistration
} from './AppState';

/**
 * Utility class to help components integrate with AppState
 */
export class SharedStateManager {
  private componentId: string;
  private sharedStateVars: string[];
  private appStateId?: string;
  private cancelation: Cancellation;
  private onStateSync?: (state: any) => void;

  constructor(
    componentId: string,
    sharedStateVars: string[],
    appStateId?: string,
    onStateSync?: (state: any) => void
  ) {
    this.componentId = componentId;
    this.sharedStateVars = sharedStateVars;
    this.appStateId = appStateId;
    this.onStateSync = onStateSync;
    this.cancelation = new Cancellation();

    // Listen for state sync events from AppState
    this.cancelation
      .map(
        listen({
          eventType: APP_STATE_SYNC_STATE_TO_COMPONENT,
          target: this.componentId,
        })
      )
      .onValue(this.handleStateSyncFromAppState);
  }

  /**
   * Register this component with AppState
   */
  public register(currentState: { [varName: string]: any } = {}) {
    const registration: ComponentStateRegistration = {
      componentId: this.componentId,
      sharedStateVars: this.sharedStateVars,
      currentState: this.extractSharedState(currentState)
    };

    // console.log('SharedStateManager: Registering component', this.componentId);

    trigger({
      eventType: APP_STATE_REGISTER_COMPONENT,
      source: this.componentId,
      targets: this.appStateId ? [this.appStateId] : undefined,
      data: registration
    });
  }

  /**
   * Unregister this component from AppState
   */
  public unregister() {
    // console.log('SharedStateManager: Unregistering component', this.componentId);

    trigger({
      eventType: APP_STATE_UNREGISTER_COMPONENT,
      source: this.componentId,
      targets: this.appStateId ? [this.appStateId] : undefined,
      data: this.componentId
    });

    this.cancelation.cancelAll();
  }

  /**
   * Update shared state variables in AppState
   */
  public updateSharedState(stateUpdates: { [varName: string]: any }) {
    const filteredUpdates = this.extractSharedState(stateUpdates);
    
    if (Object.keys(filteredUpdates).length === 0) {
      return; // No shared state variables to update
    }

    // console.log('SharedStateManager: Updating shared state for', this.componentId, ':', filteredUpdates);

    trigger({
      eventType: APP_STATE_UPDATE_SHARED_STATE,
      source: this.componentId,
      targets: this.appStateId ? [this.appStateId] : undefined,
      data: {
        componentId: this.componentId,
        stateUpdates: filteredUpdates
      }
    });
  }

  /**
   * Request current state from AppState
   */
  public requestCurrentState() {
    // console.log('SharedStateManager: Requesting current state for', this.componentId);

    trigger({
      eventType: APP_STATE_REQUEST_CURRENT_STATE,
      source: this.componentId,
      targets: this.appStateId ? [this.appStateId] : undefined,
      data: {
        componentId: this.componentId
      }
    });
  }

  /**
   * Handle state sync from AppState
   */
  private handleStateSyncFromAppState = (event: any) => {
    const syncedState = event.data;
    // console.log('SharedStateManager: Received state sync for', this.componentId, ':', syncedState);

    if (this.onStateSync) {
      this.onStateSync(syncedState);
    }
  };

  /**
   * Extract only the shared state variables from a state object
   */
  private extractSharedState(state: { [varName: string]: any }): { [varName: string]: any } {
    const sharedState: { [varName: string]: any } = {};
    
    this.sharedStateVars.forEach(varName => {
      if (varName in state) {
        sharedState[varName] = state[varName];
      }
    });

    return sharedState;
  }

  /**
   * Check if a state variable is shared
   */
  public isSharedVariable(varName: string): boolean {
    return this.sharedStateVars.includes(varName);
  }

  /**
   * Get the list of shared state variables
   */
  public getSharedStateVars(): string[] {
    return [...this.sharedStateVars];
  }

  /**
   * Update the list of shared state variables
   */
  public updateSharedStateVars(newSharedStateVars: string[]) {
    this.sharedStateVars = newSharedStateVars;
  }
}

/**
 * Helper function to parse shared-state-vars prop
 */
export function parseSharedStateVars(sharedStateVarsProp?: string | string[]): string[] {
  if (!sharedStateVarsProp) {
    return [];
  }

  if (Array.isArray(sharedStateVarsProp)) {
    return sharedStateVarsProp;
  }

  if (typeof sharedStateVarsProp === 'string') {
    // Handle comma-separated string
    return sharedStateVarsProp.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  return [];
}

/**
 * Find parent AppState ID by traversing DOM tree
 */
export function findParentAppStateId(element: HTMLElement | null): string | undefined {
  if (!element) return undefined;
  
  let current = element;
  while (current) {
    // Check if current element has data-app-state-id attribute
    const appStateId = current.getAttribute('data-app-state-id');
    if (appStateId) {
      // console.log(`SharedStateUtils: Found parent AppState with ID: ${appStateId}`);
      return appStateId;
    }
    
    // Move up to parent element
    current = current.parentElement;
  }
  
  // console.log('SharedStateUtils: No parent AppState found in DOM tree');
  return undefined;
}

/**
 * Helper function to create a SharedStateManager instance
 */
export function createSharedStateManager(
  componentId: string,
  sharedStateVarsProp?: string | string[],
  appStateId?: string,
  onStateSync?: (state: any) => void,
  componentElement?: HTMLElement | null
): SharedStateManager | null {
  const sharedStateVars = parseSharedStateVars(sharedStateVarsProp);
  
  if (sharedStateVars.length === 0) {
    return null; // No shared state variables, no need for manager
  }

  // If no explicit appStateId provided, try to find parent AppState in DOM
  let effectiveAppStateId = appStateId;
  if (!effectiveAppStateId && componentElement) {
    effectiveAppStateId = findParentAppStateId(componentElement);
  }

  return new SharedStateManager(componentId, sharedStateVars, effectiveAppStateId, onStateSync);
}

/**
 * Utility function to serialize state for URL
 */
export function serializeStateForUrl(state: any): string {
  try {
    return JSON.stringify(state);
  } catch (error) {
    console.error('Error serializing state for URL:', error);
    return '';
  }
}

/**
 * Utility function to deserialize state from URL
 */
export function deserializeStateFromUrl(serializedState: string): any {
  try {
    return JSON.parse(serializedState);
  } catch (error) {
    console.error('Error deserializing state from URL:', error);
    return null;
  }
}

/**
 * Utility function to deep clone state objects
 */
export function cloneState(state: any): any {
  try {
    return JSON.parse(JSON.stringify(state));
  } catch (error) {
    console.error('Error cloning state:', error);
    return state;
  }
}

/**
 * Utility function to merge state objects
 */
export function mergeStates(currentState: any, newState: any): any {
  if (!currentState) return newState;
  if (!newState) return currentState;
  
  return {
    ...currentState,
    ...newState
  };
}
