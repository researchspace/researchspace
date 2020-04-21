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

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 * @author Denis Ostapenko
 */

import { Component, Props, createFactory, createElement, MouseEvent } from 'react';
import * as D from 'react-dom-factories';

import { TemplateItem } from 'platform/components/ui/template';
import { Spinner } from 'platform/components/ui/spinner';

import { Resource } from 'platform/components/semantic/search/data/Common';
import { Literal } from 'platform/components/semantic/search/data/search/Model';

export interface FacetValueProps extends Props<FacetValueComponent> {
  kind: 'resource' | 'literal';
  facetValue: {
    entity: Resource | Literal;
    selected: boolean;
    tupleTemplate: { resource: string; literal: string };
  };
  highlight?: string;
  actions: {
    selectFacetValue: (term: Resource | Literal) => void;
    deselectFacetValue: (term: Resource | Literal) => void;
  };
}

interface FacetValueState {
  selected: boolean;
  isLoading: boolean;
}

/**
 * Displays facet value of Resource type.
 * It would be required to implement other facet value component
 * for other facet value kinds, e.g. date slider etc.
 */
export class FacetValueComponent extends Component<FacetValueProps, FacetValueState> {
  constructor(props: FacetValueProps, context: any) {
    super(props, context);
    this.state = {
      selected: props.facetValue.selected,
      isLoading: false,
    };
  }

  componentWillReceiveProps(newProps: FacetValueProps) {
    this.setState({
      selected: newProps.facetValue.selected,
      isLoading: false,
    });
  }

  renderCheckboxLabel() {
    const { kind } = this.props;
    const template = this.props.facetValue.tupleTemplate[kind];
    return createElement(TemplateItem, {
      template: {
        source: template,
        options: { highlight: this.props.highlight, ...(this.props.facetValue.entity as any).tuple },
      },
    });
  }

  render() {
    return D.div(
      {
        className: 'facet__relation__values__value checkbox',
        onClick: this.onValueClick.bind(this),
      },
      D.label(
        {},
        D.input({
          type: 'checkbox',
          className: 'checkbox',
          checked: this.state.selected,
        }),
        this.renderCheckboxLabel(),
        this.state.isLoading ? createElement(Spinner) : D.span({})
      )
    );
  }

  private onValueClick(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();

    // Event is fired twice, because we have input element inside label element.
    // so we need to trigger action only once.
    // The idea is to trigger it only for checkbox element.
    if (event.target['tagName'] === 'INPUT') {
      this.setState({
        selected: (event.target as HTMLInputElement).checked,
        isLoading: true,
      });
      if (this.props.facetValue.selected) {
        this.props.actions.deselectFacetValue(this.props.facetValue.entity);
      } else {
        this.props.actions.selectFacetValue(this.props.facetValue.entity);
      }
    }
  }
}

export const FacetValue = createFactory(FacetValueComponent);
export default FacetValue;
