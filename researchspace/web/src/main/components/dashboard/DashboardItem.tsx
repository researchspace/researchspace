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

import { Row, Col} from 'react-bootstrap';

import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { TemplateItem } from 'platform/components/ui/template';
import { DropArea } from 'platform/components/dnd/DropArea';
import { Cancellation } from 'platform/api/async';
import { listen } from 'platform/api/events';

import * as styles from './Dashboard.scss';
import * as DashboardEvents from './DashboardEvents';

const DEFAULT_VARIABLE = 'dashboardId';

export interface DashboardViewConfig {
  /**
   * Unique identifier of the view.
   */
  id: string;
  /**
   * <semantic-link uri='http://help.metaphacts.com/resource/FrontendTemplating'>Template</semantic-link> which is used to render the view when users drop a resource on it. Expects <code>{{iri}}</code> and <code>{{dashboardId}}</code> (or a variable specified in <code>frameVariable</code>) as context variables.
   * **The template MUST have a single HTML root element.**
   */
  template: string;
  /**
   * Label of the view.
   */
  label: string;
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
  /**
   * Allows initiating a component/template without a resource. For instance, <code><ontodia></ontodia></code> component can be initiated in the Dashboard without a specific resource. When <code>resourceNotRequired</code> is set to <code>true</code> the version of the dialogue is rendered to suggests "Create new" option for the user, which means that the user can start this particular View from scratch and populate it with resources later.
   */
  resourceNotRequired?: boolean;
  /**
   * Defined the variable name that will be passed to the template to propagate the frame ID.
   * @default 'dashboardId'
   */
  frameVariable?: string;
  /**
   * <semantic-link uri='http://help.metaphacts.com/resource/FrontendTemplating'>Template</semantic-link> for the label of a frame, it is used in the frame controller. By default the <code><mp-label></mp-label></code> component is used. Expects <code>{{iri}}</code> and <code>{{dashboardId}}</code> (or a variable specified in <code>frameVariable</code>) as context variables.
   * **The template MUST have a single HTML root element.**
   */
  itemLabelTemplate?: string;
  /**
   * <semantic-link uri='http://help.metaphacts.com/resource/FrontendTemplating'>Template</semantic-link> for the body of a frame item. If it is specified, it will applied to the contents of the frame item displayed as dropdown of the frame controller. Expects <code>{{iri}}</code> and <code>{{dashboardId}}</code> (or a variable specified in <code>frameVariable</code>) as context variables.
   * **The template MUST have a single HTML root element.**
   */
  itemBodyTemplate?: string;
}

export interface DashboardItemProps {
  /**
   * Used as source id for emitted events.
   */
  id: string;

  /**
   * Config specifies data to define views for dashboard.
   */
  views: ReadonlyArray<DashboardViewConfig>;
  /**
   * Selected resource visualization
   */
  viewId?: string;
  /**
   * Selected resource
   */
  resourceIri?: string;
  /**
   * Additional info that will be propagated to the template
   */
  data?: { [key: string]: any };
  /**
   * Linked Views
   */
  linkedFrames?: ReadonlyArray<{ frameId: string; frameVariable: string }>;
  /**
   * Callback which using for transfer id of a special view and iri of a resource.
   */
  onSelect?(data: { viewId: string; resourceIri?: string }): void;

  /**
   * Callback which using for indicate users that an active dashboard's component was changed.
   */
  onStatusChange?(hasChanges: boolean): void;

  /**
   * Callback which using for indicate users that a used resource was changed.
   */
  onResourceChange?(resourceIri: string, data?: { [key: string]: string }): void;

  /**
   * Callback which using for indicate users that a current dashboard isFocused.
   */
  onFocus?(isFocus: boolean): void;
}

export interface State {
  selectedView?: string;
}

/**
 *
 * @example
 * <rs-dashboard-item id='test-1'
 *   views='[
 *     {"id": "ontodia", "label": "Ontodia", "template": "{{> ontodia-template}}", "description": "Example", "image": "https://example/img.jpg"},
 *     {"id": "resource", "label": "Resource viewer", "template": "{{> resource-template}}", "iconClass": "fa fa-automobile",
 *      "checkQuery": "ASK {?value a example:Person}" }
 *   ]'>
 *   <template id='ontodia-template'>
 *     {{#if iri}}
 *     <div class="component">
 *       <ontodia id='ontodia' post-saving='none' iri='{{iri}}'></ontodia>
 *       <mp-event-proxy
 *         id='ontodia-update'
 *         on-event-type='Ontodia.DiagramIsDirty'
 *         on-event-source='ontodia'
 *         proxy-event-type='Dashboard.StatusChanged'
 *         proxy-targets='["{{dashboardId}}"]'
 *       ></mp-event-proxy>
 *     </div>
 *     {{/if}}
 *   </template>
 *   <template id='resource-template'>
 *     {{#if iri}}
 *     <semantic-query query='
 *       SELECT ?label ?image WHERE {
 *         BIND( IRI(CONCAT(STR("{{iri}}"))) as ?subject)
 *         ?subject rso:displayLabel ?label .
 *         ?subject crm:P138i_has_representation ?image .
 *       }' template='{{> resource}}'>
 *       <template id='resource'>
 *         <div class="component">
 *           {{#each bindings}}
 *           <div>{{label.value}}</div>
 *           <img src='{{image.value}}' width="100" height="100"/>
 *           {{/each}}
 *         </div>
 *       </template>
 *     </semantic-query>
 *     {{/if}}
 *   </template>
 * </rs-dashboard-item>
 */
