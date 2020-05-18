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

import * as Immutable from 'immutable';
import * as Kefir from 'kefir';

import { Cancellation } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { QueryContext } from 'platform/api/sparql';

import {
  getSetServiceForUser,
  getUserSetRootContainerIri,
  getUserDefaultSetIri,
  SetService,
} from 'platform/api/services/ldp-set';
import { getLabel } from 'platform/api/services/resource-label';

import { addNotification } from 'platform/components/ui/notification';
import { Ordering } from 'platform/components/ui/reorderable-list';
import { BrowserPersistence } from 'platform/components/utils';

import {
  SetManagementEvents,
  SetManagementEventType,
  ItemsFilteredData,
} from 'platform/api/services/ldp-set/SetManagementEvents';
import { SetManagementProps, ItemViewMode } from './Configuration';
import * as Defaults from './Defaults';
import {
  PlatformSet,
  SetItem,
  FilterValue,
  searchForSetsAndItems,
  fetchSetItems,
  createFilterPatterns,
  EditType,
} from './SetsModel';

export interface ViewState {
  readonly defaultSet?: Rdf.Iri;
  readonly sets?: Immutable.Map<string, PlatformSet>;
  readonly loadingSets?: boolean;
  readonly loadingError?: any;

  readonly search?: SearchState;

  readonly openedSet?: Rdf.Iri;
  readonly draggingItem?: boolean;
  readonly itemViewMode?: ItemViewMode;
  readonly itemsOrdering?: Ordering;
}

export interface SearchState {
  readonly quering?: boolean;
  readonly searchText?: string;
  readonly filterValues?: Immutable.List<FilterValue>;
  readonly results?: Immutable.Map<string, PlatformSet>;
  readonly error?: any;
}

const LocalStorageState = BrowserPersistence.adapter<{
  readonly itemViewMode?: ItemViewMode;
}>();

export namespace ViewState {
  export function openedSet(state: ViewState): PlatformSet | undefined {
    return state.openedSet ? state.sets.get(state.openedSet.value) : undefined;
  }

  export function displayedSetIri(state: ViewState): Rdf.Iri {
    if (state.openedSet) {
      return state.openedSet;
    } else if (state.defaultSet) {
      return state.defaultSet;
    } else {
      return undefined;
    }
  }

  export function displayedSet(state: ViewState): PlatformSet | undefined {
    const iri = displayedSetIri(state);
    return iri && state.sets ? state.sets.get(iri.value) : undefined;
  }

  export function isSearchOpened(state: ViewState) {
    const { quering, results, error } = state.search;
    return quering || results || error;
  }
}

const SEARCH_DELAY_MS = 300;

export type Trigger = (eventType: SetManagementEventType, data?: any) => void;

export class ViewModel {
  private readonly props: SetManagementProps;

  private readonly getState: () => ViewState;
  private readonly setState: (state: ViewState) => void;

  private readonly getContext: () => QueryContext;
  private readonly trigger: Trigger;

  private readonly cancellation: Cancellation;
  private loadingSets: Cancellation;
  private searching: Cancellation;
  private fetchingSetNameToRename: Cancellation;

  constructor(options: {
    props: SetManagementProps;
    cancellation: Cancellation;
    getState: () => ViewState;
    setState: {
      (state: ViewState): void;
      (updater: (state: ViewState) => ViewState): void;
    };
    getContext: () => QueryContext;
    trigger: Trigger;
  }) {
    bindAllMethods(this, ViewModel);

    this.props = options.props;
    this.getState = options.getState;
    this.setState = options.setState;
    this.getContext = options.getContext;
    this.trigger = options.trigger;

    this.cancellation = options.cancellation;
    this.loadingSets = this.cancellation.derive();
    this.searching = this.cancellation.derive();
    this.fetchingSetNameToRename = this.cancellation.derive();
  }

  itemConfig(kind: Rdf.Node) {
    if (this.props.itemConfig) {
      return this.props.itemConfig[kind.toString()];
    } else {
      return Defaults.itemConfig(kind);
    }
  }

