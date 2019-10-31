/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import * as Immutable from 'immutable';
import * as Kefir from 'kefir';
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';
import {
  SparqlClient, SparqlUtil, QueryContext,
  VariableBinder, PropertyPathBinder, TextBinder, PatternBinder,
} from 'platform/api/sparql';
import { ConfigHolder } from 'platform/api/services/config-holder';

import { SetFilter } from './Configuration';
import * as Defaults from './Defaults';

export interface PlatformSet {
  readonly iri: Rdf.Iri;
  readonly kind: Rdf.Node;
  readonly itemCount?: number;
  readonly items?: ReadonlyArray<SetItem>;
  readonly metadata: SparqlClient.Binding;

  readonly isLoading?: boolean;
  readonly loadingError?: any;

  readonly editing?: EditState;
}

export enum EditType { Create = 1, Rename, ApplyingChanges }
export type EditState =
  { type: EditType.Create; newName: string; } |
  {
    type: EditType.Rename;
    fetchingName?: boolean;
    oldName?: string;
    newName?: string;
  } |
  { type: EditType.ApplyingChanges };

export interface SetItem {
  readonly iri: Rdf.Iri;
  readonly itemHolder: Rdf.Iri;
  readonly kind: Rdf.Node;
  readonly metadata: SparqlClient.Binding;
}

export interface FilterValue {
  filter: SetFilter;
  binding: SparqlClient.Binding;
}
export namespace FilterValue {
  export function value(fv: FilterValue) { return fv.binding['value']; }
  export function label(fv: FilterValue): string {
    const label = fv.binding['label'];
    return label && label.value;
  }
}

type MetadataItem = { iri: Rdf.Iri, kind: Rdf.Node };

namespace SetItemsBindings {
  export const RootSet = '__rootSet__';
  export const IsSearch = '__isSearch__';
  export const SetToSearch = '__setToSearch__';
  export const FilterPatterns = '__filterPatterns__';
  export const PreferredLabel = '__preferredLabel__';
}

namespace SetItemsMetadataBindings {
  export const Item = 'item';
  export const Kind = 'kind';
}

namespace SetCountBindings {
  export const RootSet = '__rootSet__';
}

namespace FilterBindings {
  export const SelectedValue = '__value__';
  export const InputText = /\?__token__/;
}

export function searchForSetsAndItems(params: {
  setItemsQuery: string;
  setItemsMetadataQuery: string;
  setCountQuery: string;
  context: QueryContext;
  rootSet: Rdf.Iri;
  isSet: (kind: Rdf.Node) => boolean;
  setToSearch?: Rdf.Iri;
  filterPatterns?: SparqlJs.Pattern[];
}): Kefir.Property<Immutable.Map<string, PlatformSet>> {
  const {
    setItemsQuery, setItemsMetadataQuery, setCountQuery, context,
    rootSet, isSet, setToSearch, filterPatterns,
  } = params;

  const hasFilterPatterns = filterPatterns && filterPatterns.length > 0;

  return Kefir.combine(
      [
        querySetItems(setItemsQuery, context, rootSet, setToSearch, filterPatterns),
        hasFilterPatterns
          ? Kefir.constant(new Map<string, number>())
          : loadSetItemCounts(setCountQuery, context, rootSet),
      ],
      (itemsResult, counts) => {
        const sets = parseSets(itemsResult, isSet, counts);
        const items = parseSetItems(itemsResult, kind => !isSet(kind));

        const allItems = items.reduce<MetadataItem[]>((all, setItems) => [...all, ...setItems], []);
        const unlistedSets = items.map<MetadataItem>((setItems, setIri) => (
          {iri: Rdf.iri(setIri), kind: Defaults.SetKind}
        ));
        const metadataItems: MetadataItem[] =
          [...allItems, ...sets.toArray(), ...unlistedSets.toArray()];

        return queryMetadata(setItemsMetadataQuery, context, metadataItems)
          .map(metadata => combineItemsIntoSets(sets, items, metadata));
      }
    ).flatMap(sets => sets).toProperty();
}