export class DashboardItem extends Component<DashboardItemProps, State> {
  private cancellation = new Cancellation();

  constructor(props: DashboardItemProps, context: any) {
    super(props, context);
    this.state = {};
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  componentDidMount() {
    const {id, onStatusChange, onResourceChange} = this.props;
    this.cancellation.map(
      listen({
        eventType: DashboardEvents.StatusChanged,
        target: id,
      })
    ).observe({
      value: ({data}) => {
        if (onStatusChange) {
          onStatusChange(data.hasChanges);
        }
      }
    });
    this.cancellation.map(
      listen({
        eventType: DashboardEvents.ResourceChanged,
        target: id
      })
    ).observe({
      value: ({data}) => {
        if (onResourceChange) {
          onResourceChange(data.resourceIri, data.data);
        }
      }
    });
    this.onFocus();
  }

  private onFocus = () => {
    const {onFocus} = this.props;
    if (onFocus) {
      onFocus(true);
    }
  }

  onDrop = (resourceIri: Rdf.Iri, viewId: string) => {
    const {onSelect} = this.props;
    if (onSelect) {
      onSelect({viewId, resourceIri: resourceIri.value});
    }
    this.onFocus();
  }

  private renderDefaultDropArea = (
    view: DashboardViewConfig,
    image: React.ReactNode | undefined
  ) => {
    return <DropArea query={view.checkQuery}
      onDrop={(iri) => this.onDrop(iri, view.id)}
      childrenClassName={`${styles.dropAreaChildren} ${styles.notOpacity}`}
      dropMessageStyle={{display: 'none'}}
      dropStyles={{
        enabledHover: {backgroundColor: 'lightgrey'},
        enabled: {outline: '3px dashed blue'},
        disabled: {backgroundColor: '#ff000054'}
      }}>
      <div className={styles.defaultComponent}
        onClick={() => this.setState({selectedView: view.id})}>
        <div className={'media'}>
          <div className={'media-left media-middle'}>{image}</div>
          <div className={'media-body'} style={{height: '64px'}}>
            <strong className={'media-heading'}>{view.label}</strong>
            <div>{view.description}</div>
          </div>
        </div>
      </div>
    </DropArea>;
  }

  private renderDefaultDashboard = () => {
    const {views} = this.props;
    return (
      <div className={`${styles.defaultDashboard} container-fluid`}
        onClick={this.onFocus}>
        <Row>
          {views.map(view => {
            let image: React.ReactNode | undefined;
            if (view.image) {
              image = <img src={view.image}
                className={`media-object ${styles.image}`}
                alt={view.label} />;
            } else if (view.iconClass) {
              image = <span className={`${view.iconClass} ${styles.icon}`} />;
            }
            return <Col key={view.id} md={4} xs={4} lg={4} sm={4}>
              <div className={styles.defaultColumnItem}>
                {this.renderDefaultDropArea(view, image)}
              </div>
            </Col>;
          })}
        </Row>
      </div>
    );
  }

  private renderEmptySelectedComponent = () => {
    const {views, onSelect} = this.props;
    const view = views.find(v => v.id === this.state.selectedView);
    let image: React.ReactNode | undefined;
    if (view.image) {
      image = <img src={view.image} className={styles.imageComponent} alt={view.label} />;
    } else if (view.iconClass) {
      image = <span className={`${view.iconClass} ${styles.icon} ${styles.iconComponent}`} />;
    }
    return <div className={styles.emptyPageDropArea} onClick={this.onFocus}>
      <DropArea onDrop={(iri) => this.onDrop(iri, view.id)}
        query={view.checkQuery}
        childrenClassName={`${styles.dropAreaChildren} ${styles.notOpacity}`}
        style={{display: 'flex', flex: 1, width: '100%'}}
        dropMessageStyle={{display: 'none'}}
        dropStyles={{
          enabledHover: {backgroundColor: 'lightgrey'},
          enabled: {outline: '5px dashed blue'},
          disabled: {backgroundColor: '#ff000054'}
        }}>
        <div className={styles.emptyPageTitle}>
          {image}
          <div>
            <div className={styles.emptyPageLabel}>{view.label}</div>
            <div className={styles.emptyPageDescription}>{view.description}</div>
          </div>
        </div>
        <div className={styles.emptyPageDrop}>
          Drop resource here
          {view.resourceNotRequired ? (
            <div>
              or<br />
              <a href='' onClick={e => {
                e.preventDefault();
                if (onSelect) {
                  onSelect({viewId: view.id});
                }
              }}>Create New {view.label}</a>
            </div>
          ) : null}
        </div>
      </DropArea>
    </div>;
  }

  private renderComponent = () => {
    const {id, views, viewId, resourceIri, data, linkedFrames = []} = this.props;
    const view = views.find(v => v.id === viewId);
    const {template, frameVariable = DEFAULT_VARIABLE} = view;
    const options = {
      iri: resourceIri,
      [frameVariable]: id,
      data,
    };
    linkedFrames.forEach(linkedView =>
      options[linkedView.frameVariable] = linkedView.frameId
    );
    return <div className={styles.template}
      onClick={this.onFocus}
      onWheel={this.onFocus}
      onDrop={this.onFocus}>
      <TemplateItem template={{source: template, options}} />
    </div>;
  }

  render() {
    const {views, viewId} = this.props;
    const {selectedView} = this.state;
    if (views.length === 0) { return null; }
    if (viewId) {
      return this.renderComponent();
    }
    if (selectedView) {
      return this.renderEmptySelectedComponent();
    }
    return this.renderDefaultDashboard();
  }

}

export default DashboardItem;
