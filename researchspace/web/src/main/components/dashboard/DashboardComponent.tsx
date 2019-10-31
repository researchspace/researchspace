/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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
import { uniqueId } from 'lodash';
import { WorkspaceLayout, WorkspaceLayoutNode, WorkspaceLayoutType } from 'ontodia';

import { Component } from 'platform/api/components';
import { TemplateItem } from 'platform/components/ui/template';
import { getOverlaySystem } from 'platform/components/ui/overlay';
import { ConfirmationDialog } from "platform/components/ui/confirmation-dialog";

import { DashboardItem, DashboardViewConfig } from './DashboardItem';

import * as styles from './Dashboard.scss';

const DEFAULT_ITEM_LABEL_TEMPLATE = `<mp-label iri='{{iri}}'></mp-label>`;

export interface View extends DashboardViewConfig {
  itemLabelTemplate?: string;
  itemBodyTemplate?: string;
}

export interface Item {
  id: string;
  index: number;
  viewId?: string;
  resourceIri?: string;
  isDirty?: boolean;
  isExpanded?: boolean;
}
namespace Item {
  let count = 0;
  export function emptyItem() {
    count = count + 1;
    return {id: uniqueId('frame'), index: count};
  }
}

export interface Props {
  views: Array<View>;
  frameMinSize?: number;
}

export interface State {
  items?: { [id: string]: Item };
  focus?: string;
}

export class DashboardComponent extends Component<Props, State> {
  static defaultProps: Partial<Props> = {
    frameMinSize: 150,
  };

  constructor(props: Props, context: any) {
    super(props, context);
    const item = Item.emptyItem();
    this.state = {
      items: {[item.id]: item},
    };
  }

  private onAddNewItem = () => {
    this.setState((prevState): State => {
      const newItems = {...prevState.items};
      const item = Item.emptyItem();
      newItems[item.id] = item;
      return {items: newItems};
    })
  }

  onExpandItem(itemId: string) {
    this.setState((prevState): State => {
      const newItems = {...prevState.items};
      const item = newItems[itemId];
      newItems[itemId] = {
        ...item,
        isExpanded: !item.isExpanded,
      };
      return {items: newItems};
    });
  }

  private renderLabel(item: Item) {
    const {focus} = this.state;
    const isFocused = focus === item.id;
    const focusedClassName = isFocused ? styles.itemLabelActive : '';
    const dirtyClassName = item.isDirty ? 'text-danger' : '';
    const view = item.viewId
      ? this.props.views.find(view => view.id === item.viewId)
      : undefined;
    if (view && item.resourceIri) {
      let icon = <span>[{view.label}]&nbsp;</span>;
      if (view.iconClass) {
        icon = <i className={`${view.iconClass} ${styles.itemIcon}`} />;
      } else if (view.image) {
        icon = <img src={view.image} className={styles.itemIcon} alt={view.label} />;
      }
      return <span className={`${styles.itemLabel} ${focusedClassName}`}>
        {icon}
        <span className={dirtyClassName}>
          <TemplateItem key={item.id} template={{
            source: view.itemLabelTemplate || DEFAULT_ITEM_LABEL_TEMPLATE,
            options: {iri: item.resourceIri, dashboardId: item.id},
          }} />
        </span>
      </span>;
    }

    return <span className={`${styles.itemLabel} ${focusedClassName} ${dirtyClassName}`}>
      Frame {item.index}
    </span>;
  }

  private renderBody(item: Item) {
    const view = item.viewId
      ? this.props.views.find(view => view.id === item.viewId)
      : undefined;
    if (!view || !view.itemBodyTemplate) { return null; }
    return <TemplateItem key={item.id} template={{
      source: view.itemBodyTemplate,
      options: {iri: item.resourceIri, dashboardId: item.id},
    }} />;
  }

  private onRemoveItem(item: Item) {
    const removeItem = () => {
      this.setState((prevState): State => {
        const newItems = {...prevState.items};
        delete newItems[item.id];
        return {items: newItems};
      })
    };
    if (item.isDirty) {
      const dialogRef = 'removing-confirmation';
      const onHide = () => getOverlaySystem().hide(dialogRef);
      getOverlaySystem().show(
        dialogRef,
        <ConfirmationDialog message={
          'Frame has unsaved changes. Are you sure you want to delete it?'
        }
          onHide={onHide}
          onConfirm={confirm => {
            onHide();
            if (confirm) {
              removeItem();
            }
          }}/>
      );
    } else {
      removeItem();
    }
  }

