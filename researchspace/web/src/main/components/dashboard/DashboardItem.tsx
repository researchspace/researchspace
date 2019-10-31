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

export interface DashboardViewConfig {
  id: string;

  label: string;

  /**
   * Id of template, which will be using to show view. 
   */
  template: string;

  image?: string;

  /**
   * class of icon, if images don`t accessible.
   */
  iconClass?: string;

  description?: string;

  /**
   * Set special restriction fot using some specific types during the dropping.
   * Must use 'value' in query which will replace to iri of the current draggable resource
   */
  checkQuery?: string;
  /**
   * Allows initiating a component/template without the resource
   */
  resourceNotRequired?: boolean;
}

export interface DashboardItemProps {
  /**
   * Used as source id for emitted events.
   */
  id: string;

  /**
   * Config specifies data to define views for dashboard. 
   */
  views: DashboardViewConfig[];

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
  onResourceChange?(resourceIri: string): void;

  /**
   * Callback which using for indicate users that a current dashboard isFocused. 
   */
  onFocus?(isFocus: boolean): void;
}

export interface State {
  resourceIri?: string;
  viewId?: string;
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
    this.state = {}
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  componentDidMount() {
    const { onStatusChange, onResourceChange, onFocus} = this.props;
    this.cancellation.map(listen({eventType: DashboardEvents.StatusChanged, target: this.props.id})).observe({
      value: ({data}) => {
        onStatusChange ? onStatusChange(data.hasChanges): undefined;
      }
    });
    this.cancellation.map(listen({eventType: DashboardEvents.ResourceChanged, target: this.props.id})).observe({
      value: ({data}) => {
        onResourceChange ? onResourceChange(data.resourceIri) : undefined;
        this.setState({resourceIri: data.resourceIri});
      }
    });
    onFocus ? onFocus(true) : undefined;
  }

  componentDidUpdate(prevProps: DashboardItemProps, prevState: State) {
    const {onSelect} = this.props;
    const {resourceIri, viewId} = this.state;
    if (viewId !== prevState.viewId || resourceIri !== prevState.resourceIri && onSelect) {
      onSelect({viewId, resourceIri});
    }
  }

  onDrop = (resourceIri: Rdf.Iri, viewId: string) => {
    const {onFocus} = this.props;
    this.setState({resourceIri: resourceIri.value, viewId});
    onFocus ? onFocus(true) : undefined;
  }

  onDropAfterOpen = () => {
    const { onFocus } = this.props;
    onFocus ? onFocus(true) : undefined;
  }

  private renderDefaultDropArea = (
    view: DashboardViewConfig,
    index: number,
    image: JSX.Element,
    icon: JSX.Element
  ) => {
    return <DropArea key={`${view.id}_${index}`}
      query={view.checkQuery}
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
          <div className={'media-left media-middle'}>{image ? image : icon}</div>
          <div className={'media-body'} style={{height: '64px'}}>
            <strong className={'media-heading'}>{view.label}</strong>
            <div>{view.description}</div>
          </div>
        </div>
      </div>
    </DropArea>;
  }

  private renderDefaultDashboard = () => {
    const { views, onFocus } = this.props;
    return (
      <div className={`${styles.defaultDashboard} container-fluid`}
        onClick={() => onFocus ? onFocus(true) : undefined}>
        <Row>
          {views.map((view, index) => {
            const image = view.image ? <img src={view.image} className={`media-object ${styles.image}`} /> : undefined;
            const icon = view.iconClass ? <span className={`${view.iconClass} ${styles.icon}`}></span> : undefined;
            return <Col key={`${view.id}-${index}`} md={4} xs={4} lg={4} sm={4}>
              <div className={styles.defaultColumnItem}>
                {this.renderDefaultDropArea(view, index, image, icon)}
              </div>
            </Col>
          })}
        </Row>
      </div>
    );
  }

  private renderEmptySelectedComponent = () => {
    const { views, onFocus } = this.props;
    const view = views.find(view => view.id === this.state.selectedView);
    const image = view.image ? <img src={view.image} className={styles.imageComponent}/> : undefined;
    const icon = view.iconClass ? <span className={`${view.iconClass} ${styles.icon} ${styles.iconComponent}`}></span> : undefined;
    return <div className={styles.emptyPageDropArea} onClick={() => onFocus ? onFocus(true) : undefined}>
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
          {image ? image : icon}
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
                this.setState({viewId: view.id});
              }}>Create New {view.label}</a>
            </div>
          ) : null}
        </div>
      </DropArea>
    </div>;
  }

  private renderComponent = () => {
    const { id, views, onFocus } = this.props;
    const {resourceIri, viewId} = this.state;
    const view = views.find(view => view.id === viewId);
    return <div className={styles.template}
      onClick={() => onFocus ? onFocus(true) : undefined}
      onWheel={() => onFocus ? onFocus(true) : undefined}
      onDrop={this.onDropAfterOpen}>
      <TemplateItem template={{
        source: view.template,
        options: {iri: resourceIri, dashboardId: id}}
      } />
    </div>;
  }

  render() {
    const {viewId, selectedView} = this.state;
    if (this.props.views.length === 0) { return null; }
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