  templateForKind(kind: Rdf.Node, expectedToBeSet: boolean) {
    const config = this.itemConfig(kind);
    const viewMode = this.getState().itemViewMode;
    if (viewMode === 'list') {
      return (
        (config && config.listTemplate) || (expectedToBeSet ? Defaults.SetListTemplate : Defaults.ItemListTemplate)
      );
    } else if (viewMode === 'grid') {
      const template = config && config.gridTemplate;
      return template || (expectedToBeSet ? Defaults.SetListTemplate : Defaults.GridTemplate);
    } else {
      throw new Error(`Unknown item view mode`);
    }
  }

  isSet(kind: Rdf.Node) {
    const config = this.itemConfig(kind);
    return config && config.isSet;
  }

  minSearchTermLength() {
    const minLength = this.props.keywordFilter.minSearchTermLength;
    return minLength === undefined ? Defaults.MinSearchTermLength : minLength;
  }

  rootSetIri(): Kefir.Property<Rdf.Iri> {
    return this.props.rootSetIri
      ? Kefir.constant(Rdf.iri(this.props.rootSetIri))
      : Kefir.fromPromise(getUserSetRootContainerIri()).toProperty();
  }

  defaultSetIri(): Kefir.Property<Rdf.Iri> {
    return this.props.defaultSetIri
      ? Kefir.constant(Rdf.iri(this.props.defaultSetIri))
      : Kefir.fromPromise(getUserDefaultSetIri()).toProperty();
  }

  static localStorageId(props: SetManagementProps) {
    const suffix = props.id;
    return `mp-set-management${suffix ? `-${suffix}` : ''}`;
  }

  static loadState(props: SetManagementProps): ViewState {
    let itemViewMode: ItemViewMode;
    if (props.persistViewMode) {
      const localState = LocalStorageState.get(ViewModel.localStorageId(props));
      if (localState.itemViewMode === 'list' || localState.itemViewMode === 'grid') {
        itemViewMode = localState.itemViewMode;
      }
    }
    return {
      search: {},
      itemViewMode: itemViewMode || props.defaultViewMode,
    };
  }

  setItemViewMode(itemViewMode: ItemViewMode) {
    if (this.props.persistViewMode) {
      LocalStorageState.update(ViewModel.localStorageId(this.props), { itemViewMode });
    }
    this.setState({ itemViewMode });
  }

  loadSets(params: { keepItems: boolean }) {
    const { setItemsQuery, setItemsMetadataQuery, setCountQuery } = this.props;
    const context = this.getContext();

    this.loadingSets.cancelAll();
    this.loadingSets = this.cancellation.derive();

    this.setState({ loadingSets: true });

    this.loadingSets
      .map(
        this.rootSetIri().flatMap((rootSet) =>
          Kefir.combine([
            this.defaultSetIri(),
            searchForSetsAndItems({
              setItemsQuery,
              setItemsMetadataQuery,
              setCountQuery,
              context,
              rootSet,
              isSet: this.isSet,
            }),
          ])
        )
      )
      .observe({
        value: ([defaultSet, loadedSets]) => {
          const state = this.getState();
          let sets = params.keepItems ? reuseOldSetItems(loadedSets, state.sets) : loadedSets;
          if (!sets.has(defaultSet.value)) {
            console.warn(`Default set ${defaultSet} not found`);
            sets = sets.set(defaultSet.value, emptySet(defaultSet));
          }

          // if active set was removed while user is inside of it
          // we need to switch back to default one
          const openedSet = state.openedSet && sets.has(state.openedSet.value) ? state.openedSet : undefined;
          this.setState({ loadingSets: false, sets, defaultSet, openedSet });

          const activeSet = openedSet || defaultSet;
          this.loadSetItems(activeSet, { forceReload: !params.keepItems });
          if (!activeSet.equals(defaultSet)) {
            // if refresh event happened inside named set we also need to update default set content
            // because otherwise it can show stalled data when user clicked 'navigate back to content'
            this.loadSetItems(defaultSet, { forceReload: !params.keepItems });
          }
        },
        error: (loadingError) => this.setState({ loadingSets: false, loadingError }),
      });
  }

