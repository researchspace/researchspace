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

import * as React from 'react';
import { ReactElement, Children } from 'react';
import * as classnames from 'classnames';

import { Cancellation } from 'platform/api/async';
import { Component, ComponentProps } from 'platform/api/components';
import { BuiltInEvents, trigger, listen } from 'platform/api/events';

import { ErrorNotification } from 'platform/components/ui/notification';
import { Ordering } from 'platform/components/ui/reorderable-list';
import { ResourceLabel } from 'platform/components/ui/resource-label';
import { Spinner } from 'platform/components/ui/spinner';
import { DropArea } from 'platform/components/dnd/DropArea';

import { SetManagementContextTypes, SetManagementContext } from './SetManagementApi';
import { SetManagementEventType } from 'platform/api/services/ldp-set/SetManagementEvents';

import * as Defaults from './Defaults';
import { SetManagementProps } from './Configuration';
import { ViewState, ViewModel } from './ViewModel';

import { SearchAndFilters } from './views/SearchAndFilters';
import { SetWithItems, ItemsView, OpenedSetView } from './views/SetsAndItems';
import { Footer } from './views/Footer';

import './set-management.scss';

export const CLASS_NAME = 'set-management';

type Props = SetManagementProps & ComponentProps;
export class SetManagement extends Component<Props, ViewState> {
  static readonly defaultProps: Partial<Props> = Defaults.ForAllProps;

  static readonly childContextTypes = {
    ...Component.childContextTypes,
    ...SetManagementContextTypes,
  };
  getChildContext() {
    const superContext = super.getChildContext();
    const childContext: SetManagementContext = {
      'mp-set-management': {
        removeSet: this.model.removeSet,
        removeSetItem: this.model.removeSetItem,
        startRenamingSet: this.model.startRenamingSet,
        fetchSetItems: this.model.fetchSetItems,
      },
    };
    type ChildContext = typeof superContext & typeof childContext;
    return {...superContext, ...childContext} as ChildContext;
  }

  private readonly cancellation = new Cancellation();
  private model: ViewModel;
  private pendingState: ViewState;

  constructor(props: Props, context: any) {
    super(props, context);

    this.state = this.pendingState = ViewModel.loadState(this.props);

    this.model = new ViewModel({
      props: this.props,
      cancellation: this.cancellation,
      getState: () => this.pendingState,
      setState: state => this.setViewState(state),
      getContext: () => this.context.semanticContext,
      trigger: (eventType, data) => this.trigger(eventType, data),
    });
  }

  /** Disallow to directly call setState() for this component */
  setState(state: never) {
    super.setState(state);
  }

  setViewState(state: ViewState) {
    this.pendingState = {...this.pendingState, ...state};
    super.setState(this.pendingState);
  }

  componentDidMount() {
    this.model.loadSets({keepItems: false});
    this.registerEventsListener();
  }

  /*
   * Update data on refresh event.
   */
  private registerEventsListener() {
    this.cancellation.map(
      listen({
        eventType: BuiltInEvents.ComponentRefresh,
        target: this.props.id,
      }),
    ).onValue(() => {
      // fully reload sets and items (including labels)
      this.setViewState({sets: undefined});
      this.model.loadSets({keepItems: false});
    });
  }

