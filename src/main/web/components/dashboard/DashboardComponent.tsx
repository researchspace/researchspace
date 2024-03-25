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
import FlexLayout, { Model, Node, Action, Actions,
                     TabNode, Layout, TabSetNode,
                     DockLocation } from 'flexlayout-react';

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
import * as LabelsService from 'platform/api/services/resource-label';
import * as Kefir from 'kefir';
import Icon from '../ui/icon/Icon';

export interface Item {
  readonly id: string;
  readonly index: number;
  readonly viewId?: string;
  readonly resourceIri?: string;
  readonly isDirty?: boolean;
  readonly isExpanded?: boolean;
  readonly linkedBy?: string;
  readonly data?: { [key: string]: any };
  readonly label?: string;
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
   * 
   * Name of the material-design icon that will be used as the representation of the specific View in the Dashboard Item. It will be applied if the <code>image</code> attribute isn't specified.
   */
  iconName?: string;
  /**
   * 
   * Class of the icon that will be used as the representation of the specific View in the Dashboard Item. It will be applied if the <code>image</code> attribute and <code>iconName</code> attribute aren't specified.
   */
  iconClass?: string;
  /**
   * SPARQL Ask query that is used to check whether it is possible to display a specific resource type in the specific view. Resource IRI is injected into the query using the <code>?value</code> binding variable.
   */
  checkQuery?: string;

  /**
   * Allows initiating a component/template without a resource.
   */
  resourceNotRequired?: boolean;
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

    /**
     * Additional data that will be propagate to the template.
     */
    data: {};
  };

  leftPanels?: {template: string, label: string, class?: string}[];
  rightPanels?: {template: string, label: string, class?: string}[];

  homePageIri?: string;
}

export interface State {
  layout?: Model;
  items?: ReadonlyArray<Item>;
  focus?: string;
}

export class DashboardComponent extends Component<Props, State> {
  static defaultProps: Partial<Props> = {
    frameMinSize: 150,
    linkedViews: [],
  };

  private readonly cancellation = new Cancellation();
  private layoutRef = React.createRef<Layout>();
  private subscription: Kefir.Subscription;
  private itemLabelCount = 0;

  private frameLabel = (label?: string) => {
    this.itemLabelCount = this.itemLabelCount + 1;
    const displayLabel = label ?? 'New Tab'
    return { 
      // id: uniqueId(displayLabel.replace(/\s/g, '')),
      id: uniqueId('frame'),
      index: this.itemLabelCount, 
      label: displayLabel
    }
  }

  private onAddNewItemHandler = (data: AddFrameEventData, label?: string) => {
    
    this.onAddNewItem({
      ...this.frameLabel(label),
      ...(data as AddFrameEventData),
      data,
    });
  }


  private defaultLayoutProps = {
    "borderBarSize": 36,
    "tabSetTabStripHeight": 36,
    "splitterSize": 6 ,
  };

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      items: [],
      layout: FlexLayout.Model.fromJson({
        global: this.defaultLayoutProps,
        borders: [
          {
		        "type": "border",
             "location": "left",
			      "children": []
          },
		      {
		        "type": "border",
		 	      "location": "right",
			      "children": []
		      },

          {
            "type": "border",
            "location":"bottom",
            "children": []
          }
        ],
	      layout:{
		      "type": "row",
		      "weight": 100,
		      "children": [
			      {
				      "type": "tabset",
              "id": "main",
				      "weight": 100,
				      "selected": 0,
				      "children": [
					      /* {
						       "type": "tab",
						       "name": "Frame",
						       "component": "item",
                 *   "config": frameLabel()
 				           } */
				      ]
			      }
          ]
        }
      }),
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
            const {viewId, resourceIri, resourceEditorLabel} = data as AddFrameEventData

