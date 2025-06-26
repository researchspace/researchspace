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

import * as React from 'react';
import { Component, ComponentContext } from 'platform/api/components';
import { trigger, listen } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import { addNotification } from 'platform/components/ui/notification';
import * as _ from 'lodash';

// Event types for AppState communication
export const APP_STATE_REGISTER_COMPONENT = 'AppState.RegisterComponent';
export const APP_STATE_UNREGISTER_COMPONENT = 'AppState.UnregisterComponent';
export const APP_STATE_UPDATE_SHARED_STATE = 'AppState.UpdateSharedState';
export const APP_STATE_SYNC_STATE_TO_COMPONENT = 'AppState.SyncStateToComponent';
export const APP_STATE_REQUEST_CURRENT_STATE = 'AppState.RequestCurrentState';

export interface SharedStateVariable {
  name: string;
  value: any;
}

export interface ComponentStateRegistration {
  componentId: string;
  sharedStateVars: string[];
  currentState: { [varName: string]: any };
}

export interface AppStateProps {
  /**
   * Position of the "Save States" button
   */
  saveButtonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  
  /**
   * Whether to automatically sync URL parameters when state changes
   */
  autoSync?: boolean;
  
  /**
   * Debounce delay for URL updates (in milliseconds)
   */
  urlUpdateDelay?: number;
  
  /**
   * ID for the AppState instance (useful when multiple AppState components exist)
   */
  id?: string;
  
  /**
   * Children components that will be wrapped by AppState
   */
  children: React.ReactNode;
}

interface AppStateState {
  /**
   * Registry of all components and their shared state variables
   */
  componentRegistry: { [componentId: string]: ComponentStateRegistration };
  
  /**
   * Global shared state - merged view of all component states
   */
  globalSharedState: { [componentId: string]: { [varName: string]: any } };
  
  /**
   * Whether we're currently saving state (for UI feedback)
   */
  isSaving: boolean;
  
  /**
   * Last saved state URL for display
   */
  lastSavedUrl?: string;
}

export class AppState extends Component<AppStateProps, AppStateState> {
  private cancelation = new Cancellation();
  private urlUpdateTimeout: number | null = null;
  private saveNotificationTimeout: number | null = null;

  constructor(props: AppStateProps, context: ComponentContext) {
    super(props, context);

    this.state = {
      componentRegistry: {},
      globalSharedState: {},
      isSaving: false,
    };

    // Listen for component registration events
    this.cancelation
      .map(
        listen({
          eventType: APP_STATE_REGISTER_COMPONENT,
          target: this.props.id,
        })
      )
      .onValue(this.handleComponentRegistration);

    // Listen for component unregistration events
    this.cancelation
      .map(
        listen({
          eventType: APP_STATE_UNREGISTER_COMPONENT,
          target: this.props.id,
        })
      )
      .onValue(this.handleComponentUnregistration);

    // Listen for shared state updates from components
    this.cancelation
      .map(
        listen({
          eventType: APP_STATE_UPDATE_SHARED_STATE,
          target: this.props.id,
        })
      )
      .onValue(this.handleSharedStateUpdate);

    // Listen for requests for current state
    this.cancelation
      .map(
        listen({
          eventType: APP_STATE_REQUEST_CURRENT_STATE,
          target: this.props.id,
        })
      )
      .onValue(this.handleCurrentStateRequest);
  }

  public componentDidMount() {
    // Parse URL parameters on mount to restore state
    this.parseUrlParameters();
  }

  public componentWillUnmount() {
    // Clear any pending timeouts
    if (this.urlUpdateTimeout) {
      clearTimeout(this.urlUpdateTimeout);
    }
    if (this.saveNotificationTimeout) {
      clearTimeout(this.saveNotificationTimeout);
    }
  }

  /**
   * Handle component registration
   */
  private handleComponentRegistration = (event: any) => {
    const registration: ComponentStateRegistration = event.data;
    console.log('AppState: Registering component', registration.componentId, 'with shared vars:', registration.sharedStateVars);

    this.setState(prevState => {
      const newRegistry = {
        ...prevState.componentRegistry,
        [registration.componentId]: registration
      };

      const newGlobalState = {
        ...prevState.globalSharedState,
        [registration.componentId]: registration.currentState || {}
      };

      return {
        componentRegistry: newRegistry,
        globalSharedState: newGlobalState
      };
    }, () => {
      // After registration, sync any existing URL state to the component
      this.syncUrlStateToComponent(registration.componentId);
    });
  };