  private loadSetItems(setIri: Rdf.Iri, params: { forceReload?: boolean } = {}) {
    const state = this.getState();
    const set = state.sets.get(setIri.value);
    // do nothing when asked to load items of missing set
    if (!set) {
      return;
    }

    if (set.items && !params.forceReload) {
      return;
    }

    this.setState({
      sets: state.sets.set(set.iri.value, {
        ...set,
        isLoading: true,
        loadingError: undefined,
      }),
    });

    this.loadingSets
      .map(
        fetchSetItems(
          this.props.setItemsQuery,
          this.props.setItemsMetadataQuery,
          this.getContext(),
          setIri,
          (kind) => !this.isSet(kind)
        )
      )
      .observe({
        value: (items) => this.onSetItemsLoaded(setIri, items, undefined),
        error: (error) => this.onSetItemsLoaded(setIri, undefined, error),
      });
  }

  private onSetItemsLoaded(
    setIri: Rdf.Iri,
    allSetsItems: Map<string, ReadonlyArray<SetItem>> | undefined,
    loadingError: any
  ) {
    const state = this.getState();
    this.setState({
      sets: state.sets.update(setIri.value, (set) => {
        let { items, itemCount } = set;
        if (!loadingError) {
          items = allSetsItems.get(setIri.value) || [];
          itemCount = items.length;
        }
        return { ...set, isLoading: false, loadingError, items, itemCount };
      }),
    });
  }

  openAndLoadSet(setIri: Rdf.Iri) {
    const state = this.getState();
    if (state.openedSet && state.openedSet.equals(setIri)) {
      return;
    }
    this.loadSetItems(setIri);
    this.setState({ openedSet: setIri, search: {}, itemsOrdering: undefined });
  }

  onDropItemToSet(item: Rdf.Iri, targetSet: Rdf.Iri) {
    this.cancellation
      .map(getSetServiceForUser(this.getContext()).flatMap((service) => service.addToExistingSet(targetSet, item)))
      .observe({
        value: () => {
          // This is ugly hack to fully reload all sets if we add something to the
          // Uncategorized set, we need this to fetch Knowledg Maps when they are added
          // to the clipboard
          if (targetSet.equals(this.getState().defaultSet)) {
            this.loadSets({keepItems: false});
          } else {
            this.trigger(SetManagementEvents.ItemAdded);
            this.loadSetItems(targetSet, {forceReload: true});
          }
        },
        error: (error) => {
          addNotification(
            {
              level: 'error',
              message: 'Error adding item to set',
            },
            error
          );
        },
      });
  }

  onFilterChanged(textInput: boolean, searchText: string, filterValues: Immutable.List<FilterValue> | undefined) {
    const cancellation = this.cancellation.derive();
    this.searching.cancelAll();
    this.searching = cancellation;

    const state = this.getState();
    const search: SearchState = { ...state.search, searchText, filterValues };

    const hasSearchText = searchText && searchText.length >= this.minSearchTermLength();
    const hasFilterValues = filterValues && filterValues.size > 0;

    if (textInput && hasSearchText) {
      this.setState({ search: { ...search, quering: true } });
      cancellation.map(Kefir.later(SEARCH_DELAY_MS, {})).onValue(() => {
        this.startSearching(cancellation, searchText, filterValues);
      });
    } else if (hasSearchText || hasFilterValues) {
      this.setState({ search: { ...search, quering: true } });
      this.startSearching(cancellation, hasSearchText ? searchText : undefined, filterValues);
    } else {
      this.setState({ search: { ...search, quering: false, results: undefined, error: undefined } });
      this.trigger(SetManagementEvents.ItemsFiltered, {});
    }
  }

