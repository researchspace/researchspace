/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from 'react';
import { uniqueId, isEmpty } from 'lodash';
import { WorkspaceLayout, WorkspaceLayoutNode, WorkspaceLayoutType } from 'ontodia';

import { setFrameNavigation } from 'platform/api/navigation';
import { Component } from 'platform/api/components';
import { TemplateItem } from 'platform/components/ui/template';
import { getOverlaySystem } from 'platform/components/ui/overlay';
import { ConfirmationDialog } from 'platform/components/ui/confirmation-dialog';

import { DashboardItem, DashboardViewConfig } from './DashboardItem';

import * as styles from './Dashboard.scss';
import { Cancellation } from 'platform/api/async';
import { listen, trigger } from 'platform/api/events';
import { AddFrameEvent, AddFrameEventData } from './DashboardEvents';
import { Rdf } from 'platform/api/rdf';

const DEFAULT_ITEM_LABEL_TEMPLATE = `<mp-label iri='{{iri}}'></mp-label>`;

export interface Item {
  readonly id: string;
  readonly index: number;
  readonly viewId?: string;
  readonly resourceIri?: string;
  readonly isDirty?: boolean;
  readonly isExpanded?: boolean;
  readonly linkedBy?: string;
  readonly data?: { [key: string]: any };
}

let itemCount = 0;
export function emptyItem() {
  itemCount = itemCount + 1;
  return { id: uniqueId('frame'), index: itemCount };
}

export interface DashboardLinkedViewConfig {
  /**
   * Unique identifier of the view.
   */
  id: string;
  /**
   * Label of the view.
   */
  label: string;
  /**
   * Linked views IDs.
   */
  viewIds: ReadonlyArray<string>;
  /**
   * Description of the view.
   */
  description?: string;
  /**
   * Image that will be displayed in the Dashboard Item as the representation for the specific View.
   */
  image?: string;
  /**
   * Class of the icon that will be used as the representation of the specific View in the Dashboard Item. It will be applied if the <code>image</code> attribute isn't specified.
   */
  iconClass?: string;
  /**
   * SPARQL Ask query that is used to check whether it is possible to display a specific resource type in the specific view. Resource IRI is injected into the query using the <code>?value</code> binding variable.
   */
  checkQuery?: string;
}

export interface Props {
  /**
   * Used when dashboard is used as a target for events.
   */
  id: string;

  /**
   * Defines possible visualizations of resources
   */
  views: ReadonlyArray<DashboardViewConfig>;
  /**
   * Defines possible linked views
   */
  linkedViews?: ReadonlyArray<DashboardLinkedViewConfig>;
  /**
   * Minimum size of a frame
   *
   * @default 150
   */
  frameMinSize?: number;

  /**
   * Initial state for dashboard component.
   */
  initialView?: {
    /**
     *  View key, see views parameter
     */
    view: string;

    /**
     * Resource IRI for which the view should be applied.
     */
    resource: string;
  };
}

export interface State {
  items?: ReadonlyArray<Item>;
  focus?: string;
}

export class DashboardComponent extends Component<Props, State> {
  static defaultProps: Partial<Props> = {
    frameMinSize: 150,
    linkedViews: [],
  };

