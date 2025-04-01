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

import { createElement, Props } from 'react';
import * as D from 'react-dom-factories';
import * as _ from 'lodash';

import { BuiltInEvents, trigger } from 'platform/api/events';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Component, ComponentContext } from 'platform/api/components';
import { prepareResultData } from 'platform/components/utils';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';

import { Carousel, ReactSlickOptions } from './Carousel';

export interface SemanticCarouselConfig {
  /**
   * SPARQL SELECT query string
   */
  query: string;

  /**
   * [handlebars.js](http://handlebarsjs.com/) HTML slide template.
   * SPARQL query projection variables are available in the template
   */
  tupleTemplate: string;

  /**
   * Template which is applied when query returns no results
   */
  noResultTemplate?: string;

  /**
   * Additional carousel config options propagated to underlying library [react-slick](https://github.com/akiran/react-slick)
   */
  options?: ReactSlickOptions;

  /**
   * ID for issuing component events.
   */
  id?: string;
}

export type SemanticCarouselProps = SemanticCarouselConfig & Props<SemanticCarousel>;

interface SemanticCarouselState {
  isLoading: boolean;
  data?: SparqlClient.SparqlSelectResult;
}

export class SemanticCarousel extends Component<SemanticCarouselProps, SemanticCarouselState> {
  constructor(props: SemanticCarouselProps, context: ComponentContext) {
    super(props, context);
    this.state = {
      isLoading: true,
    };
  }

  public render() {
    if (this.state.isLoading) {
      return createElement(Spinner);
    }

    if (SparqlUtil.isSelectResultEmpty(this.state.data)) {
      return this.props.noResultTemplate
        ? createElement(TemplateItem, { template: { source: this.props.noResultTemplate } })
        : null;
    }

    const processedData = prepareResultData(this.state.data);
    
    return createElement(Carousel, {
      data: processedData,
      tupleTemplate: this.getTupleTemplate(),
      options: this.getCarouselOptions(),
    });
  }

  public componentWillReceiveProps(nextProps: SemanticCarouselProps, nextContext: any) {
    if (nextProps.query !== this.props.query) {
      this.prepareConfigAndExecuteQuery(nextProps, nextContext);
    }
  }

  public componentWillMount() {
    this.prepareConfigAndExecuteQuery(this.props, this.context);
  }

  public shouldComponentUpdate(nextProps: SemanticCarouselProps, nextState: SemanticCarouselState) {
    return nextProps.query !== this.props.query || nextState !== this.state;
  }

  private prepareConfigAndExecuteQuery = (props: SemanticCarouselProps, context: ComponentContext) => {
    const stream = SparqlClient.select(props.query, { context: context.semanticContext });
    stream
      .onValue((res) => this.setState({ data: res, isLoading: false }))
      .onEnd(() => {
        if (this.props.id) {
          trigger({ eventType: BuiltInEvents.ComponentLoaded, source: this.props.id });
        }
      });

    if (this.props.id) {
      trigger({
        eventType: BuiltInEvents.ComponentLoading,
        source: this.props.id,
        data: stream,
      });
    }
  };

  private getTupleTemplate(): string {
    if (_.has(this.props, 'layout')) {
      console.warn('layout property in semantic-carousel is deprecated, please use flat properties instead');
      return this.props['layout']['tupleTemplate'];
    }
    return this.props.tupleTemplate;
  }

  private getCarouselOptions(): ReactSlickOptions {
    if (_.has(this.props, 'layout')) {
      console.warn('layout property in semantic-carousel is deprecated, please use flat properties instead');
      return this.props['layout']['options'];
    }
    return this.props.options;
  }
}
export default SemanticCarousel;