  private startSearching(cancellation: Cancellation, searchText: string, filterValues: Immutable.List<FilterValue>) {
    const { setItemsQuery, setItemsMetadataQuery, setCountQuery } = this.props;

    const state = this.getState();
    const filterPatterns = createFilterPatterns({
      setItemsQuery: this.props.setItemsQuery,
      searchPattern: this.props.keywordFilter.queryPattern,
      searchText,
      filterValues,
    });

    cancellation
      .map(
        this.rootSetIri().flatMap((rootSetIri) =>
          searchForSetsAndItems({
            setItemsQuery,
            setCountQuery,
            setItemsMetadataQuery,
            context: this.getContext(),
            rootSet: rootSetIri,
            isSet: this.isSet,
            setToSearch: state.openedSet,
            filterPatterns,
          })
        )
      )
      .map((results) => results.filter((set) => set.items && set.items.length > 0).toMap())
      .observe({
        value: (results) => {
          this.setState({ search: { ...state.search, quering: false, results } });

          const itemsIris = new Set<string>();
          results.forEach(({ items }) => items.forEach(({ iri }) => itemsIris.add(iri.value)));
          const data: ItemsFilteredData = { iris: Array.from(itemsIris) };
          this.trigger(SetManagementEvents.ItemsFiltered, data);
        },
        error: (error) => this.setState({ search: { ...state.search, quering: false, error } }),
      });
  }

  startCreatingNewSet() {
    const newSet: PlatformSet = {
      ...emptySet(Rdf.iri('')),
      editing: { type: EditType.Create, newName: 'My New Set' },
    };
    const state = this.getState();
    const sets = Immutable.OrderedMap({ [newSet.iri.value]: newSet })
      .concat(state.sets)
      .toOrderedMap();
    this.setState({ sets, openedSet: undefined, search: {} });
  }

  onSetEditCompleted(modifiedSet: PlatformSet, newName: string | undefined) {
    const state = this.getState();
    const { editing } = modifiedSet;
    if (editing && editing.type === EditType.Create) {
      if (newName) {
        this.createNewSet(modifiedSet.iri, newName);
      } else {
        // creating cancelled
        const sets = state.sets.delete(modifiedSet.iri.value);
        this.setState({ sets });
      }
    } else if (editing && editing.type === EditType.Rename) {
      if (!editing.fetchingName && newName && newName !== editing.oldName) {
        this.renameSet(modifiedSet.iri, editing.oldName, newName);
      } else {
        // renaming cancelled
        const sets = state.sets.update(modifiedSet.iri.value, (set) => ({
          ...set,
          editing: undefined,
          newName: undefined,
        }));
        this.setState({ sets });
      }
    }
  }

  private createNewSet(placeholderSetIri: Rdf.Iri, name: string) {
    const { sets } = this.getState();
    this.setState({
      sets: sets.update(placeholderSetIri.value, (set) => ({ ...set, editing: { type: EditType.ApplyingChanges } })),
    });

    this.cancellation
      .map(getSetServiceForUser(this.getContext()).flatMap((service) => service.createSet(name)))
      .observe({
        value: () => {
          this.loadSets({ keepItems: true });
          this.trigger(SetManagementEvents.SetAdded);
        },
        error: (error) => {
          addNotification(
            {
              level: 'error',
              message: `Error creating new set '${name}`,
            },
            error
          );
        },
      });
  }

  private renameSet(setIri: Rdf.Iri, oldName: string, newName: string) {
    const { sets } = this.getState();
    this.setState({
      sets: sets.update(setIri.value, (set) => ({ ...set, editing: { type: EditType.ApplyingChanges } })),
    });

    this.cancellation
      .map(getSetServiceForUser(this.getContext()).flatMap((service) => service.renameResource(setIri, newName)))
      .observe({
        value: () => {
          this.loadSets({ keepItems: true });
          this.trigger(SetManagementEvents.SetRenamed);
        },
        error: (error) => {
          addNotification(
            {
              level: 'error',
              message: `Error renaming set '${oldName}' to '${newName}'`,
            },
            error
          );
        },
      });
  }

  removeSet(set: Rdf.Iri) {
    this.cancellation
      .map(getSetServiceForUser(this.getContext()).flatMap((service) => service.deleteResource(set)))
      .observe({
        value: () => {
          this.setState({ openedSet: undefined });
          this.loadSets({ keepItems: true });
          this.trigger(SetManagementEvents.SetRemoved);
        },
        error: (error) => {
          addNotification(
            {
              level: 'error',
              message: `Error removing set`,
            },
            error
          );
        },
      });
  }

