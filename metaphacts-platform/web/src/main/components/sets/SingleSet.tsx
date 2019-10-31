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
import * as Immutable from 'immutable';
import * as classnames from 'classnames';

import { Cancellation } from 'platform/api/async';
import { Component, ComponentProps } from 'platform/api/components';
import { BuiltInEvents, listen, trigger } from 'platform/api/events';
import { Rdf } from 'platform/api/rdf';

import { Ordering } from 'platform/components/ui/reorderable-list';
import { ResourceLabel } from 'platform/components/ui/resource-label';
import { Spinner } from 'platform/components/ui/spinner';
import { DropArea } from 'platform/components/dnd/DropArea';

import {
  SetManagementContext, SetManagementContextTypes,
  SetViewContext, SetViewContextTypes,
} from './SetManagementApi';
import { SetManagementEventType } from 'platform/api/services/ldp-set/SetManagementEvents';

import * as Defaults from './Defaults';
import { SetManagementProps } from './Configuration';
import { PlatformSet } from './SetsModel';
import { ViewState, ViewModel, emptySet } from './ViewModel';

import { SearchAndFilters } from './views/SearchAndFilters';
import { ItemsView, EditableLabel } from './views/SetsAndItems';
import {
  ReorderingProps, ReorderItemsButton, ReorderConfirmation, ItemViewModeSwitch,
} from './views/Footer';

import { CLASS_NAME } from './SetManagement';

export interface SingleSetProps extends SetManagementProps {
  /**
   * IRI of displayed set.
   */
  openedSet: string;
}

type Props = SingleSetProps & ComponentProps;
export class SingleSet extends Component<Props, ViewState> {
  static readonly defaultProps: Partial<Props> = Defaults.ForAllProps;

