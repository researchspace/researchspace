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
import { Element, Link, Highlighter, getContentFittingBox } from 'ontodia';

import { listen } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';

import { SetManagementEvents } from 'platform/api/services/ldp-set/SetManagementEvents';

import { Ontodia, OntodiaProps } from 'platform/components/3-rd-party/ontodia/Ontodia';

/**
 * @example
 * <rs-ontodia-panel-system settings=nostats></rs-ontodia-panel-system>
 */
export class OntodiaPanel extends Component<OntodiaProps, {}> {
  private readonly cancellation = new Cancellation();
  private ontodia: Ontodia;

  componentDidMount() {
    const {id: target} = this.props;
    this.cancellation.map(
      listen({target, eventType: SetManagementEvents.ItemsFiltered})
    ).onValue(
      ({data}) => this.highlightItems(data.iris)
    );
    this.cancellation.map(
      listen({target, eventType: SetManagementEvents.ItemSelected})
    ).onValue(
      ({data}) => this.centerToElement(data)
    );
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private highlightItems(iris: Array<string> | undefined) {
    const view = this.ontodia.workspace.getDiagram();
    let highlighter: Highlighter;
    if (iris) {
      const highlightedElements = new Set<string>();
      iris.forEach(iri => highlightedElements.add(iri));
      highlighter = item => {
        if (item instanceof Element) {
          return highlightedElements.has(item.iri);
        }
        if (item instanceof Link) {
          const {sourceId, targetId} = item.data;
          return highlightedElements.has(sourceId) || highlightedElements.has(targetId);
        }
        throw Error('Unknown item type');
      };
    }
    view.setHighlighter(highlighter);
  }

  private centerToElement(iri: string) {
    const workspace = this.ontodia.workspace;
    const model = workspace.getModel();
    const selectedElement = model.elements.find(element => element.iri === iri);
    if (selectedElement) {
      const bbox = getContentFittingBox([selectedElement], []);
      workspace.zoomToFitRect(bbox);
      workspace.getEditor().setSelection([selectedElement]);
    }
  }

  render() {
    return <Ontodia ref={ontodia => this.ontodia = ontodia} {...this.props} />;
  }
}

export default OntodiaPanel;