  /**
   * Handle component unregistration
   */
  private handleComponentUnregistration = (event: any) => {
    const componentId: string = event.data;
    console.log('AppState: Unregistering component', componentId);

    this.setState(prevState => {
      const newRegistry = { ...prevState.componentRegistry };
      const newGlobalState = { ...prevState.globalSharedState };
      
      delete newRegistry[componentId];
      delete newGlobalState[componentId];

      return {
        componentRegistry: newRegistry,
        globalSharedState: newGlobalState
      };
    });
  };

  /**
   * Handle shared state updates from components
   */
  private handleSharedStateUpdate = (event: any) => {
    const { componentId, stateUpdates } = event.data;
    console.log('AppState: Received state update from', componentId, ':', stateUpdates);

    this.setState(prevState => {
      const newGlobalState = {
        ...prevState.globalSharedState,
        [componentId]: {
          ...prevState.globalSharedState[componentId],
          ...stateUpdates
        }
      };

      return {
        globalSharedState: newGlobalState
      };
    }, () => {
      // Update URL if auto-sync is enabled
      if (this.props.autoSync) {
        this.scheduleUrlUpdate();
      }
    });
  };

  /**
   * Handle requests for current state
   */
  private handleCurrentStateRequest = (event: any) => {
    const { componentId } = event.data;
    const componentState = this.state.globalSharedState[componentId] || {};
    
    // Send current state back to the requesting component
    trigger({
      eventType: APP_STATE_SYNC_STATE_TO_COMPONENT,
      source: this.props.id,
      targets: [componentId],
      data: componentState
    });
  };

  /**
   * Schedule URL update with debouncing
   */
  private scheduleUrlUpdate = () => {
    if (this.urlUpdateTimeout) {
      clearTimeout(this.urlUpdateTimeout);
    }

    const delay = this.props.urlUpdateDelay || 500; // Default 500ms debounce
    this.urlUpdateTimeout = window.setTimeout(() => {
      this.updateUrlParameters();
    }, delay);
  };

  /**
   * Parse URL parameters and restore component states
   */
  private parseUrlParameters = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const statesParam = urlParams.get('states');
    
    if (!statesParam) {
      return;
    }

