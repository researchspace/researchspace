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

import { CSSProperties, ReactElement, HTMLProps, createElement } from 'react';
import * as Kefir from 'kefir';

import { Rdf } from 'platform/api/rdf';
import { Component } from 'platform/api/components';
import { HighlightComponent } from 'platform/components/ui/highlight';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';

import * as LabelsService from 'platform/api/services/resource-label';

export interface Props {
  /**
   * IRI of resource to fetch label for
   */
  iri: string;
  /**
   * Additional class names for component root element
   */
  className?: string;
  /**
   * Additional styles for label element
   */
  style?: CSSProperties;
  /**
   * Substring to highlight
   */
  highlight?: string;
  /**
   * Props for highlighted substring span
   */
  highlightProps?: HTMLProps<HTMLSpanElement>;
}

export interface State {
  label?: string;
  error?: any;
}

/**
 * @example
 * <mp-label iri='some:resource'></mp-label>
 */
export class ResourceLabel extends Component<Props, State> {
  private subscription: Kefir.Subscription;
  constructor(props: Props, context) {
    super(props, context);
    this.state = {};
  }

  componentDidMount() {
    this.fetchLabel(Rdf.iri(this.props.iri));
  }

  componentWillReceiveProps(nextProps: Props) {
    const { iri } = this.props;
    if (nextProps.iri !== iri) {
      this.subscription.unsubscribe();
      this.fetchLabel(Rdf.iri(nextProps.iri));
    }
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  private fetchLabel = (iri: Rdf.Iri) => {
    const context = this.context.semanticContext;
    this.subscription = LabelsService.getLabel(iri, { context }).observe({
      value: (label) => this.setState({ label: label, error: undefined }),
      error: (error) => this.setState({ label: undefined, error: error }),
    });
  };

  render(): ReactElement<any> {
    const { className, style, highlight, highlightProps } = this.props;
    const { label, error } = this.state;

    if (error) {
      return createElement(ErrorNotification, { errorMessage: error });
    }

    return typeof label === 'string'
      ? createElement(HighlightComponent, { className, style, highlight, highlightProps }, label)
      : createElement(Spinner);
  }
}

export default ResourceLabel;