function querySetItems(
  setItemsQuery: string,
  context: QueryContext,
  rootSet: Rdf.Iri,
  setToSearch?: Rdf.Iri,
  filterPatterns?: SparqlJs.Pattern[]
) {
  try {
    const parsedQuery = SparqlUtil.parseQuery(setItemsQuery);

    const hasFilterPatterns = Boolean(filterPatterns && filterPatterns.length > 0);
    new PatternBinder(
      SetItemsBindings.FilterPatterns,
      hasFilterPatterns ? filterPatterns : []
    ).sparqlQuery(parsedQuery);

    const labelPath = ConfigHolder.getUIConfig().labelPropertyPath;
    new PropertyPathBinder({
      [SetItemsBindings.PreferredLabel]: labelPath,
    }).sparqlQuery(parsedQuery);

    const parametrizedQuery = SparqlClient.setBindings(parsedQuery, {
      [SetItemsBindings.RootSet]: rootSet,
      [SetItemsBindings.IsSearch]: Rdf.literal(hasFilterPatterns),
      [SetItemsBindings.SetToSearch]: setToSearch,
    });

    return SparqlClient.select(parametrizedQuery, {context});
  } catch (e) {
    console.error(e);
    return Kefir.constantError(e);
  }
}

function parseSets(
  result: SparqlClient.SparqlSelectResult,
  isSet: (kind: Rdf.Node) => boolean,
  itemCounts: Map<string, number>
): Immutable.OrderedMap<string, PlatformSet> {
  const sets = Immutable.OrderedMap<string, PlatformSet>().asMutable();

  for (const {item, kind} of result.results.bindings) {
    if (!(item && item.isIri())) { continue; }
    if (!isSet(kind)) { continue; }

    const itemCount = itemCounts.get(item.value);
    sets.set(item.value, {iri: item, kind, itemCount, metadata: {}});
  }

  return sets.asImmutable();
}

function loadSetItemCounts(
  setCountQuery: string,
  context: QueryContext,
  rootSet: Rdf.Iri
) {
  const parsedQuery = SparqlUtil.parseQuery(setCountQuery);
  const parametrizedQuery = SparqlClient.setBindings(parsedQuery, {
    [SetCountBindings.RootSet]: rootSet,
  });

  return SparqlClient.select(parametrizedQuery, {context}).map(({results}) => {
    const counts = new Map<string, number>();

    for (const {set, count} of results.bindings) {
      if (!(set && set.isIri() && count && count.isLiteral())) { continue; }
      const itemCount = Number(count.value);
      if (!isNaN(itemCount)) {
        counts.set(set.value, itemCount);
      }
    }

    return counts;
  });
}

export function fetchSetItems(
  setItemsQuery: string,
  setItemsMetadataQuery: string,
  context: QueryContext,
  rootSet: Rdf.Iri,
  isItem: (kind: Rdf.Node) => boolean,
  setToSearch?: Rdf.Iri,
  filterPatterns?: SparqlJs.Pattern[]
): Kefir.Stream<Map<string, ReadonlyArray<SetItem>>> {
  return querySetItems(setItemsQuery, context, rootSet, setToSearch, filterPatterns)
    .map(result => parseSetItems(result, isItem))
    .flatMap(sets =>
      queryMetadata(
        setItemsMetadataQuery,
        context,
        sets.reduce<MetadataItem[]>((all, items) => [...all, ...items], [])
      ).map(metadata => {
        const setsWithMetadata = new Map<string, ReadonlyArray<SetItem>>();
        sets.forEach((items, setIri) => {
          setsWithMetadata.set(setIri, mergeMetadata(items, metadata));
        });
        return setsWithMetadata;
      })
    );
}

function parseSetItems(
  result: SparqlClient.SparqlSelectResult,
  isItem: (kind: Rdf.Node) => boolean
): Immutable.Map<string, ReadonlyArray<SetItem>> {
  const setItems = Immutable.OrderedMap<string, Immutable.Map<string, SetItem>>().asMutable();

  for (const binding of result.results.bindings) {
    const {item, kind, parent, itemHolder} = binding;
    if (!(item && item.isIri())) { continue; }
    if (!(itemHolder && itemHolder.isIri())) { continue; }
    if (!(parent && parent.isIri())) { continue; }

    if (!isItem(kind)) { continue; }

    const clipboardItem: SetItem = {iri: item, itemHolder, kind, metadata: {}};
    const parentItems = setItems.get(parent.value) || Immutable.OrderedMap<string, SetItem>();
    setItems.set(parent.value, parentItems.set(item.value, clipboardItem));
  }

  return setItems.asImmutable().map(items => items.toArray()).toOrderedMap();
}