    try {
      // Decode and parse the states parameter
      const decodedStates = decodeURIComponent(statesParam);
      const parsedStates = this.parseStatesString(decodedStates);
      
      console.log('AppState: Parsed states from URL:', parsedStates);

      // Update global state
      this.setState({
        globalSharedState: parsedStates
      }, () => {
        // Sync states to registered components
        Object.keys(parsedStates).forEach(componentId => {
          this.syncUrlStateToComponent(componentId);
        });
      });
    } catch (error) {
      console.error('AppState: Error parsing URL states:', error);
    }
  };

  /**
   * Parse states string format: Component1={var1:value1,var2:value2}&Component2={var3:value3}
   */
  private parseStatesString = (statesString: string): { [componentId: string]: { [varName: string]: any } } => {
    const result: { [componentId: string]: { [varName: string]: any } } = {};
    
    // Split by component separators
    const componentParts = statesString.split('&');
    
    for (const part of componentParts) {
      const equalIndex = part.indexOf('=');
      if (equalIndex === -1) continue;
      
      const componentId = part.substring(0, equalIndex);
      const stateString = part.substring(equalIndex + 1);
      
      // Remove surrounding braces
      const cleanStateString = stateString.replace(/^\{|\}$/g, '');
      
      // Parse key:value pairs
      const stateObj: { [varName: string]: any } = {};
      const pairs = cleanStateString.split(',');
      
      for (const pair of pairs) {
        const colonIndex = pair.indexOf(':');
        if (colonIndex === -1) continue;
        
        const key = pair.substring(0, colonIndex).trim();
        const valueString = pair.substring(colonIndex + 1).trim();
        
        // Try to parse the value as JSON, fallback to string
        try {
          stateObj[key] = JSON.parse(valueString);
        } catch {
          stateObj[key] = valueString;
        }
      }
      
      result[componentId] = stateObj;
    }
    
    return result;
  };

  /**
   * Update URL parameters with current state
   */
  private updateUrlParameters = () => {
    const statesString = this.serializeStatesForUrl();
    
    if (statesString) {
      const url = new URL(window.location.href);
      url.searchParams.set('states', statesString);
      
      // Update URL without triggering page reload
      window.history.replaceState({}, '', url.toString());
      console.log('AppState: Updated URL with states:', statesString);
    }
  };

  /**
   * Serialize current states for URL
   */
  private serializeStatesForUrl = (): string => {
    const parts: string[] = [];
    
    Object.entries(this.state.globalSharedState).forEach(([componentId, componentState]) => {
      if (Object.keys(componentState).length === 0) return;
      
      const statePairs: string[] = [];
      Object.entries(componentState).forEach(([key, value]) => {
        const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
        statePairs.push(`${key}:${serializedValue}`);
      });
      
      if (statePairs.length > 0) {
        parts.push(`${componentId}={${statePairs.join(',')}}`);
      }
    });
    
    return parts.join('&');
  };

  /**
   * Sync URL state to a specific component
   */
  private syncUrlStateToComponent = (componentId: string) => {
    const componentState = this.state.globalSharedState[componentId];
    if (!componentState) return;

    console.log('AppState: Syncing state to component', componentId, ':', componentState);
    
    trigger({
      eventType: APP_STATE_SYNC_STATE_TO_COMPONENT,
      source: this.props.id,
      targets: [componentId],
      data: componentState
    });
  };

  /**
   * Save current states to backend and generate shareable URL
   */
  private handleSaveStates = async () => {
    this.setState({ isSaving: true });

    try {
      // Create a URL with the current states as parameters
      const currentUrl = new URL(window.location.href);
      const statesString = this.serializeStatesForUrl();
      
      if (statesString) {
        currentUrl.searchParams.set('states', statesString);
      }
      
      const fullUrl = currentUrl.toString();
      console.log('AppState: Full URL to shorten:', fullUrl);

      // Call the URL minifier service to create a short URL
      const response = await fetch(`/rest/url-minify/getShort?url=${encodeURIComponent(fullUrl)}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`Failed to create short URL: ${response.status} ${response.statusText}`);
      }

      const shortKey = await response.text();
      const shortUrl = `${window.location.origin}/l/${shortKey}`;

      console.log('AppState: Created shareable URL:', shortUrl);

      // Store the URL for potential copying
      this.setState({ lastSavedUrl: shortUrl });

      // Copy to clipboard automatically
      try {
        await navigator.clipboard.writeText(shortUrl);
        
        // Show success notification with clipboard confirmation
        addNotification({
          level: 'success',
          title: 'States Saved Successfully!',
          message: `
            <div>
              <p><strong>Shareable URL created and copied to clipboard:</strong></p>
              <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 4px; margin: 8px 0; font-family: monospace; word-break: break-all;">
                ${shortUrl}
              </div>
              <p><small>Anyone with this link can view the current component states.</small></p>
            </div>
          `,
          autoDismiss: 8,
          action: {
            label: 'Copy Again',
            callback: () => this.handleCopyUrl()
          }
        });
      } catch (clipboardError) {
        // Fallback if clipboard fails
        console.warn('Clipboard API failed, showing URL for manual copy:', clipboardError);
        
        addNotification({
          level: 'success',
          title: 'States Saved Successfully!',
          message: `
            <div>
              <p><strong>Shareable URL created:</strong></p>
              <div style="background: rgba(255,255,255,0.1); padding: 8px; border-radius: 4px; margin: 8px 0; font-family: monospace; word-break: break-all;">
                ${shortUrl}
              </div>
              <p><small>Please copy this URL manually to share the current component states.</small></p>
            </div>
          `,
          autoDismiss: 10,
          action: {
            label: 'Copy to Clipboard',
            callback: () => this.handleCopyUrl()
          }
        });
      }

    } catch (error) {
      console.error('AppState: Error saving states:', error);
      
      // Show error notification using ResearchSpace notification system
      addNotification({
        level: 'error',
        title: 'Failed to Save States',
        message: `
          <div>
            <p>Unable to create shareable URL:</p>
            <p><strong>${error.message}</strong></p>
            <p><small>Please try again or contact your system administrator if the problem persists.</small></p>
          </div>
        `,
        autoDismiss: 8
      });
    } finally {
      this.setState({ isSaving: false });
    }
  };

  /**
   * Copy saved URL to clipboard
   */
  private handleCopyUrl = async () => {
    if (!this.state.lastSavedUrl) return;

    try {
      await navigator.clipboard.writeText(this.state.lastSavedUrl);
      console.log('AppState: URL copied to clipboard');
      
      // Show copy confirmation
      addNotification({
        level: 'info',
        title: 'URL Copied!',
        message: 'The shareable URL has been copied to your clipboard.',
        autoDismiss: 3
      });
    } catch (error) {
      console.error('AppState: Error copying URL:', error);
      
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = this.state.lastSavedUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          addNotification({
            level: 'info',
            title: 'URL Copied!',
            message: 'The shareable URL has been copied to your clipboard.',
            autoDismiss: 3
          });
        } else {
          throw new Error('Copy command failed');
        }
      } catch (fallbackError) {
        // Show manual copy notification
        addNotification({
          level: 'warning',
          title: 'Copy Failed',
          message: `
            <div>
              <p>Unable to copy automatically. Please copy this URL manually:</p>
              <div style="background: rgba(0,0,0,0.1); padding: 8px; border-radius: 4px; margin: 8px 0; font-family: monospace; word-break: break-all; user-select: all;">
                ${this.state.lastSavedUrl}
              </div>
            </div>
          `,
          autoDismiss: 10
        });
      }
    }
  };

  /**
   * Get CSS classes for save button position
   */
  private getSaveButtonClasses = (): string => {
    const position = this.props.saveButtonPosition || 'top-right';
    const baseClasses = 'app-state-save-button';
    
    switch (position) {
      case 'top-left':
        return `${baseClasses} app-state-save-button-top-left`;
      case 'bottom-left':
        return `${baseClasses} app-state-save-button-bottom-left`;
      case 'bottom-right':
        return `${baseClasses} app-state-save-button-bottom-right`;
      default:
        return `${baseClasses} app-state-save-button-top-right`;
    }
  };

  public render() {
    const hasSharedState = Object.keys(this.state.globalSharedState).some(
      componentId => Object.keys(this.state.globalSharedState[componentId]).length > 0
    );

    // Debug logging
    console.log('AppState render - globalSharedState:', this.state.globalSharedState);
    console.log('AppState render - hasSharedState:', hasSharedState);
    console.log('AppState render - componentRegistry:', this.state.componentRegistry);

    return (
      <div className="app-state-container" style={{ position: 'relative', height: '100%', width: '100%' }}>
        {/* Save States Button */}
        <button
          className={this.getSaveButtonClasses()}
          onClick={this.handleSaveStates}
          disabled={this.state.isSaving || !hasSharedState}
          title="Save current component states and generate shareable URL"
          style={{
            position: 'fixed',
            zIndex: 10000,
            padding: '8px 16px',
            backgroundColor: this.state.isSaving ? '#95a5a6' : '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: this.state.isSaving || !hasSharedState ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            opacity: hasSharedState ? 1 : 0.5,
            ...(this.props.saveButtonPosition === 'top-left' && { top: '20px', left: '20px' }),
            ...(this.props.saveButtonPosition === 'bottom-left' && { bottom: '20px', left: '20px' }),
            ...(this.props.saveButtonPosition === 'bottom-right' && { bottom: '20px', right: '20px' }),
            ...(!this.props.saveButtonPosition || this.props.saveButtonPosition === 'top-right') && { top: '20px', right: '20px' },
          }}
        >
          {this.state.isSaving ? (
            <>
              <i className="fa fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
              Saving...
            </>
          ) : (
            <>
              <i className="fa fa-share-alt" style={{ }}></i>
            </>
          )}
        </button>


        {/* Wrapped Children */}
        {this.props.children}
      </div>
    );
  }
}

export default AppState;