  static readonly childContextTypes = {
    ...Component.childContextTypes,
    ...SetManagementContextTypes,
    ...SetViewContextTypes,
  };
  getChildContext() {
    const superContext = super.getChildContext();
    const childContext: SetManagementContext & SetViewContext = {
      'mp-set-management': {
        removeSet: this.model.removeSet,
        removeSetItem: this.model.removeSetItem,
        startRenamingSet: this.model.startRenamingSet,
        fetchSetItems: this.model.fetchSetItems,
      },
      'mp-set-management--set-view': {
        getCurrentSet: () => this.state.openedSet,
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
    this.registerEventsListener();

    const placeholder = emptySet(Rdf.iri(this.props.openedSet));
    this.setViewState({
      sets: Immutable.Map<string, PlatformSet>()
        .set(placeholder.iri.value, placeholder)
    });
    this.model.openAndLoadSet(placeholder.iri);
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
    ).onValue(() => this.model.loadSets({keepItems: false}));
  }

  private trigger(eventType: SetManagementEventType, data?: any) {
    trigger({eventType, source: this.props.id, data});
  }

  render() {
    const className = classnames({
      [CLASS_NAME]: true,
      [`${CLASS_NAME}--list-view`]: this.state.itemViewMode === 'list',
      [`${CLASS_NAME}--grid-view`]: this.state.itemViewMode === 'grid',
    });

    return (
      <DropArea className={className}
        shouldReactToDrag={() => !this.state.draggingItem}
        query={this.props.acceptResourceQuery}
        onDrop={iri => {
          const targetSet = ViewState.displayedSetIri(this.state);
          this.model.onDropItemToSet(iri, targetSet);
        }}
        dropMessage={
          <span>Drop items here to add to set
            "{<ResourceLabel iri={this.props.openedSet} />}"
          </span>
        }>
        {this.renderHeader()}
        {this.renderItems()}
      </DropArea>
    );
  }

  renderHeader() {
    const set = ViewState.openedSet(this.state);
    if (!set) { return <Spinner />; }

    const {itemsOrdering, itemViewMode} = this.state;
    const setHasItems = set.items && set.items.length > 0;

    const reorderProps: ReorderingProps | undefined = setHasItems ? {
      baseClass: CLASS_NAME,
      canReorder: setHasItems,
      isReordering: Boolean(itemsOrdering),
      onPressReorder: () => this.setViewState({
        // toggle reordering mode
        itemsOrdering: itemsOrdering ? undefined : Ordering.empty,
      }),
      onPressReorderApply: this.model.applyItemsOrder,
    } : undefined;

    return (
      <div className={`${CLASS_NAME}__single-set-header`}>
        <div className={`${CLASS_NAME}__single-set-header-top`}>
          {this.renderCaption(set)}
          <div className={`${CLASS_NAME}__single-set-header-spacer`} />
          <SearchAndFilters baseClass={CLASS_NAME}
            keywordFilter={this.props.keywordFilter}
            filters={this.props.filters}
            setIsOpen={true}
            minInputLength={this.model.minSearchTermLength()}
            searchText={this.state.search.searchText}
            filterValues={this.state.search.filterValues}
            onSearchTextChanged={searchText => {
              this.model.onFilterChanged(true, searchText, this.state.search.filterValues);
            }}
            onFilterChanged={filterValues => {
              this.model.onFilterChanged(false, this.state.search.searchText, filterValues);
            }}
          />
        </div>
        <div className={`${CLASS_NAME}__single-set-header-bottom`}>
          {this.props.children}
          <div className={`${CLASS_NAME}__single-set-header-spacer`} />
          {reorderProps ? <ReorderItemsButton {...reorderProps} /> : null}
          <ItemViewModeSwitch baseClass={CLASS_NAME}
            mode={itemViewMode}
            onModeChanged={this.model.setItemViewMode}
          />
        </div>
        {(reorderProps && itemsOrdering) ? <ReorderConfirmation {...reorderProps} /> : null}
      </div>
    );
  }

  private renderCaption(set: PlatformSet) {
    const isEditing = Boolean(set.editing);
    return (
      <div className={`${CLASS_NAME}__single-set-caption`}>
        <div className={`${CLASS_NAME}__single-set-icon`}>
          <span className='fa fa-folder-open' />
        </div>
        {isEditing
          ? <EditableLabel editing={set.editing}
              onEditCompleted={newName => this.model.onSetEditCompleted(set, newName)}
              className={`${CLASS_NAME}__single-set-label`}
            />
          : <ResourceLabel iri={this.props.openedSet}
              className={`${CLASS_NAME}__single-set-label`}
            />
        }
        {!isEditing ? (
          <button type='button' title='Rename set'
            className={`${CLASS_NAME}__single-set-rename-button`}
            onClick={() => this.model.startRenamingSet(set.iri)}>
            <span className='fa fa-pencil' />
          </button>
        ) : null}
      </div>
    );
  }

  renderItems() {
    const {itemsOrdering} = this.state;

    let set = ViewState.openedSet(this.state);
    let highlightedTerm: string | undefined = undefined;

    if (ViewState.isSearchOpened(this.state)) {
      highlightedTerm = this.state.search.searchText;
      const results = this.state.search.results;
      const searchSet = results ? results.get(this.props.openedSet) : undefined;
      if (searchSet) {
        set = searchSet;
      } else {
        return <div className={`${CLASS_NAME}__search-results-empty`}>No results found</div>;
      }
    }

    return (
      <ItemsView key={'default-set-items'}
        baseClass={CLASS_NAME}
        set={set}
        template={this.model.templateForKind}
        highlightedTerm={highlightedTerm}
        onDragStart={this.onDragStart}
        onDragEnd={this.onDragEnd}
        itemsOrdering={itemsOrdering}
        onOrderChanged={order => this.setViewState({itemsOrdering: order})}
      />
    );
  }

  private onDragStart = () => this.setViewState({draggingItem: true});
  private onDragEnd = () => this.setViewState({draggingItem: false});
}

export default SingleSet;
