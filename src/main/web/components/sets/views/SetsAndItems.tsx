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
import * as React from 'react';
import { HTMLAttributes } from 'react';
import { findDOMNode } from 'react-dom';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

import { Rdf } from 'platform/api/rdf';
import { ReorderableList, Ordering } from 'platform/components/ui/reorderable-list';
import { Draggable } from 'platform/components/dnd';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';

import { PlatformSet, SetItem, EditState, EditType } from '../SetsModel';
import { SetViewContext, SetViewContextTypes, SetItemViewContext, SetItemViewContextTypes } from '../SetManagementApi';

const ESCAPE_KEY_CODE = 27;
const ENTER_KEY_CODE = 13;

export interface BaseProps {
  baseClass: string;
  template: (kind: Rdf.Node, expectedToBeSet: boolean) => string;
  onDragStart: (iri: string) => void;
  onDragEnd: () => void;
}

export interface SetViewProps extends ItemsViewProps {
  /**
   * Callback invoked when user tries to open this set by clicking on the caption.
   */
  onOpen?: (openedSetIri: Rdf.Iri) => void;
  /**
   * Callback invoked when user accepted a new name for set or
   * cancelled set renaming (`newName` will be undefined in this case).
   */
  onEditCompleted: (newName: string | undefined) => void;
}

export class OpenedSetView extends React.Component<SetViewProps, {}> {
  static readonly childContextTypes = SetViewContextTypes;
  getChildContext(): SetViewContext {
    return {
      'mp-set-management--set-view': {
        getCurrentSet: () => this.props.set.iri,
      },
    };
  }

  render() {
    const { baseClass } = this.props;
    return (
      <div className={`${baseClass}__opened-set`}>
        <SetCaption
          {...this.props}
          className={`${baseClass}__open-set`}
          icon={<span className="fa fa-folder-open" />}
        ></SetCaption>
        <ItemsView key="opened-set-items" {...this.props} />
      </div>
    );
  }
}

export interface SetWithItemsProps extends SetViewProps {
  /**
   * Determines whether should display items of this set.
   */
  showItems?: boolean;
}

export class SetWithItems extends React.Component<SetWithItemsProps, {}> {
  static readonly childContextTypes = SetViewContextTypes;
  getChildContext(): SetViewContext {
    return {
      'mp-set-management--set-view': {
        getCurrentSet: () => this.props.set.iri,
      },
    };
  }

  render() {
    const { showItems = true, ...otherProps } = this.props;
    const { baseClass, set, onEditCompleted } = otherProps;

    return (
      <li className={`${baseClass}__set`}>
        <SetCaption
          {...otherProps}
          className={`${baseClass}__set-caption`}
          set={set}
          onCaptionClick={this.handleOnClick}
          onEditCompleted={onEditCompleted}
          icon={<span className={showItems ? 'fa fa-folder-open' : 'fa fa-folder'} />}
        ></SetCaption>
        {showItems ? <ItemsView {...otherProps} /> : undefined}
      </li>
    );
  }

  private handleOnClick = (e: React.MouseEvent<any>) => {
    // we ignore the click if it happened somewhere in set actions element
    const actionHolder = (findDOMNode(this) as Element).querySelector('.set-management__item-actions');
    if (!(actionHolder && actionHolder.contains(e.target as HTMLElement))) {
      this.props.onOpen(this.props.set.iri);
    }
  };
}

interface SetCaptionProps extends BaseProps {
  className: string;
  set: PlatformSet;
  icon: React.ReactNode;
  onCaptionClick?: (e: React.MouseEvent<any>) => void;
  onEditCompleted: (newName: string | undefined) => void;
}

class SetCaption extends React.Component<SetCaptionProps, {}> {
  render() {
    const { baseClass, className, set, icon } = this.props;
    const isEditing = Boolean(set && set.editing);
    const caption = (
      <div className={className} onClick={isEditing ? undefined : this.props.onCaptionClick}>
        <div className={`${baseClass}__set-icon`}>{icon}</div>
        {this.renderName(set)}
        {set && typeof set.itemCount === 'number' ? (
          <span className={`${baseClass}__set-item-count badge`}>{set.itemCount}</span>
        ) : undefined}
      </div>
    );
    return this.wrapDraggable(!isEditing, caption);
  }

  private renderName(set: PlatformSet | undefined) {
    if (!set) {
      return <Spinner />;
    } else if (set.editing) {
      const { onEditCompleted } = this.props;
      return <EditableLabel editing={set.editing} onEditCompleted={onEditCompleted} />;
    } else {
      const { baseClass } = this.props;
      return (
        <TemplateItem
          componentProps={{ className: `${baseClass}__set-template` }}
          template={{
            source: this.props.template(set.kind, true),
            options: { ...set.metadata, iri: set.iri, kind: set.kind, itemCount: set.itemCount, itemHolder: set.itemHolder },
          }}
        />
      );
    }
  }