function combineItemsIntoSets(
  sets: Immutable.Map<string, PlatformSet>,
  items: Immutable.Map<string, ReadonlyArray<SetItem>>,
  metadata: Map<string, SparqlClient.Binding>
) {
  return Immutable.OrderedMap<string, PlatformSet>().withMutations(result => {
    sets.forEach(set => {
      const setItems = items.get(set.iri.value);
      result.set(set.iri.value, setItems
        ? {...set, items: mergeMetadata(setItems, metadata)}
        : set
      );
    });
    items.forEach((setItems, setIri) => {
      if (sets.has(setIri)) { return; }
      result.set(setIri, {
        iri: Rdf.iri(setIri),
        kind: Defaults.SetKind,
        items: mergeMetadata(setItems, metadata),
        itemCount: setItems.length,
        metadata: metadata.get(setIri) || {},
      });
    });
  });
}

function queryMetadata(
  setItemsMetadataQuery: string,
  context: QueryContext,
  items: MetadataItem[]
): Kefir.Property<Map<string, SparqlClient.Binding>> {

  const iris = new Set<string>();
  const isItemUnique = ({iri}: MetadataItem) => {
    if (iris.has(iri.value)) { return false; }
    iris.add(iri.value);
    return true;
  };

  const requested: SparqlClient.Bindings = items
    .filter(isItemUnique)
    .map(({iri, kind}) => ({
      [SetItemsMetadataBindings.Item]: iri,
      [SetItemsMetadataBindings.Kind]: kind,
    }));

  if (requested.length === 0) {
    return Kefir.constant(new Map<string, SparqlClient.Binding>());
  }

  return SparqlClient.prepareQuery(setItemsMetadataQuery, requested)
    .flatMap(query => SparqlClient.select(query, {context}))
    .map(({results}) => {
      const metadata = new Map<string, SparqlClient.Binding>();
      for (const datum of results.bindings) {
        const {item} = datum;
        if (!(item && item.isIri())) { continue; }
        metadata.set(item.value, datum);
      }
      return metadata;
    }).toProperty();
}

function mergeMetadata(
  items: ReadonlyArray<SetItem>,
  metadata: Map<string, SparqlClient.Binding>
): SetItem[] {
  return items.map<SetItem>(item => ({
    ...item, metadata: metadata.get(item.iri.value) || {},
  }));
}

export function createFilterPatterns(params: {
  setItemsQuery: string;
  searchPattern: string;
  searchText: string;
  filterValues?: Immutable.List<FilterValue>;
}): SparqlJs.Pattern[] {
  const patterns: SparqlJs.Pattern[] = [];

  const parsedQuery = SparqlUtil.parseQuery(params.setItemsQuery);

  if (params.searchPattern && params.searchText) {
    const parsedPatterns = SparqlUtil.parsePatterns(
      params.searchPattern, parsedQuery.prefixes);
    const binder = new TextBinder(
      [{test: FilterBindings.InputText, replace: params.searchText}]);
    parsedPatterns.forEach(p => binder.pattern(p));
    patterns.push(...parsedPatterns);
  }

  if (params.filterValues) {
    const patternGroups = params.filterValues.map(fv => {
      const filterPattern = fv.filter.queryPattern;
      const parsedPatterns = SparqlUtil.parsePatterns(
        filterPattern, parsedQuery.prefixes);
      const binder = new VariableBinder(
        {[FilterBindings.SelectedValue]: FilterValue.value(fv)});
      parsedPatterns.forEach(p => binder.pattern(p));
      return {type: 'group', patterns: parsedPatterns} as SparqlJs.GroupPattern;
    });

    patterns.push({
      type: 'union',
      patterns: patternGroups.toArray(),
    } as SparqlJs.BlockPattern);
  }

  return patterns;
}
