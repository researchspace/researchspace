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

export const SetKind = Rdf.iri('http://www.researchspace.org/resource/system/vocab/resource_type/set');
const DefaultSetItemActions = `
  <div class='set-management__item-actions'>
    <bs-dropdown-button pull-right=true bs-style='link' title=''
                        id='set-actions-{{iri.value}}'>
      <mp-set-management-action-remove-set-item item={{iri.value}}>
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

/*
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
*/

export const SetListTemplate = `
  <div style='display: flex; align-items: center; justify-content: space-between;'>
  <div style='overflow: hidden;'>
    <span style='display: flex;'>
      ${DefaultItemLabel}
    </span>
  </div>

  <div class='set-management__item-actions' style='margin-left: auto;'>

    <bs-dropdown  pull-right=true 
                  class="dropdown-no-caret"
                  id='set-actions-{{iri.value}}'>

    <bs-dropdown-toggle class="button-clipboard-folder-actions no-active-bg">
      <rs-icon icon-type="round" icon-name="more_vert"></rs-icon>
    </bs-dropdown-toggle>

    <bs-dropdown-menu>
         <mp-set-management-action-rename-set>
          <bs-menu-item event-key='rename'>
            <rs-icon icon-type="rounded" icon-name="drive_file_rename_outline" class="icon-left" symbol="true"></rs-icon>
              Rename set
            </bs-menu-item>
        </mp-set-management-action-rename-set>
        
        

        <hr>

        <mp-copy-to-default-set id="{{iri.value}}-copy-to-clipboard" resource="{{iri.value}}">
          <bs-menu-item>
            <rs-icon icon-type="rounded" icon-name="inventory" class="icon-left" symbol="true"></rs-icon>
            <span>Copy to clipboard</span>
          </bs-menu-item>
        </mp-copy-to-default-set>

        <mp-copy-to-clipboard text='{{iri.value}}' message='IRI has been copied'>
          <bs-menu-item>
            <rs-icon icon-type="rounded" icon-name="content_copy" class="icon-left" symbol="true"></rs-icon>
            <span>Copy IRI</span>
          </bs-menu-item>
        </mp-copy-to-clipboard>

        
        <hr>

        <semantic-link-container  uri='http://www.researchspace.org/resource/ThinkingFrames'
                                  urlqueryparam-view="resource-editor"
                                  urlqueryparam-resource-iri='{{iri.value}}'>
          <bs-menu-item>
            <rs-icon icon-type="rounded" icon-name="edit_note" class="icon-left" symbol="true"></rs-icon>
            <span>Edit</span>
          </bs-menu-item>
        </semantic-link-container>

        <semantic-link-container  uri='http://www.researchspace.org/resource/ThinkingFrames'
                                  urlqueryparam-view="resource-editor"
                                  urlqueryparam-resource-iri='{{iri.value}}'
                                  urlqueryparam-open-as-drag-and-drop='true'>
          <bs-menu-item>
            <rs-icon icon-type='rounded' icon-name='read_more' symbol='true' class="icon-left"></rs-icon>
            <span>Edit in draggable tab</span>
          </bs-menu-item>
        </semantic-link-container>
        <hr>
        
        <semantic-link-container uri='http://www.researchspace.org/resource/ThinkingFrames' 
                                      urlqueryparam-view='knowledge-map' 
                                      urlqueryparam-resource='{{iri.value}}'>
            <bs-menu-item class='set-action__km-navigate' event-key=km>
              <rs-icon icon-type="rounded" icon-name="hub" class="icon-left" symbol="true"></rs-icon>Open in Knowledge map</bs-menu-item>
        </semantic-link-container>

        
          <hr>
          <mp-set-management-action-remove-set item="{{iri.value}}">
            <bs-menu-item event-key='remove'>
              <rs-icon icon-type="rounded" icon-name="delete" class="icon-left" symbol="true"></rs-icon>
              Delete
            </bs-menu-item>
          </mp-set-management-action-remove-set>
        
      </bs-dropdown-menu>
    </div>
  </div>
`

export const ItemListTemplate = `
  <div style='display: flex; align-items: center; justify-content: space-between;'>
    <div style='overflow: hidden;'>
      <semantic-link-container uri="{{iri.value}}" draggable=false>
        ${DefaultItemLabel}
      </semantic-link-container>
    </div>
    ${DefaultSetItemActions}
  </div>
`;

export const KeywordSearch: KeywordFilter = {
  placeholder: 'Search in clipboard...',
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
