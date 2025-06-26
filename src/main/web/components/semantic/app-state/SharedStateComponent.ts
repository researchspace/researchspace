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

import { Component, ComponentContext } from 'platform/api/components';
import { SharedStateManager, createSharedStateManager } from './SharedStateUtils';

/**
 * Interface for props that support shared state functionality
 */
export interface SharedStateProps {
  /**
   * Component ID - required for shared state functionality
   */
  id?: string;

  /**
   * Array of state variable names that should be shared with AppState.
   * Can be a string (comma-separated) or array of strings.
   * Example: ['selectedFeature', 'overlayVisualization'] or "selectedFeature,overlayVisualization"
   * 
   * Note: HTML attribute "shared-state-vars" is converted to "sharedStateVars" prop
   */
  sharedStateVars?: string | string[];

  /**
   * ID of the AppState component to sync with (optional, if not provided will sync with any AppState)
   * 
   * Note: HTML attribute "app-state-id" is converted to "appStateId" prop
   */
  appStateId?: string;
}

/**
 * Base component class that provides shared state functionality.
 * 
 * Components extending this class automatically get:
 * - Shared state management with AppState
 * - Automatic state synchronization
 * - Lifecycle management (registration/unregistration)
 * - Smart default behavior for state syncing
 * 
 * Usage:
 * ```typescript
 * export class MyComponent extends SharedStateComponent<MyProps, MyState> {
 *   // Component works automatically if state keys match shared-state-vars
 *   
 *   // Optional: Override for custom sync behavior
 *   protected handleSharedStateSync(syncedState: any): void {
 *     // Custom logic here
 *   }
 * }
 * ```
 */
export abstract class SharedStateComponent<P extends SharedStateProps, S> extends Component<P, S> {
  protected sharedStateManager: SharedStateManager | null = null;

  constructor(props: P, context: ComponentContext) {
    super(props, context);
    
    // Initialize shared state manager if shared-state-vars are provided
    this.sharedStateManager = createSharedStateManager(
      this.props.id,
      this.props.sharedStateVars,
      this.props.appStateId,
      this.handleSharedStateSync.bind(this)
    );
  }

  public componentDidMount() {
    // Call parent componentDidMount if it exists
    if (super.componentDidMount) {
      super.componentDidMount();
    }
    
    // Auto-register with AppState if shared state manager exists
    if (this.sharedStateManager) {
      console.log(`SharedStateComponent: ${this.props.id} registering with AppState. Current state:`, this.state);
      console.log(`SharedStateComponent: ${this.props.id} shared vars:`, this.sharedStateManager.getSharedStateVars());
      this.sharedStateManager.register(this.state);
      console.log(`SharedStateComponent: ${this.props.id} registered with AppState`);
    } else {
      console.log(`SharedStateComponent: ${this.props.id} has no shared state manager - sharedStateVars:`, this.props.sharedStateVars);
    }
  }

  public componentWillUnmount() {
    // Auto-unregister from AppState if shared state manager exists
    if (this.sharedStateManager) {
      this.sharedStateManager.unregister();
      console.log(`SharedStateComponent: ${this.props.id} unregistered from AppState`);
    }
    
    // Call parent componentWillUnmount if it exists
    if (super.componentWillUnmount) {
      super.componentWillUnmount();
    }
  }

  /**
   * Override React's setState to automatically sync shared state variables.
   * This ensures that any state changes are automatically propagated to AppState.
   */
  public setState<K extends keyof S>(
    state: ((prevState: Readonly<S>, props: Readonly<P>) => (Pick<S, K> | S | null)) | (Pick<S, K> | S | null),
    callback?: () => void
  ): void {
    super.setState(state, () => {
      // Auto-sync shared state variables after any setState
      this.autoSyncSharedState();
      
      // Call the original callback if provided
      if (callback) {
        callback();
      }
    });
  }

  /**
   * Handle shared state synchronization from AppState.
   * 
   * Default implementation: Automatically applies any synced state that matches 
   * component state keys and is listed in shared-state-vars.
   * 
   * Override this method for custom synchronization logic.
   * 
   * @param syncedState - State object received from AppState
   */
  protected handleSharedStateSync(syncedState: any): void {
    if (!syncedState || !this.sharedStateManager) {
      return;
    }

    console.log(`SharedStateComponent: ${this.props.id} received shared state sync:`, syncedState);
    
    // Smart default: automatically apply any synced state that matches component state keys
    const sharedVars = this.sharedStateManager.getSharedStateVars();
    const stateUpdates: any = {};
    
    sharedVars.forEach(varName => {
      if (varName in syncedState && varName in this.state) {
        // Only update if the value is actually different to avoid unnecessary re-renders
        if (this.state[varName] !== syncedState[varName]) {
          stateUpdates[varName] = syncedState[varName];
        }
      }
    });
    
    if (Object.keys(stateUpdates).length > 0) {
      console.log(`SharedStateComponent: ${this.props.id} applying state updates:`, stateUpdates);
      
      // Use the original setState to avoid triggering autoSyncSharedState
      super.setState(stateUpdates);
    }
  }

  /**
   * Manually update shared state variables.
   * This is useful when you need to sync state without calling setState.
   * 
   * @param stateChanges - Object containing the state changes to sync
   */
  protected updateSharedState(stateChanges: { [key: string]: any }): void {
    if (this.sharedStateManager) {
      this.sharedStateManager.updateSharedState(stateChanges);
    }
  }

  /**
   * Automatically sync shared state variables based on current component state.
   * Called automatically after setState, but can be called manually if needed.
   */
  private autoSyncSharedState(): void {
    if (!this.sharedStateManager) {
      return;
    }
    
    const sharedVars = this.sharedStateManager.getSharedStateVars();
    const stateToSync: any = {};
    
    sharedVars.forEach(varName => {
      if (varName in this.state) {
        stateToSync[varName] = this.state[varName];
      }
    });
    
    if (Object.keys(stateToSync).length > 0) {
      console.log(`SharedStateComponent: ${this.props.id} auto-syncing state:`, stateToSync);
      this.sharedStateManager.updateSharedState(stateToSync);
    }
  }

  /**
   * Check if a state variable is configured for sharing
   * 
   * @param varName - Name of the state variable to check
   * @returns true if the variable is shared, false otherwise
   */
  protected isSharedVariable(varName: string): boolean {
    return this.sharedStateManager ? this.sharedStateManager.isSharedVariable(varName) : false;
  }

  /**
   * Get the list of shared state variables for this component
   * 
   * @returns Array of shared state variable names
   */
  protected getSharedStateVars(): string[] {
    return this.sharedStateManager ? this.sharedStateManager.getSharedStateVars() : [];
  }

  /**
   * Request current state from AppState.
   * Useful for components that need to sync with existing state on mount.
   */
  protected requestCurrentState(): void {
    if (this.sharedStateManager) {
      this.sharedStateManager.requestCurrentState();
    }
  }
}

export default SharedStateComponent;