  private trigger(eventType: SetManagementEventType, data?: any) {
    trigger({eventType, source: this.props.id, data});
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  render() {
    const className = classnames({
      [CLASS_NAME]: true,
      [`${CLASS_NAME}--readonly`]: this.props.readonly,
      [`${CLASS_NAME}--list-view`]: this.state.itemViewMode === 'list',
      [`${CLASS_NAME}--grid-view`]: this.state.itemViewMode === 'grid',
      [`${CLASS_NAME}--only-opened-set`]:
        this.state.openedSet && !ViewState.isSearchOpened(this.state),
    });

    const view = this.renderView();
    if (this.props.readonly) {
      return (
        <div className={className}>
          <div className={`${CLASS_NAME}__children`}>
            {...view}
          </div>
        </div>
      );
    } else {
      return this.renderDropArea(view, className);
    }
  }

  private renderDropArea(children: ReadonlyArray<React.ReactNode>, className: string) {
    const displayedSetIri = ViewState.displayedSetIri(this.state);
    return (
      <DropArea className={className}
        shouldReactToDrag={() => !this.state.draggingItem}
        query={this.props.acceptResourceQuery}
        onDrop={iri => {
          this.model.onDropItemToSet(iri, displayedSetIri);
        }}
        dropMessage={displayedSetIri
          ? <span>Drop items here to add to set
              "{<ResourceLabel iri={displayedSetIri.value} />}"
            </span>
          : <span>Drop items here to add to the default set</span>
        }>
        {...children}
      </DropArea>
    );
  }

  private renderView() {
    const {readonly} = this.props;
    const {itemViewMode, itemsOrdering} = this.state;
    const hasOpenedSet = Boolean(this.state.openedSet);
    const hasSearchOpened = ViewState.isSearchOpened(this.state);

    const displayedSet = ViewState.displayedSet(this.state);
    const setHasItems = displayedSet &&
      displayedSet.items && displayedSet.items.length > 0;

    const view = (
      <div className={`${CLASS_NAME}__drop-area-children`}>
        {this.renderSearchAndFilters()}
        {hasOpenedSet ? this.renderBackToContentsButton() : undefined}
        {(
          hasSearchOpened ? this.renderSearchResults() :
          hasOpenedSet ? this.renderOpenedSet() :
          this.renderAllSets()
        )}
        <Footer baseClass={CLASS_NAME}
          readonly={readonly}
          itemViewMode={itemViewMode}
          onModeChanged={this.model.setItemViewMode}
          canReorder={setHasItems}
          isReordering={Boolean(itemsOrdering)}
          onPressReorder={() => this.setViewState({
            // toggle reordering mode
            itemsOrdering: itemsOrdering ? undefined : Ordering.empty,
          })}
          onPressCreateNewSet={this.model.startCreatingNewSet}
          onPressReorderApply={this.model.applyItemsOrder}
        />
      </div>
    );
    return Children.toArray((view.props as React.Props<any>).children);
  }

  private renderAllSets(): ReactElement<any> {
    if (this.state.loadingError) {
      return <ErrorNotification key='sets-error' errorMessage={this.state.loadingError} />;
    }

    const {defaultSet, sets, itemsOrdering} = this.state;

    const renderedSets = sets ? sets.filterNot(
      set => set.iri.equals(defaultSet),
    ).map(set => (
      <SetWithItems
        key={set.iri.value}
        baseClass={CLASS_NAME}
        set={set}
        showItems={false}
        template={this.model.templateForKind}
        onOpen={iri => this.model.openAndLoadSet(iri)}
        onDragStart={this.onDragStart}
        onDragEnd={this.onDragEnd}
        onEditCompleted={newName => this.model.onSetEditCompleted(set, newName)}
      />
    )).toArray() : [<Spinner key='sets-loading' />];

    return (
      <div key='all-sets' className={`${CLASS_NAME}__sets`}>
        {renderedSets}
        <ItemsView key={'default-set-items'}
          baseClass={CLASS_NAME}
          set={sets ? sets.get(defaultSet.value) : undefined}
          template={this.model.templateForKind}
          onDragStart={this.onDragStart}
          onDragEnd={this.onDragEnd}
          itemsOrdering={itemsOrdering}
          onOrderChanged={order => this.setViewState({itemsOrdering: order})}
        />
      </div>
    );
  }

  private renderSearchAndFilters() {
    const {search} = this.state;
    return (
      <SearchAndFilters key='search-and-filters'
        baseClass={CLASS_NAME}
        keywordFilter={this.props.keywordFilter}
        setIsOpen={Boolean(this.state.openedSet)}
        minInputLength={this.model.minSearchTermLength()}
        filters={this.props.filters}
        searchText={search.searchText}
        filterValues={search.filterValues}
        onSearchTextChanged={searchText => {
          this.model.onFilterChanged(true, searchText, this.state.search.filterValues);
        }}
        onFilterChanged={filterValues => {
          this.model.onFilterChanged(false, this.state.search.searchText, filterValues);
        }}
      />
    );
  }

  private renderSearchResults(): ReactElement<any> {
    return (
      <div key='search-results' className={`${CLASS_NAME}__search-results`}>
        {this.renderSearchResultsContent()}
      </div>
    );
  }

  private renderSearchResultsContent() {
    if (this.state.search.results) {
      if (this.state.search.results.size === 0) {
        return <div className={`${CLASS_NAME}__search-results-empty`}>No results found</div>;
      }
      return this.state.search.results.map(set => (
        <SetWithItems
          key={set.iri.value}
          baseClass={CLASS_NAME}
          set={set}
          template={this.model.templateForKind}
          highlightedTerm={this.state.search.searchText}
          onOpen={iri => this.model.openAndLoadSet(iri)}
          onDragStart={this.onDragStart}
          onDragEnd={this.onDragEnd}
          onEditCompleted={newName => this.model.onSetEditCompleted(set, newName)}
        />)
      ).toArray();
    } else if (this.state.search.error) {
      return <ErrorNotification key='search-error' errorMessage={this.state.search.error} />;
    } else {
      return <Spinner key='search-loading' />;
    }
  }

  private renderBackToContentsButton() {
    return (
      <button className={`${CLASS_NAME}__back-to-contents btn btn-success`}
        onClick={() => this.setViewState({
          openedSet: undefined,
          search: {},
          itemsOrdering: undefined,
        })}>
        <span className='fa fa-chevron-left'></span> Back to contents
      </button>
    );
  }

  private renderOpenedSet(): ReactElement<any> {
    const {openedSet, itemsOrdering, sets} = this.state;
    const set = sets ? sets.get(openedSet.value) : undefined;
    return (
      <OpenedSetView set={set}
        baseClass={CLASS_NAME}
        template={this.model.templateForKind}
        onDragStart={this.onDragStart}
        onDragEnd={this.onDragEnd}
        onEditCompleted={newName => this.model.onSetEditCompleted(set, newName)}
        itemsOrdering={itemsOrdering}
        onOrderChanged={order => this.setViewState({itemsOrdering: order})}
      />
    );
  }

  private onDragStart = () => this.setViewState({draggingItem: true});
  private onDragEnd = () => this.setViewState({draggingItem: false});
}

export default SetManagement;
