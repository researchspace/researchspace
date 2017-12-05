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

import {
  Workspace,
  SparqlDataProvider,
  SparqlDataProviderSettings,
  OrganizationTemplate,
  PersonTemplate,
  OWLStatsSettings,
  WikidataSettings,
  OWLRDFSSettings,
  DBPediaSettings,
  DefaultElementTemplate,
  SparqlDataProviderOptions
} from 'ontodia';

import { SparqlUtil } from 'platform/api/sparql';

export interface OntodiaConfig {
  getDataProvider(options: SparqlDataProviderOptions): SparqlDataProvider;
  customizeWorkspace(workspace: Workspace): void;
}

/**
 * data provider defaults based on platform's UI configuration properties
 */
const defaults = {
  dataLabelProperty: SparqlUtil.preferredLabelPattern(),
  extractLabel: false,
};

function noStatsConfig(settings: SparqlDataProviderSettings): OntodiaConfig {
  return {
    getDataProvider: options => new OptimizingDataProvider(
      options, {...OWLRDFSSettings, ...defaults, ...settings}),
    customizeWorkspace: workspace => {/* just empty */},
  };
}

function dBPediaConfig(settings: SparqlDataProviderSettings): OntodiaConfig {
  return {
    getDataProvider: options => new OptimizingDataProvider(
      options, {...DBPediaSettings, ...settings}),
    customizeWorkspace: workspace => {/* just empty */},
  };
}

function defaultConfig(settings: SparqlDataProviderSettings): OntodiaConfig {
  return {
    getDataProvider: options => new OptimizingDataProvider(
      options, {...OWLStatsSettings, ...defaults, ...settings}),
    customizeWorkspace: workspace => {/* just empty */},
  };
}

function wikidataConfig(settings: SparqlDataProviderSettings): OntodiaConfig {
  return {
    getDataProvider: options => new OptimizingDataProvider(
      options, {...WikidataSettings, ...settings}),
    customizeWorkspace: workspace => {
      const diagram = workspace.getDiagram();
      diagram.registerTemplateResolver(types => {
        // using default template for country as a temporary solution
        if (types.indexOf('http://www.wikidata.org/entity/Q6256') !== -1) {
          return DefaultElementTemplate;
        } else if (types.indexOf('http://www.wikidata.org/entity/Q43229') !== -1) {
          return OrganizationTemplate;
        }
      });
      diagram.registerTemplateResolver(types => {
        if (types.indexOf('http://www.wikidata.org/entity/Q5') !== -1) {
          return PersonTemplate;
        }
      });
      diagram.registerElementStyleResolver(types => {
        if (types.indexOf('http://www.wikidata.org/entity/Q43229') !== -1) {
          return {color: '#77ca98', icon: 'ontodia-organization-icon'};
        }
      });
      diagram.registerElementStyleResolver(types => {
        if (types.indexOf('http://www.wikidata.org/entity/Q5') !== -1) {
          return {color: '#eb7777', icon: 'ontodia-person-icon'};
        }
      });
    },
  };
}

const SUPPORTED_CONFIGS = {
  'default': defaultConfig,
  'nostats': noStatsConfig,
  'wikidata': wikidataConfig,
  'dbpedia': dBPediaConfig,
};

export type SupportedConfigName = keyof typeof SUPPORTED_CONFIGS;

export function getConfig(
  configName: SupportedConfigName | undefined,
  settings: SparqlDataProviderSettings
): OntodiaConfig {
  if (configName) {
    const configuration = SUPPORTED_CONFIGS[configName];
    if (!configuration) {
      throw new Error(`Unknown Ontodia configuration '${configName}'`);
    }
    return configuration(settings);
  } else {
    return defaultConfig(settings);
  }
}

class OptimizingDataProvider extends SparqlDataProvider {
  executeSparqlQuery<Binding>(query: string) {
    let optimizedQuery = query;
    try {
      const parsedQuery = SparqlUtil.parseQuery(query);
      optimizedQuery = SparqlUtil.serializeQuery(parsedQuery);
    } catch (err) {
      console.warn('Failed to optimize Ontodia query:');
      console.warn(err);
    }
    return super.executeSparqlQuery(optimizedQuery);
  };
}
