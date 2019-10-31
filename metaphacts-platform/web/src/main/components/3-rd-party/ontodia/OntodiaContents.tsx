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
import { createElement, cloneElement, ReactNode } from 'react';
import * as maybe from 'data.maybe';
import { DiagramModel, AuthoringState, TemporaryState } from 'ontodia';

import { Component } from 'platform/api/components';
import { listen } from 'platform/api/events';
import { Cancellation } from 'platform/api/async/Cancellation';
import { Rdf } from 'platform/api/rdf';
import { isValidChild, universalChildren } from 'platform/components/utils';

import { TemplateItem } from 'platform/components/ui/template';
import { getOverlaySystem } from 'platform/components/ui/overlay';
import { SaveSetDialog, createNewSetFromItems } from 'platform/components/sets';

import * as OntodiaEvents from './OntodiaEvents';

import * as styles from './OntodiaContents.scss';

export interface Props {
  id: string;
  template?: string;
}

export interface State {
  elements?: Array<{ iri: string; persisted: boolean }>;
}

export class OntodiaContents extends Component<Props, State> {
  static defaultProps: Partial<Props> = {
    template: `<div><semantic-link iri='{{iri}}'></semantic-link></div>`,
  };

  private readonly cancellation = new Cancellation();

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      elements: [],
    };
  }

  componentDidMount() {
    this.listenToEvents();
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private listenToEvents = () => {
    this.cancellation.map(
      listen({
        eventType: OntodiaEvents.DiagramChanged,
        source: this.props.id,
      })
    ).observe({
      value: ({data}) => this.updateElements(data),
    });
  }

  private updateElements(
    {model, authoringState, temporaryState}: {
      model: DiagramModel;
      authoringState: AuthoringState;
      temporaryState: TemporaryState;
    }
  ) {
    const elements: Array<{ iri: string; persisted: boolean }> = [];
    const isPersisted = iri =>
      !authoringState.index.elements.has(iri) && !temporaryState.elements.has(iri);
    model.elements.forEach(element => {
      if (!element.temporary) {
        elements.push({
          iri: element.iri,
          persisted: isPersisted(element.iri),
        });
      }
    });
    this.setState({elements: elements});
  }

  private onCreateSet = () => {
    const dialogRef = 'create-set-dialog';
    const hideDialog = () => getOverlaySystem().hide(dialogRef);
    getOverlaySystem().show(
      dialogRef,
      createElement(SaveSetDialog, {
        onSave: name => {
          const items: Array<Rdf.Iri> = [];
          this.state.elements.forEach(({iri, persisted}) => {
            if (persisted) {
              items.push(
                Rdf.iri(iri)
              );
            }
          });
          return createNewSetFromItems(this.props.id, name, items).map(hideDialog)
        },
        onHide: hideDialog,
        maxSetSize: maybe.Nothing<number>(),
      })
    );
  }

  private mapChildren(children: ReactNode): ReactNode {
    return React.Children.map(children, child => {
      if (!isValidChild(child)) { return child; }
      if (child.type === 'button' && child.props.name === 'submit') {
        return cloneElement(child, {onClick: this.onCreateSet});
      }
      if (child.props.children) {
        return cloneElement(child, {}, universalChildren(
          this.mapChildren(child.props.children)));
      }
      return child;
    });
  }

  render() {
    return (
      <div>
        <div className={styles.container}>
        {
          this.state.elements.map(({iri, persisted}) =>
            createElement(TemplateItem, {
              key: iri,
              template: {source: this.props.template, options: {iri: Rdf.iri(iri), persisted}},
            })
          )
        }
        </div>
        {this.mapChildren(this.props.children)}
      </div>
    );
  }
}

export default OntodiaContents;