  private wrapDraggable(shouldWrap: boolean, node: React.ReactElement<any>) {
    const { set, onDragStart, onDragEnd } = this.props;
    if (!set) {
      return null;
    }
    return shouldWrap ? (
      <Draggable iri={set.iri.value} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        {node}
      </Draggable>
    ) : (
      node
    );
  }
}

export interface EditableLabelProps extends HTMLAttributes<HTMLInputElement> {
  editing: EditState;
  onEditCompleted: (newName: string | undefined) => void;
}

export class EditableLabel extends React.Component<EditableLabelProps, {}> {
  render() {
    // tslint:disable-next-line:no-unused-variable
    const { editing, onEditCompleted, ...otherProps } = this.props;

    if (editing.type === EditType.ApplyingChanges || (editing.type === EditType.Rename && editing.fetchingName)) {
      return <Spinner spinnerDelay={0} />;
    }

    return (
      <input
        {...otherProps}
        type="text"
        autoFocus
        defaultValue={editing.newName}
        ref={(input) => (input ? input.setSelectionRange(0, input.value.length) : null)}
        onKeyDown={this.onKeyDownWhileEditing}
        // prevent unwanted refresh on selection change by mouse click
        onClick={(e) => e.stopPropagation()}
        onBlur={this.onBlurWhileEditing}
      />
    );
  }

  private onKeyDownWhileEditing = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.keyCode === ENTER_KEY_CODE) {
      e.preventDefault();
      this.props.onEditCompleted(e.currentTarget.value);
    } else if (e.keyCode === ESCAPE_KEY_CODE) {
      e.preventDefault();
      this.props.onEditCompleted(undefined);
    }
  };

  private onBlurWhileEditing = (e: React.SyntheticEvent<HTMLInputElement>) => {
    this.props.onEditCompleted(undefined);
  };
}

export interface ItemsViewProps extends BaseProps {
  /** When omited displays loading animation. */
  set: PlatformSet | undefined;
  /** Substring of set item's label to highlight. */
  highlightedTerm?: string;
  itemsOrdering?: Ordering;
  onOrderChanged?: (ordering: Ordering) => void;
}

export class ItemsView extends React.Component<ItemsViewProps, {}> {
  static readonly childContextTypes = SetViewContextTypes;
  getChildContext(): SetViewContext {
    return {
      'mp-set-management--set-view': {
        getCurrentSet: () => this.props.set.iri,
      },
    };
  }

  render() {
    return <div className={`${this.props.baseClass}__items-view`}>{this.renderItemsPane()}</div>;
  }

  private renderItemsPane(): React.ReactElement<any>[] {
    const { set, itemsOrdering, onOrderChanged } = this.props;
    if (set && set.loadingError) {
      return [<ErrorNotification key="error" errorMessage={set.loadingError} />];
    }

    const setItems = set ? set.items : undefined;
    const renderedItems = setItems
      ? setItems.map((item) => <ItemView key={item.iri.value} item={item} {...this.props} />)
      : undefined;

    return [
      !set || set.isLoading ? <Spinner key="spinner" /> : null,
      renderedItems ? (
        itemsOrdering ? (
          <ReorderableList
            key="items"
            className={`${this.props.baseClass}__set-items`}
            itemClass={`${this.props.baseClass}__reordered-item`}
            ordering={itemsOrdering}
            onOrderChanged={onOrderChanged}
          >
            {renderedItems}
          </ReorderableList>
        ) : (
          <TransitionGroup key="items" component="ul" className={`${this.props.baseClass}__set-items`}>
            {renderedItems.map((item) => (
              <CSSTransition key={item.key} classNames="set-items-animation" timeout={{ enter: 800, exit: 500 }}>
                {item}
              </CSSTransition>
            ))}
          </TransitionGroup>
        )
      ) : null,
    ];
  }
}

class ItemView extends React.Component<
  {
    baseClass: string;
    item: SetItem;
    template: (kind: Rdf.Node, expectedToBeSet: boolean) => string;
    /** Substring of label to highlight. */
    highlightedTerm?: string;
    onDragStart: (iri: string) => void;
    onDragEnd: () => void;
  },
  {}
> {
  static readonly childContextTypes = SetItemViewContextTypes;
  getChildContext(): SetItemViewContext {
    return {
      'mp-set-management--set-item-view': {
        getItem: () => this.props.item.itemHolder,
        getSetItemIri: () => this.props.item.iri,
      },
    };
  }

  render() {
    const { template, item, baseClass, onDragEnd, onDragStart, highlightedTerm } = this.props;
    return (
      <Draggable key={item.iri.value} iri={item.iri.value} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <li className={`${baseClass}__set-item`} key={item.iri.value}>
          <TemplateItem
            template={{
              source: template(item.kind, false),
              options: {
                ...item.metadata,
                iri: item.iri,
                itemHolder: item.itemHolder,
                highlight: highlightedTerm,
              },
            }}
          />
        </li>
      </Draggable>
    );
  }
}
