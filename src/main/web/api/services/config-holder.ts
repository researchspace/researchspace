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

import * as Kefir from 'kefir';
import * as SparqlJs from 'sparqljs';

import { SparqlUtil } from 'platform/api/sparql';

import * as ConfigService from './config';
import { NotEnoughPermissionsError } from './security';

interface RawConfig {
  environment: EnvironmentConfig;
  ui: RawUIConfig;
  global: GlobalConfig;
}

/**
 * This is static holder of configuration. It's initalized in MainApp, everything is rendered after
 * this component is ready. To use, call getEnvironmentConfig, it will get you either config or
 * throw an error if it's not initialized yet
 */
export class ConfigHolderClass {
  private isLoading: boolean;

  private environmentConfig: EnvironmentConfig;
  private uiConfig: UIConfig;
  private globalConfig: GlobalConfig;

  constructor() {
    this.isLoading = true;
  }

  /**
   * Get environment config in runtime. Values will be available when rendering.
   * @returns EnvironmentConfig
   */
  public getEnvironmentConfig(): EnvironmentConfig {
    if (this.isLoading) {
      throw Error('Config has not been initialized yet');
    }
    return this.environmentConfig;
  }

  /**
   * Get environment config in runtime. Values will be available when rendering.
   * @returns EnvironmentConfig
   */
  public getUIConfig(): UIConfig {
    if (this.isLoading) {
      throw Error('Config has not been initialized yet');
    }
    return this.uiConfig;
  }

  /**
   * Get global config in runtime. Values will be available when rendering.
   * @returns GlobalConfig
   */
  public getGlobalConfig(): GlobalConfig {
    if (this.isLoading) {
      throw Error('Config has not been initialized yet');
    }
    return this.globalConfig;
  }

  fetchConfig(): Kefir.Property<RawConfig> {
    return Kefir.combine({
      environment: ConfigService.getConfigsInGroup('environment'),
      ui: ConfigService.getConfigsInGroup('ui'),
      global: ConfigService.getConfigsInGroup('global'),
    }).toProperty();
  }

  /**
   * This method is to be called by MainApp to trigger config initialization.
   */
  initializeConfig(rawConfig: RawConfig) {
    this.setEnvironmentConfig(rawConfig.environment);
    this.setUIConfig(rawConfig.ui);
    this.setGlobalConfig(rawConfig.global);
    this.isLoading = false;
  }

  private setEnvironmentConfig(config: EnvironmentConfig) {
    if (!config.resourceUrlMapping) {
      throw new NotEnoughPermissionsError(
        'Configuration property "resourceUrlMapping" is undefined. ' +
          'Most likely permissions for reading the configuration properties are not set correctly.'
      );
    }
    this.environmentConfig = config;
  }

  private setUIConfig(config: RawUIConfig) {
    const {
      preferredLanguages,
      preferredLabels,
      preferredThumbnails,
      templateIncludeQuery,
      enableUiComponentBasedSecurity,
    } = config;

    const labelPaths = preferredLabels ? preferredLabels.value : [];
    const thumbnailPaths = preferredThumbnails ? preferredThumbnails.value : [];
    this.uiConfig = {
      preferredLanguages: preferredLanguages ? preferredLanguages.value : [],
      labelPropertyPattern: makePropertyPattern(labelPaths),
      labelPropertyPath: makePropertyPath(labelPaths),
      thumbnailPropertyPattern: makePropertyPattern(thumbnailPaths),
      thumbnailPropertyPath: makePropertyPath(thumbnailPaths),
      templateIncludeQuery: templateIncludeQuery ? templateIncludeQuery.value : undefined,
      enableUiComponentBasedSecurity: enableUiComponentBasedSecurity
        ? Boolean(enableUiComponentBasedSecurity.value)
        : false,
    };
  }

  private setGlobalConfig(config: GlobalConfig) {
    this.globalConfig = config;
  }
}

export interface EnvironmentConfig {
  readonly resourceUrlMapping?: StringValue;
}

interface RawUIConfig {
  preferredLanguages?: StringArray;
  preferredLabels?: StringArray;
  preferredThumbnails?: StringArray;
  templateIncludeQuery?: StringValue;
  enableUiComponentBasedSecurity?: BooleanValue;
  supportedBrowsers?: StringArray;
  unsupportedBrowserMessage?: StringValue;
}

export interface UIConfig {
  readonly preferredLanguages: ReadonlyArray<string>;
  readonly labelPropertyPattern: string;
  readonly labelPropertyPath: SparqlJs.PropertyPath;
  readonly thumbnailPropertyPattern: string;
  readonly thumbnailPropertyPath: SparqlJs.PropertyPath;
  readonly templateIncludeQuery: string | undefined;
  readonly enableUiComponentBasedSecurity: boolean;
  readonly supportedBrowsers?: ReadonlyArray<string>;
  readonly unsupportedBrowserMessage?: string | undefined;
}

export interface GlobalConfig {
  readonly homePage?: StringValue;
}

export interface StringValue {
  value: string;
  shadowed: boolean;
}

export interface StringArray {
  value: string[];
  shadowed: boolean;
}

export interface BooleanValue {
  value: boolean;
  shadowed: boolean;
}

function makePropertyPattern(paths: ReadonlyArray<string>): string {
  return keepOnlyPropertyPaths(paths).join('|');
}

function makePropertyPath(paths: ReadonlyArray<string>): SparqlJs.PropertyPath {
  const alternatives: Array<SparqlJs.Term | SparqlJs.PropertyPath> = [];
  for (const path of keepOnlyPropertyPaths(paths)) {
    try {
      const alternative = SparqlUtil.parsePropertyPath(path);
      alternatives.push(alternative);
    } catch (err) {
      console.warn('Invalid label property path', err);
    }
  }

  if (alternatives.length === 0) {
    throw new Error('Failed to construct property path for labels (path is empty)');
  }

  return {
    type: 'path',
    pathType: '|',
    items: alternatives,
  };
}

function keepOnlyPropertyPaths(paths: ReadonlyArray<string>): string[] {
  return paths.filter((path) => !(path.startsWith('{') || path.endsWith('}')));
}

export const ConfigHolder = new ConfigHolderClass();
