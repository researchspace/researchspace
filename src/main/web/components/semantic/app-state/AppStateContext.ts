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
import { ComponentStateRegistration } from './AppState';

/**
 * Context value interface for AppState
 */
export interface AppStateContextValue {
  appStateId: string;
  register: (registration: ComponentStateRegistration) => void;
  unregister: (componentId: string) => void;
  updateState: (componentId: string, stateUpdates: any) => void;
  requestCurrentState: (componentId: string) => void;
}

/**
 * React Context for AppState component discovery
 * Allows child components to automatically find and register with their parent AppState
 */
export const AppStateContext = React.createContext<AppStateContextValue | null>(null);

/**
 * Hook to access AppState context
 * @returns The AppState context value or null if not within an AppState
 */
export const useAppStateContext = () => {
  const context = React.useContext(AppStateContext);
  return context;
};
