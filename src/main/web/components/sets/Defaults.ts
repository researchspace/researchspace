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

import { Rdf } from 'platform/api/rdf';

import { SetManagementProps, KeywordFilter } from './Configuration';

export const SetKind = Rdf.iri('http://www.researchspace.org/resource/system/Set');
const DefaultSetItemActions = `
  <div class='set-management__item-actions'>
    <bs-dropdown-button pull-right=true bs-style='link' title=''
                        id='set-actions-{{iri.value}}'>
      <mp-set-management-action-remove-set-item>
        <bs-menu-item event-key='remove'>Remove</bs-menu-item>
      </mp-set-management-action-remove-set-item>
    </bs-dropdown-button>
  </div>
`;
const DefaultItemLabel = `
  <span style='display: flex;'>
    <mp-label iri='{{iri.value}}' highlight='{{highlight}}'
              highlight-props='{"style": {"color": "#dc8a4b"}}'
              style='white-space: nowrap; overflow: hidden; text-overflow: ellipsis;'
    ></mp-label>
  </span>
`;
export const GridTemplate = `
  <mp-resource-card iri='{{iri.value}}'>${DefaultSetItemActions}</mp-resource-card>
`;
export const SetListTemplate = `
  <div style='display: flex; align-items: center; justify-content: space-between;'>
    <div style='overflow: hidden;'>
      ${DefaultItemLabel}
    </div>
    <div class='set-management__item-actions' style='margin-left: auto;'>
      <bs-dropdown-button pull-right=true bs-style='link' title=''
                          id='set-actions-{{iri.value}}'>
        <mp-set-management-action-manage-set>
          <bs-menu-item event-key='manage'>Manage set</bs-menu-item>
        </mp-set-management-action-manage-set>
        <mp-set-management-action-rename-set>
          <bs-menu-item event-key='rename'>Rename set</bs-menu-item>
        </mp-set-management-action-rename-set>
        <mp-set-management-action-remove-set>
          <bs-menu-item event-key='remove'>Remove set</bs-menu-item>
        </mp-set-management-action-remove-set>
      </bs-dropdown-button>
    </div>
  </div>
`;
export const ItemListTemplate = `
  <div style='display: flex; align-items: center; justify-content: space-between;'>
    <div style='overflow: hidden;'>
      <mp-resource-link-container uri="{{iri.value}}" draggable=false>
        ${DefaultItemLabel}
      </mp-resource-link-container>
    </div>
    ${DefaultSetItemActions}
  </div>
`;

export const KeywordSearch: KeywordFilter = {
  placeholder: 'Search all...',
  placeholderInSet: 'Search in the set...',
  queryPattern: `
    ?itemHolder ?__preferredLabel__ ?itemLabel .
    FILTER REGEX(STR(?itemLabel), "(.*?)?__token__", "i")`,
};
export const MinSearchTermLength = 3;

export const SetItemsQuery = `
PREFIX ldp: <http://www.w3.org/ns/ldp#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX platform: <http://www.researchspace.org/resource/system/>
PREFIX bds: <http://www.bigdata.com/rdf/search#>
SELECT ?item ?itemHolder ?parent ?kind WHERE {
  {
    FILTER(!(?__isSearch__)) .
    ?__rootSet__ ldp:contains ?itemHolder .
    BIND(?__rootSet__ as ?parent) .
    OPTIONAL { ?itemHolder platform:setItem ?setItem }
    BIND(COALESCE(?setItem, ?itemHolder) AS ?item) .
  } UNION {
    FILTER(?__isSearch__) .
    ?__rootSet__ ldp:contains ?__setToSearch__ .
    ?__setToSearch__ ldp:contains ?itemHolder.
    BIND(?__setToSearch__ as ?parent) .
    ?itemHolder platform:setItem ?item .
    FILTER(?__filterPatterns__)
  }

  OPTIONAL {
    ?itemHolder platform:setItemIndex ?i .
  }
  OPTIONAL {
    ?itemHolder prov:generatedAtTime ?modificationDate .
  }
  BIND(COALESCE(?i, 0) AS ?index) .
  OPTIONAL {
    ?item a platform:Set .
    BIND(platform:Set as ?type)
  }
  BIND(COALESCE(?type, platform:SetItem) AS ?kind) .
} ORDER BY ?index DESC(?modificationDate)`;

export const SetItemsMetadataQuery = `SELECT ?item WHERE {}`;

export const SetCountQuery = `
PREFIX ldp: <http://www.w3.org/ns/ldp#>
SELECT ?set (COUNT(?item) as ?count) WHERE {
  ?__rootSet__ ldp:contains ?set .
  OPTIONAL { ?set ldp:contains ?item }
} GROUP BY ?set`;

export function itemConfig(kind: Rdf.Node) {
  switch (kind.toString()) {
    case SetKind.toString():
      return { isSet: true, gridTemplate: SetListTemplate, listTemplate: SetListTemplate };
    case '<http://www.researchspace.org/resource/system/SetItem>':
      return { isSet: false, gridTemplate: GridTemplate, listTemplate: ItemListTemplate };
    default:
      return undefined;
  }
}

export const AcceptResourceQuery = 'ASK {}';

export const ForAllProps: Partial<SetManagementProps> = {
  setItemsQuery: SetItemsQuery,
  setItemsMetadataQuery: SetItemsMetadataQuery,
  setCountQuery: SetCountQuery,
  acceptResourceQuery: AcceptResourceQuery,
  keywordFilter: KeywordSearch,
  filters: [],
  defaultViewMode: 'list',
  persistViewMode: true,
};