  private readonly cancellation = new Cancellation();

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      items: [],
    };
  }

  componentDidMount() {
    this.cancellation
      .map(
        listen({
          eventType: AddFrameEvent,
          target: this.props.id,
        })
      )
      .observe({
        value: ({ data }) => {
          this.onAddNewItem({
            ...emptyItem(),
            ...(data as AddFrameEventData),
          });
        },
      });

    if (this.props.initialView) {
      const item = {
        ...emptyItem(),
        resourceIri: this.props.initialView.resource,
        viewId: this.props.initialView.view,
      };
      this.onAddNewItem(item);
    } else {
      this.onAddNewItem();
    }

    // That is ugly hack for in frame navigation until we find a better way to do this
    setFrameNavigation(true, (iri: Rdf.Iri, props?: {}): boolean => {
      if (iri.value.startsWith('http://www.researchspace.org/instances/narratives')) {
        trigger({
          eventType: 'Dashboard.AddFrame',
          source: 'link',
          targets: ['thinking-frames'],
          data: {
            resourceIri: iri.value,
            viewId: 'semantic-narrative'
          }
        });
        return true;
      } else if (iri.value === 'http://www.researchspace.org/resource/ThinkingFrames' && props && props['view']) {
        trigger({
          eventType: 'Dashboard.AddFrame',
          source: 'link',
          targets: ['thinking-frames'],
          data: {
            resourceIri: props['resource'],
            viewId: props['view']
          }
        });
        return true;
      } else if (iri.value === 'http://www.researchspace.org/resource/ThinkingFrames') {
        trigger({
          eventType: 'Dashboard.AddFrame',
          source: 'link',
          targets: ['thinking-frames'],
        });
        return true;
      } else if (!iri.value.startsWith('http://www.researchspace.org/resource/')) {
        trigger({
          eventType: 'Dashboard.AddFrame',
          source: 'link',
          targets: ['thinking-frames'],
          data: {
            resourceIri: iri.value,
            viewId: 'resource'
          }
        });
        return true;
      } else {
        return false;
      }
    });
  }

  componentWillUnmount() {
    setFrameNavigation(false);
    this.cancellation.cancelAll();
  }

  private onAddNewItem = (item: Item = emptyItem()) => {
    const viewConfig = this.props.views.find(({id}) => id === item.viewId);
    if (viewConfig?.unique && this.state.items.find(i => i.viewId === item.viewId)) {
      return;
    } else {
      this.setState(
        (prevState): State => {
          const newItems = [...prevState.items];
          newItems.push(item);
          return { items: newItems };
        },
        () => {
          this.onSelectView({
            itemId: item.id,
            viewId: item.viewId,
            resourceIri: item.resourceIri,
          });
        }
      );
    }
  };

  onExpandItem(itemId: string) {
    this.setState(
      (prevState): State => {
        const newItems = prevState.items.map((item) => {
          if (item.id === itemId) {
            return { ...item, isExpanded: !item.isExpanded };
          }
          return item;
        });
        return { items: newItems };
      }
    );
  }

  private renderLabel(item: Item) {
    const { focus } = this.state;
    const isFocused = focus === item.id;
    const focusedClassName = isFocused ? styles.itemLabelActive : '';

    const view = item.viewId ? this.props.views.find(({ id }) => id === item.viewId) : undefined;
    if (view && item.resourceIri) {
      let icon = <span>[{view.label}]&nbsp;</span>;
      if (view.iconClass) {
        icon = <i className={view.iconClass} />;
      } else if (view.image) {
        icon = <img src={view.image} className={styles.itemImage} alt={view.label} />;
      }
      return (
        <span className={`${styles.itemLabel} ${focusedClassName}`}>
          <span className={styles.itemIcon}>{icon}</span>
           <span>
            <TemplateItem
              key={item.id}
              template={{
                source: view.itemLabelTemplate || DEFAULT_ITEM_LABEL_TEMPLATE,
                options: { iri: item.resourceIri, dashboardId: item.id },
              }}
            />
          </span>
          <button
            className={`btn btn-xs pull-right ${styles.deleteItemButton}`}
            onClick={() => this.onRemoveItem(item)}
          >
            <i className="fa fa-times" />
          </button>
        </span>
      );
    }

    return (
      <span className={`${styles.itemLabel} ${focusedClassName}`}>
        Frame {item.index}
        <button
          className={`btn btn-xs pull-right ${styles.deleteItemButton}`}
          onClick={() => this.onRemoveItem(item)}
        >
          <i className="fa fa-times" />
        </button>
      </span>
    );
  }

  private renderBody(item: Item) {
    const view = item.viewId ? this.props.views.find(({ id }) => id === item.viewId) : undefined;
    if (!view || !view.itemBodyTemplate) {
      return null;
    }
    return (
      <TemplateItem
        key={item.id}
        template={{
          source: view.itemBodyTemplate,
          options: { iri: item.resourceIri, dashboardId: item.id },
        }}
      />
    );
  }

  private removeItem(itemId: string) {
    this.setState(
      (prevState): State => {
        let newItems = [...prevState.items];
        const index = newItems.findIndex((item) => item.id === itemId);
        newItems.splice(index, 1);

        // make sure that we always have at least one frame
        if (isEmpty(newItems)) {
          newItems = [emptyItem()];
        }
        return { items: newItems };
      }
    );
  }

  private onRemoveItem(item: Item) {
    const removeItem = () => {
      if (item.linkedBy) {
        this.state.items.forEach(({ id, linkedBy }) => {
          if (linkedBy === item.linkedBy) {
            this.removeItem(id);
          }
        });
      } else {
        this.removeItem(item.id);
      }
    };
    if (item.isDirty) {
      const dialogRef = 'removing-confirmation';
      const onHide = () => getOverlaySystem().hide(dialogRef);
      getOverlaySystem().show(
        dialogRef,
        <ConfirmationDialog
          message={'Frame has unsaved changes. Are you sure you want to delete it?'}
          onHide={onHide}
          onConfirm={(confirm) => {
            onHide();
            if (confirm) {
              removeItem();
            }
          }}
        />
      );
    } else {
      removeItem();
    }
  }

  private renderItems() {
    const { items } = this.state;
    if (!items.length) {
      return <div className="text-center">No frames</div>;
    }
    return (
      <div className={`list-group ${styles.itemsList}`}>
        {items.map((item) => {
          const body = this.renderBody(item);
          return (
            <div key={item.id} className="list-group-item" onClick={() => this.setState({ focus: item.id })}>
              <div className={styles.itemLabelContainer}>
                {body ? (
                  <button
                    className={`btn btn-xs ${styles.expandItemButton}`}
                    onClick={() => this.onExpandItem(item.id)}
                  >
                    <i className={`fa ${item.isExpanded ? 'fa fa-caret-down' : 'fa-caret-right'}`} />
                  </button>
                ) : null}
                {this.renderLabel(item)}
              </div>
              {body && item.isExpanded ? body : null}
            </div>
          );
        })}
      </div>
    );
  }

  private onSelectView({ itemId, viewId, resourceIri }: { itemId: string; viewId: string; resourceIri: string }) {
    const { linkedViews } = this.props;
    this.setState(
      (prevState): State => {
        const newItems = [...prevState.items];
        newItems.forEach((item, index) => {
          if (item.id !== itemId) {
            return;
          }
          const linkedView = linkedViews.find((view) => view.id === viewId);
          if (linkedView) {
            const index = newItems.findIndex(({ id }) => id === itemId);
            const items = linkedView.viewIds.map((id) => ({
              ...emptyItem(),
              viewId: id,
              resourceIri: resourceIri,
              linkedBy: itemId,
            }));
            newItems.splice(index, 1, ...items);
          } else {
            newItems[index] = { ...item, viewId, resourceIri };
          }
        });
        return { items: newItems };
      }
    );
  }

  private onStatusChange(itemId: string, isDirty: boolean) {
    this.setState(
      (prevState): State => {
        const newItems = prevState.items.map((item) => {
          if (item.id === itemId) {
            return { ...item, isDirty };
          }
          return item;
        });
        return { items: newItems };
      }
    );
  }

  private onResourceChange(itemId: string, resourceIri: string, data?: { [key: string]: string }) {
    this.setState(
      (prevState): State => {
        const newItems = prevState.items.map((item) => {
          if (item.id === itemId) {
            return { ...item, resourceIri, data };
          }
          return item;
        });
        return { items: newItems };
      }
    );
  }

  private renderView(item: Item) {
    const { views, linkedViews } = this.props;
    const allViews: Array<DashboardViewConfig> = [...views];
    linkedViews.forEach((linkedView) => {
      allViews.push({
        id: linkedView.id,
        label: linkedView.label,
        template: '',
        image: linkedView.image,
        iconClass: linkedView.iconClass,
        description: linkedView.description,
        checkQuery: linkedView.checkQuery,
      });
    });
    const linkedFrames: Array<{ frameId: string; frameVariable: string }> = [];
    if (item.linkedBy) {
      this.state.items.forEach(({ id: frameId, viewId, linkedBy }) => {
        if (linkedBy === item.linkedBy) {
          const view = views.find(({ id }) => id === viewId);
          if (view) {
            linkedFrames.push({ frameId, frameVariable: view.frameVariable });
          }
        }
      });
    }
    return (
      <div key={item.id} className={styles.viewContainer}>
        <DashboardItem
          id={item.id}
          views={allViews}
          viewId={item.viewId}
          gridView
          resourceIri={item.resourceIri}
          data={item.data}
          linkedFrames={linkedFrames}
          onSelect={({ viewId, resourceIri }) =>
            this.onSelectView({ itemId: item.id, viewId: viewId, resourceIri: resourceIri })
          }
          onStatusChange={(isDirty) => this.onStatusChange(item.id, isDirty)}
          onResourceChange={(resourceIri, data) => this.onResourceChange(item.id, resourceIri, data)}
          onFocus={() => this.setState({ focus: item.id })}
        />
      </div>
    );
  }

  render() {
    const { items } = this.state;
    const children = React.Children.toArray(this.props.children);

    const frames = items.map((item) => ({
      id: item.id,
      type: WorkspaceLayoutType.Component,
      className: 'thinking-frames__frames',
      content: this.renderView(item) as React.ReactElement<any>,
      heading: this.renderLabel(item),
      minSize: this.props.frameMinSize,
    })) as any;
    if (children.length > 1) {
      frames.unshift({
        id: 'heading',
        type: WorkspaceLayoutType.Component,
        className: 'thinking-frames__frames',
        content: React.Children.only(children[1]) as any,
        heading: null,
        minSize: 60,
        defaultSize: 60,
      } as any);
    }

    const layout: WorkspaceLayoutNode = {
      type: WorkspaceLayoutType.Row,
      children: [
        {
          type: WorkspaceLayoutType.Column,
          children: [
            {
              id: 'thought-board',
              type: WorkspaceLayoutType.Component,
              className: 'thinking-frames__clipboard-sidebar',
              content: React.Children.only(children[0]) as any,
              heading: 'Clipboard',
            },
            {
              id: 'items',
              type: WorkspaceLayoutType.Component,
              defaultCollapsed: true,
              className: 'thinking-frames__frames-sidebar',
              content: (<div className={styles.itemsContainer}>{this.renderItems()}</div>) as React.ReactElement<any>,
              heading: (
                <div>
                  Thinking Frames&nbsp;
                  <button
                    className={`btn btn-link btn-xs pull-right ${styles.addItemButton}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      this.onAddNewItem();
                    }}
                  >
                    <i className="fa fa-plus" /> Add frame
                  </button>
                </div>
              ),
            },
          ],
          defaultSize: 300,
        },
        {
          type: WorkspaceLayoutType.Column,
          children: frames,
          undocked: true,
        },
      ],
    };
    return <WorkspaceLayout layout={layout} _onResize={() => window.dispatchEvent(new Event('resize'))} />;
  }
}

export default DashboardComponent;
