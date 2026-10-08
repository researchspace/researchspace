/**
 * ResearchSpace
 * Copyright (C) 2024, © Kartography Community Interest Company
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { Model } from 'flexlayout-react';
import { Item } from './DashboardComponent';

/**
 * State variables of rs-dashboard that can be shared through `<app-state>`.
 */
export const SHARED_STATE_VARS = ['layoutModel', 'openFrames', 'activeFrameId'];

/**
 * Interface for frame configuration in shared state
 */
export interface FrameConfig {
  id: string;
  viewId?: string;
  resourceIri?: string;
  label?: string;
  data?: any;
  isDirty?: boolean;
  isExpanded?: boolean;
  linkedBy?: string;
  index: number;
}

/**
 * Interface for the complete dashboard shared state
 */
export interface DashboardSharedState {
  layoutModel: string; // Serialized FlexLayout model
  openFrames: FrameConfig[];
  activeFrameId?: string;
  version: number; // For migration support
}

/**
 * Utility class for serializing and deserializing dashboard state
 */
export class DashboardStateAdapters {
  private static readonly STATE_VERSION = 1;

  /**
   * Serialize FlexLayout model to JSON string
   * @param model - FlexLayout Model instance
   * @returns Serialized model as JSON string
   */
  static serializeFlexLayout(model: Model): string {
    try {
      const jsonModel = model.toJson();
      return JSON.stringify(jsonModel);
    } catch (error) {
      console.warn('rs-dashboard: cannot serialize the layout', error);
      return '{}';
    }
  }

  /**
   * Deserialize FlexLayout model from JSON string
   * @param data - JSON string representation of the model
   * @returns FlexLayout Model instance or null if deserialization fails
   */
  static deserializeFlexLayout(data: string): Model | null {
    try {
      if (!data || data.trim() === '') {
        return null;
      }
      const jsonModel = JSON.parse(data);
      return Model.fromJson(jsonModel);
    } catch (error) {
      console.warn('rs-dashboard: cannot restore the layout', error);
      return null;
    }
  }

  /**
   * Convert dashboard items to frame configurations for state storage
   * @param items - Array of dashboard items
   * @returns Array of frame configurations
   */
  static serializeFrameStates(items: readonly Item[]): FrameConfig[] {
    return items.map(item => ({
      id: item.id,
      viewId: item.viewId,
      resourceIri: item.resourceIri,
      label: item.label,
      data: item.data,
      isDirty: item.isDirty,
      isExpanded: item.isExpanded,
      linkedBy: item.linkedBy,
      index: item.index
    }));
  }

  /**
   * Convert frame configurations back to dashboard items
   * @param frameConfigs - Array of frame configurations
   * @returns Array of dashboard items
   */
  static deserializeFrameStates(frameConfigs: FrameConfig[]): Item[] {
    if (!Array.isArray(frameConfigs)) {
      return [];
    }

    return frameConfigs.map(config => ({
      id: config.id,
      viewId: config.viewId,
      resourceIri: config.resourceIri,
      label: config.label,
      data: config.data,
      isDirty: config.isDirty || false,
      isExpanded: config.isExpanded || false,
      linkedBy: config.linkedBy,
      index: config.index
    }));
  }

  /**
   * Create a complete dashboard shared state object
   * @param model - FlexLayout Model instance
   * @param items - Array of dashboard items
   * @param activeFrameId - ID of the currently active frame
   * @returns Complete dashboard shared state
   */
  static createDashboardState(
    model: Model, 
    items: readonly Item[], 
    activeFrameId?: string
  ): DashboardSharedState {
    return {
      layoutModel: this.serializeFlexLayout(model),
      openFrames: this.serializeFrameStates(items),
      activeFrameId,
      version: this.STATE_VERSION
    };
  }

  /**
   * Extract layout model and items from dashboard shared state
   * @param state - Dashboard shared state object
   * @returns Object containing deserialized model and items, or null if invalid
   */
  static extractDashboardState(state: DashboardSharedState): {
    model: Model | null;
    items: Item[];
    activeFrameId?: string;
  } | null {
    try {
      if (!state || typeof state !== 'object') {
        return null;
      }

      if (state.version && state.version > this.STATE_VERSION) {
        console.warn(`rs-dashboard: state version ${state.version} is newer than the supported ${this.STATE_VERSION}`);
      }

      const model = this.deserializeFlexLayout(state.layoutModel);
      const items = this.deserializeFrameStates(state.openFrames || []);

      return {
        model,
        items,
        activeFrameId: state.activeFrameId
      };
    } catch (error) {
      console.warn('rs-dashboard: invalid shared state', error);
      return null;
    }
  }
}

export default DashboardStateAdapters;