  private renderItems() {
    const {items} = this.state;
    if (!Object.keys(items).length) {
      return <div className='text-center'>No frames</div>;
    }
    return <div className={`list-group ${styles.itemsList}`}>
      {Object.keys(items).map(id => {
        const item = items[id];
        const body = this.renderBody(item);
        return <div key={item.id} className='list-group-item'
          onClick={() =>
            this.setState({focus: item.id})
          }>
          <div className={styles.itemLabelContainer}>
            {body ? (
              <button className={`btn btn-xs ${styles.expandItemButton}`}
                onClick={() => this.onExpandItem(id)}>
                <i className={
                  `fa ${item.isExpanded ? 'fa fa-caret-down' : 'fa-caret-right'}`
                }/>
              </button>
            ) : null}
            {this.renderLabel(item)}
            <button className={`btn btn-link btn-xs ${styles.deleteItemButton}`}
              onClick={() => this.onRemoveItem(item)}>
              <i className='fa fa-times text-danger'/>
            </button>
          </div>
          {body && item.isExpanded ? body : null}
        </div>;
      })}
    </div>
  }

  private onSelectView({itemId, viewId, resourceIri}: {
    itemId: string;
    viewId: string;
    resourceIri: string;
  }) {
    this.setState((prevState): State => {
      const newItems = {...prevState.items};
      const item = newItems[itemId];
      newItems[itemId] = {
        ...item,
        viewId: viewId,
        resourceIri: resourceIri,
      };
      return {items: newItems};
    })
  }

  private onStatusChange(itemId: string, isDirty: boolean) {
    this.setState((prevState): State => {
      const newItems = {...prevState.items};
      const item = newItems[itemId];
      newItems[itemId] = {
        ...item,
        isDirty: isDirty,
      };
      return {items: newItems};
    })
  }

  private onResourceChange(itemId: string, resourceIri: string) {
    this.setState((prevState): State => {
      const newItems = {...prevState.items};
      const item = newItems[itemId];
      newItems[itemId] = {
        ...item,
        resourceIri: resourceIri,
      };
      return {items: newItems};
    })
  }

  private renderView(item: Item) {
    const {views} = this.props;
    return <div key={item.id} className={styles.viewContainer}>
      <DashboardItem id={item.id}
        views={views}
        onSelect={({viewId, resourceIri}) =>
          this.onSelectView({itemId: item.id, viewId: viewId, resourceIri: resourceIri})
        }
        onStatusChange={isDirty =>
          this.onStatusChange(item.id, isDirty)
        }
        onResourceChange={resourceIri =>
          this.onResourceChange(item.id, resourceIri)
        }
        onFocus={() => this.setState({focus: item.id})} />
    </div>;
  }

  render() {
    const {items} = this.state;
    const layout: WorkspaceLayoutNode = {
      type: WorkspaceLayoutType.Row,
      children: [{
        type: WorkspaceLayoutType.Column,
        children: [{
          id: 'items',
          type: WorkspaceLayoutType.Component,
          content: <div className={styles.itemsContainer}>
            {this.renderItems()}
          </div> as React.ReactElement<any>,
          heading: <div>
            Thinking Frames&nbsp;
            <button className={`btn btn-link btn-xs pull-right ${styles.addItemButton}`}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                this.onAddNewItem();
              }}>
              <i className='fa fa-plus'/> Add frame
            </button>
          </div>,
        }, {
          id: 'thought-board',
          type: WorkspaceLayoutType.Component,
          content: React.Children.only(this.props.children) as React.ReactElement<any>,
          heading: 'Thought Board',
        }],
        defaultSize: 300,
      }, {
        type: WorkspaceLayoutType.Column,
        children: Object.keys(items).map(id => {
          const item = items[id];
          return {
            id: item.id,
            type: WorkspaceLayoutType.Component,
            content: this.renderView(item) as React.ReactElement<any>,
            heading: this.renderLabel(item),
            minSize: this.props.frameMinSize,
          };
        }),
        undocked: true,
      }],
    };
    return <WorkspaceLayout layout={layout} _onResize={() => {
      window.dispatchEvent(new Event('resize'))
    }} />
  }
}

export default DashboardComponent;
