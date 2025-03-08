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
import * as Reactodia from '@reactodia/workspace';

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
    const { id: target } = this.props;
    this.cancellation
      .map(listen({ target, eventType: SetManagementEvents.ItemsFiltered }))
      .onValue(({ data }) => this.highlightItems(data.iris));
    this.cancellation
      .map(listen({ target, eventType: SetManagementEvents.ItemSelected }))
      .onValue(({ data }) => this.centerToElement(data));
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private highlightItems(iris: Array<string> | undefined) {
    const { view } = this.ontodia.workspace.getContext();
    let highlighter: Reactodia.CellHighlighter | undefined;
    if (iris) {
      const highlightedElements = new Set<string>();
      iris.forEach((iri) => highlightedElements.add(iri));
      highlighter = (item) => {
        if (item instanceof Reactodia.EntityElement) {
          return highlightedElements.has(item.iri);
        }
        if (item instanceof Reactodia.RelationLink) {
          const { sourceId, targetId } = item.data;
          return highlightedElements.has(sourceId) || highlightedElements.has(targetId);
        }
        return false;
      };
    }
    view.setHighlighter(highlighter);
  }

  private centerToElement(iri: string) {
    const workspace = this.ontodia.workspace;
    const { model, view } = workspace.getContext();
    const canvas = view.findAnyCanvas();
    const selectedElement = model.elements.find((element) =>
      element instanceof Reactodia.EntityElement && element.iri === iri
    );
    if (selectedElement) {
      if (canvas) {
        const bbox = Reactodia.getContentFittingBox([selectedElement], [], canvas.renderingState);
        canvas.zoomToFitRect(bbox);
      }
      model.setSelection([selectedElement]);
    }
  }

  render() {
    return <Ontodia ref={(ontodia) => (this.ontodia = ontodia)} {...this.props} />;
  }
}

export default OntodiaPanel;
