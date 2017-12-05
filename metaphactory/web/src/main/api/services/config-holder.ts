/*
 * Copyright (C) 2015-2017, metaphacts GmbH
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import * as ConfigService  from './config';
import * as Kefir from 'kefir';

/**
 * This is static holder of configuration. It's initalized in MainApp, everything is rendered after
 * this component is ready. To use, call getEnvironmentConfig, it will get you either config or
 * throw an error if it's not initialized yet
 */
export class ConfigHolderClass {
  private environmentConfig: EnvironmentConfig;
  private uiConfig: UIConfig;
  private globalConfig: GlobalConfig;
  private isLoading: boolean;
  constructor() {
    this.isLoading = true;
  }

  /**
   * Get environment config in runtime. Values will be available when rendering.
   * @returns EnvironmentConfig
   */
  public getEnvironmentConfig(): EnvironmentConfig {
    if (this.isLoading) { throw Error('Config has not been initialized yet'); }
    return this.environmentConfig;
  }

  /**
   * Get environment config in runtime. Values will be available when rendering.
   * @returns EnvironmentConfig
   */
  public getUIConfig(): UIConfig {
    if (this.isLoading) { throw Error('Config has not been initialized yet'); }
    return this.uiConfig;
  }

  /**
   * Get global config in runtime. Values will be available when rendering.
   * @returns GlobalConfig
   */
  public getGlobalConfig(): GlobalConfig {
    if (this.isLoading) { throw Error('Config has not been initialized yet'); }
    return this.globalConfig;
  }


  /**
   * This method is to be called by MainApp to trigger config initialization.
   * @returns {any}
   */
  public initializeConfig(): Kefir.Property<boolean> {
    return Kefir.zip(
      [this.fetchEnvironmentConfig(), this.fetchUIConfig(), this.fetchGlobalConfig()]
    ).map((val) => {
      this.isLoading = false;
      return true;
    })
    .toProperty();
  }

  private fetchEnvironmentConfig(): Kefir.Property<boolean|string> {
    return ConfigService.getConfigsInGroup('environment').flatMap((config: EnvironmentConfig) => {
      if (!config.resourceUrlMapping) {
        return Kefir.constantError<any>(
          'Configuration property "resourceUrlMapping" is undefined. ' +
          'Most likely permissions for reading the configuration properties are not set correctly.'
        );
      }
      this.environmentConfig = config;
      return Kefir.constant<boolean>(true);
    }).toProperty();
  }

  private fetchUIConfig(): Kefir.Property<boolean> {
    return ConfigService.getConfigsInGroup('ui').map((config: UIConfig) => {
      this.uiConfig = config;
      return true;
    });
  }

  private fetchGlobalConfig(): Kefir.Property<boolean> {
    return ConfigService.getConfigsInGroup('global').map((config: GlobalConfig) => {
      this.globalConfig = config;
      return true;
    });
  }


}

export interface EnvironmentConfig {
  readonly resourceUrlMapping?: StringValue;
}

export interface UIConfig {
  readonly preferredLabels?: StringArray;
  readonly preferredLanguages?: StringArray;
  readonly preferredThumbnails?: StringArray;
  readonly templateIncludeQuery?: StringValue;
  readonly enableUiComponentBasedSecurity?: BooleanValue;
}

export interface GlobalConfig {
  readonly homePage?: StringValue
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

export const ConfigHolder = new ConfigHolderClass();