            if(resourceIri) {
              this.subscription = LabelsService.getLabel(Rdf.iri(resourceIri)).observe({
                value: (label) => {
                  this.onAddNewItemHandler(data, label)
                },
                error: (error) => {
                  console.log('LABEL NOT FOUND ',error)
                  this.onAddNewItemHandler(data)
                },
              })
            } else if (resourceEditorLabel) { 
              this.onAddNewItemHandler(data, resourceEditorLabel)
            } else {
              const view = viewId ? this.props.views.find(({ id }) => id === viewId) : undefined;
              this.onAddNewItemHandler(data, view?.label)
            }
          },
        });

    if (this.props.initialView) {
      const item = {
        ...this.frameLabel(),
        resourceIri: this.props.initialView.resource,
        viewId: this.props.initialView.view,
        data: this.props.initialView.data,
      };
      this.onAddNewItem(item);
    } else {
      this.onAddNewItem();
    }


    if (this.props.leftPanels) {
      this.props.leftPanels.forEach((panelConfig, i) =>
        this.layoutRef.current.addTabToTabSet(
          this.state.layout
              .getBorderSet()
              .getBorders()
              .find(b => b.getLocation() === DockLocation.LEFT)
              .getId(),
          {'type': 'tab', 'name': panelConfig.label, 'component': "leftItem", 'config': { 'panelIndex': i }, 'enableClose': false, 'className': panelConfig.class }
        )
      );
    }

    if (this.props.rightPanels) {
      this.props.rightPanels.forEach((panelConfig, i) =>
        this.layoutRef.current.addTabToTabSet(
          this.state.layout
              .getBorderSet()
              .getBorders()
              .find(b => b.getLocation() === DockLocation.RIGHT)
              .getId(),
          {'type': 'tab', 'name': panelConfig.label, 'component': "rightItem", 'config': { 'panelIndex': i }, 'enableClose': false, 'className': panelConfig.class }
        )
      );
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
            viewId: 'semantic-narrative',
            ...props
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
            viewId: props['view'],
            ...props
          }
        });
        return true;
      } else if (iri.value === 'http://www.researchspace.org/resource/ThinkingFrames') {
        trigger({
          eventType: 'Dashboard.AddFrame',
          source: 'link',
          targets: ['thinking-frames'],
          data: {
            ...props
          }
        });
        return true;
      } else if (!iri.value.startsWith('http://www.researchspace.org/resource/')) {
        trigger({
          eventType: 'Dashboard.AddFrame',
          source: 'link',
          targets: ['thinking-frames'],
          data: {
            resourceIri: iri.value,
            viewId: 'resource',
            ...props
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
    this.subscription.unsubscribe();
  }

  private onAddNewItem = (item: Item = this.frameLabel()) => {
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
          this.layoutRef.current.addTabToActiveTabSet(
            {
              'type': 'tab', 'name': item.label, 'component': "item", 'config': {'itemId': item.id},
             'className': viewConfig?.iconName || viewConfig?.iconClass || 'no-icon-button', 'icon': 'add'
            }
          );
          this.onSelectView({
            itemId: item.id,
            viewId: item.viewId,
            resourceIri: item.resourceIri,
          });
        }
      );
    }
  };

  // private renderLabel(item: Item) {
  //   const { focus } = this.state;
  //   const isFocused = focus === item.id;
  //   const focusedClassName = isFocused ? styles.itemLabelActive : '';
  //   const view = item.viewId ? this.props.views.find(({ id }) => id === item.viewId) : undefined;
  //   if (view && item.resourceIri) {
  //     let icon = <span>[{view.label}]&nbsp;</span>;
  //     if (view.iconClass) {
  //       icon =  <Icon iconType='round' iconName={view.iconClass} />;
  //     } else if (view.image) {
  //       icon = <img src={view.image} className={styles.itemImage} alt={view.label} />;
  //     }
  //     return (
  //       <span className={`${styles.itemLabel} ${focusedClassName}`}>
  //         <span className={styles.itemIcon}>{icon}</span>
  //          <span>
  //           <TemplateItem
  //             key={item.id}
  //             template={{
  //               source: view.itemLabelTemplate || DEFAULT_ITEM_LABEL_TEMPLATE,
  //               options: { iri: item.resourceIri, dashboardId: item.id },
  //             }}
  //           />
  //         </span>
  //         <button
  //           className={`btn btn-xs pull-right ${styles.deleteItemButton}`}
  //           onClick={() => this.onRemoveItem(item)}
  //         >
  //           <Icon iconType='round' iconName='close'/>
  //         </button>
  //       </span>
  //     );
  //   }

  //   return (
  //     <span className={`${styles.itemLabel} ${focusedClassName}`}>
  //       Frame {item.index}
  //       <button
  //         className={`btn btn-xs pull-right ${styles.deleteItemButton}`}
  //         onClick={() => this.onRemoveItem(item)}
  //       >
  //         <Icon iconType='round' iconName='close'/>
  //       </button>
  //     </span>
  //   );
  // }

  private removeItem(itemId: string) {
    this.setState(
      (prevState): State => {
        let newItems = [...prevState.items];
        const index = newItems.findIndex((item) => item.id === itemId);
        newItems.splice(index, 1);

        // make sure that we always have at least one frame
        if (isEmpty(newItems)) {
          newItems = [this.frameLabel()];
        }
        return { items: newItems };
      }
    );
  }

  private onRemoveItem(action: Action, itemId: string) {
    const item = this.state.items.find(item => item.id == itemId);
    const removeItem = () => {
      // go through all items and remove all items "nested" in the current one
      this.state.items.forEach(({ id, linkedBy }) => {
        if (linkedBy === itemId) {
          this.removeItem(id);
        }
      });
      this.removeItem(item.id);
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

              // if user confirms tab close we want to re-send initial close event to FlexLayout
              this.state.layout.doAction(action);
            }
          }}
        />
      );

      // we return undefined to signal to FlexLayout that we want to interrupt tab close action
      return undefined;
    } else {
      removeItem();

      // if close action doesn't requires confirmation then we just propagate initial action
      return action;
    }
  }


  private onSelectView({ itemId, viewId, resourceIri }: { itemId: string; viewId: string; resourceIri: string }) {
    const { linkedViews, views } = this.props;
    this.setState(
      (prevState): State => {
        const newItems = [...prevState.items];
        newItems.forEach((item, index) => {
          if (item.id !== itemId) {
            return;
          }

          const linkedView = linkedViews.find((view) => view.id === viewId);
          if (linkedView) {
            // map through all linked view, create items. then create new tabset and add them
            const items = linkedView.viewIds.map((id) => ({
              ...this.frameLabel(),
              viewId: id,
              resourceIri: resourceIri,
              linkedBy: itemId,
            }));

            const newTabs = items.map(newItem => {
              const viewConfig = this.props.views.find(({id}) => id === newItem.viewId);
              return {
				        "type": "tabset",
                "enableDrop": false,
                "config": {
                  "type": "nested"
                },
				        "children": [
                  {
                    'type': 'tab',
                    'name': newItem.label,
                    'enableClose': false,
                    'enableDrag': false,
                    'component': "item", 'config': { 'itemId': newItem.id }, 'className': viewConfig?.iconName || viewConfig?.iconClass || 'no-icon-button', 'icon': 'add'}

                ]
              };
            });


            let linkedNodeTabId: string;
            prevState.layout.visitNodes(node => {
              if (node.getType() === TabNode.TYPE && (node as TabNode).getConfig().itemId === itemId) {
                linkedNodeTabId = node.getId();
              }
            });
            prevState.layout.doAction(
              FlexLayout.Actions.updateNodeAttributes(linkedNodeTabId, {
                component: 'nested',
                config: {
                  'itemId': itemId,
                  'model': {
								    'global': {
                      ...this.defaultLayoutProps,
									    'tabSetTabLocation': 'bottom',
								    },
								    'borders': [],
								    'layout': {
                      'type': 'row',
                      'children': newTabs
                    }
                  }
                }
              })
            );

            newItems.push(...items);
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
    const { views, linkedViews, homePageIri } = this.props;
    const allViews: Array<DashboardViewConfig> = [...views];
    linkedViews.forEach((linkedView) => {
      allViews.push({
        id: linkedView.id,
        label: linkedView.label,
        template: '',
        image: linkedView.image,
        iconName: linkedView.iconName,
        iconClass: linkedView.iconClass,
        description: linkedView.description,
        checkQuery: linkedView.checkQuery,
        resourceNotRequired: linkedView.resourceNotRequired
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
          homePageIri={homePageIri}
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

  private tabIcons = () =>
    ({
      'close': <Icon iconType='round' iconName='close'/>,
      'maximize': <Icon iconType='round' iconName='fullscreen'/>,
      'restore': <Icon iconType='round' iconName='close_fullscreen'/>,
      'more': <Icon iconType='round' iconName='arrow_drop_down'/>,
    });

  private factory = (node: TabNode) => {
    const component = node.getComponent();
    if (component === 'leftItem') {
      return <TemplateItem template={{source: this.props.leftPanels[node.getConfig().panelIndex].template}} />;
    } else if (component === 'rightItem') {
      return <TemplateItem template={{source: this.props.rightPanels[node.getConfig().panelIndex].template}} />;
    } else if (component === 'nested') {
      let model = node.getExtraData().model;
      if (model == null) {
        node.getExtraData().model = Model.fromJson(node.getConfig().model);
        model = node.getExtraData().model;
      }
      return <FlexLayout.Layout model={model} factory={this.factory} icons={this.tabIcons()} />;
    } else {
      const item = this.state.items.find(item => item.id === node.getConfig().itemId);
      if (item) {
        return this.renderView(this.state.items.find(item => item.id === node.getConfig().itemId));
      } else {
        return null;
      }
    }
  }

  // private titleFactory = (node: TabNode) => {
  //   console.log(this.state.items)
  //   console.log(node.getConfig())
  //   const item = this.state.items.find(item => item.id === node.getConfig());
  //   if (item) {
  //     return this.renderLabel(item);
  //   } else {
  //     return "Frame " + node.getConfig();
  //   }
  // }

  private onRenderTabSet = (node: TabSetNode, renderValues: {stickyButtons: React.ReactNode[]}) => {
    // we don't want to render new tab button for nested tabsets
    // because currently they are used only in linked views,
    // where we don't allow new netsted tabs
    if(node.getConfig()?.type !== 'nested') {
      renderValues.stickyButtons.push(
        <button className='flexlayout__tab_toolbar_sticky_button'
          onMouseDown={event=> event.stopPropagation()}
          onClick={(event) => {
            this.onAddNewItem();
          }}>
          <Icon iconType='round' iconName='add'/>
        </button>
      );
    }
  }

  private onLayoutAction = (action: Action) => {
    if (action.type === Actions.DELETE_TAB) {
      const tab = this.state.layout.getNodeById(action.data.node) as TabNode;
      return this.onRemoveItem(action, tab.getConfig().itemId);
    } else {
      return action;
    }
  }

  render() {
    return (
      <FlexLayout.Layout
        ref={this.layoutRef}
        model={this.state.layout}
        factory={this.factory}
        onRenderTabSet={this.onRenderTabSet}
        onAction={this.onLayoutAction}
        icons={this.tabIcons()}
      />
    );
  }
}

export default DashboardComponent;