  removeSetItem(set: Rdf.Iri | undefined, item: Rdf.Iri) {
    const actionableSet = set || this.getState().defaultSet;
    this.cancellation.map(
      getSetServiceForUser(this.getContext()).flatMap(
        () => new SetService(actionableSet.value).deleteResource(item)),
    ).observe({
      value: () => {
        // The same hack as in onDropItemToSet
        if (!set) {
          this.loadSets({keepItems: false});
        } else {
          this.loadSetItems(actionableSet, {forceReload: true});
        }
        this.trigger(SetManagementEvents.ItemRemoved);
      },
      error: error => {
        addNotification({
          level: 'error',
          message: 'Error removing set item',
        }, error);
      },
    });
  }

  startRenamingSet(targetSet: Rdf.Iri) {
    const state = this.getState();
    this.setState({
      search: {},
      sets: state.sets.update(targetSet.value, (set) => {
        if (!set || set.editing) {
          return set;
        }
        return { ...set, editing: { type: EditType.Rename, fetchingName: true } };
      }),
    });

    const context = this.getContext();

    this.fetchingSetNameToRename.cancelAll();
    this.fetchingSetNameToRename = this.cancellation.derive();
    this.fetchingSetNameToRename.map(getLabel(targetSet, { context })).observe({
      value: (oldName) => {
        const { sets } = this.getState();
        this.setState({
          sets: sets.update(targetSet.value, (set) => {
            if (!(set && set.editing)) {
              return set;
            }
            const { editing } = set;
            if (!(editing.type === EditType.Rename && editing.fetchingName)) {
              return set;
            }
            return { ...set, editing: { type: EditType.Rename, oldName, newName: oldName } };
          }),
        });
      },
    });
  }

  applyItemsOrder() {
    const state = this.getState();
    const displayedSet = ViewState.displayedSet(state);
    if (!displayedSet) {
      return;
    }

    const items = state.itemsOrdering.apply(displayedSet.items);
    this.setState({
      itemsOrdering: undefined,
      sets: state.sets.update(displayedSet.iri.value, (set) => ({ ...set, items, isLoading: true })),
    });

    const holders = Immutable.List(items.map((item) => ({ holder: item.itemHolder, item: item.iri })));

    this.cancellation
      .map(
        getSetServiceForUser(this.getContext()).flatMap((service) => service.reorderItems(displayedSet.iri, holders))
      )
      .observe({
        value: () => {
          this.loadSetItems(displayedSet.iri, { forceReload: true });
          this.trigger(SetManagementEvents.ItemsReordered);
        },
        error: (error) => {
          const { sets } = this.getState();
          const set = sets.get(displayedSet.iri.value);
          if (set && set.isLoading) {
            this.setState({
              sets: sets.set(set.iri.value, { ...set, isLoading: false }),
            });
          }
          addNotification(
            {
              level: 'error',
              message: 'Error reordering set items',
            },
            error
          );
        },
      });
  }

  fetchSetItems(setIri: Rdf.Iri) {
    return fetchSetItems(
      this.props.setItemsQuery,
      this.props.setItemsMetadataQuery,
      this.getContext(),
      setIri,
      (kind) => !this.isSet(kind)
    ).map((allSetsItems) => allSetsItems.get(setIri.value) || []);
  }
}

function bindAllMethods<T>(instance: T, type: { prototype: T }) {
  for (const methodName in type.prototype) {
    if (type.prototype.hasOwnProperty(methodName)) {
      const method: Function | void = (type.prototype as any)[methodName];
      if (typeof method === 'function') {
        (instance as any)[methodName] = method.bind(instance);
      }
    }
  }
}

export function emptySet(iri: Rdf.Iri): PlatformSet {
  return { iri, kind: Defaults.SetKind, metadata: {} };
}

function reuseOldSetItems(
  newSets: Immutable.Map<string, PlatformSet>,
  oldSets: Immutable.Map<string, PlatformSet> | undefined
) {
  if (!oldSets) {
    return newSets;
  }
  return newSets
    .map((set, key) => {
      const oldSet = oldSets.get(key);
      if (!oldSet || !oldSet.items || set.items) {
        return set;
      }
      return { ...set, items: oldSet.items, itemCount: oldSet.itemCount };
    })
    .toOrderedMap();
}
