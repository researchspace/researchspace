/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import { Props as ReactProps, ReactNode, CSSProperties, createElement } from 'react';
import * as _ from 'lodash';
import * as maybe from 'data.maybe';
import * as Kefir from 'kefir';

import { Rdf } from 'platform/api/rdf';
import { getLabel } from 'platform/api/services/resource-label';
import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { getRepositoryStatus } from 'platform/api/services/repository';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

import { ResourceLink as InternalResourceLink } from './ResourceLink';
import { extractParams } from '../NavigationUtils';

export interface ResourceLinkProps extends ReactProps<ResourceLinkComponent> {
  uri: string;
  getlabel?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;

  /**
   * Specify if link should be draggable, e.g. into sets.
   *
   * @default true
   */
  draggable?: boolean;

  guessRepository?: boolean;

  // catcher for query params
  [index: string]: any;
}

interface State {
  label?: Data.Maybe<string>;
  repository: Data.Maybe<string>;
}

interface ParamMap {
    [index: string]: string;
}

/**
 * Component which can be used in handlebars templates to generate a routed
 * link for the resource. If no childs are given (elements or text), the
 * component will automatically try to fetch a label and render a sensible and
 * human readable default link (unless getlabel=true).
 *
 * 'uri' attribute specifies destination resource uri.
 *
 * 'urlqueryparam-*' attribute specify additional url query parameter,
 * last part of attribute name corresponds to the url query parameter name.
 * For example 'urlqueryparam-example="test"' attribute will result into
 * '?example=test' query parameter.
 *
 * 'getlabel' boolean attribute to specify whether label for the given resource
 * should be fetched automatically. Default: true
 *
 * @example
 *   <semantic-link
 *   	title="Execute" uri="http://researchspace.org/SearchDemo"
 *   	urlqueryparam-query="{{ID.value}}">
 *       <i class="fa fa-play-circle"></i>
 *   </semantic-link>
 *
 * @example
 * 	 // fetching label automatically
 *   <semantic-link uri="http://xmlns.com/foaf/0.1/Person">
 *   </semantic-link>
 *
 * @example
 * 	 //  fetching no label, will render plain link
 *   <semantic-link uri="http://xmlns.com/foaf/0.1/Person" getlabel=false>
 *   </semantic-link>
 */
export class ResourceLinkComponent extends Component<ResourceLinkProps, State> {
  private cancellation = new Cancellation();


  constructor(props: ResourceLinkProps, context) {
    super(props, context);
    this.state = {
      label: maybe.Nothing<string>(),
      repository: maybe.Nothing<string>(),
    };
  }

  public componentDidMount() {
    this.getRepository().onValue(
      repository => {
        this.fetchLabel(
          Rdf.iri(this.props.uri), this.props.children, repository
        ).onValue(
          label => this.setState({
            label: maybe.Just(label),
            repository: maybe.Just(repository),
          })
        );
      }
    );
  }

  public componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  public render() {
    return this.state.label.map(this.renderLink).getOrElse(null);
  }

  private renderLink = (label: string) => {
    let props = _.clone(this.props) as any;
    props.title = label;
    return createElement(InternalResourceLink,
      _.assign(
        {
          resource: Rdf.iri(this.props.uri),
          params: extractParams(this.props),
          className: this.props.className,
          style: this.props.style,
          title: this.props.title,
          repository: this.state.repository.getOrElse(undefined),
        }, props
      ), this.getChildren(this.props.children, this.state.label, this.props.uri)
    );
  }

  /**
   * Returns child nodes for the resource link component.
   * If the child is a plain text node equal to the resource Iri
   * or no child nodes are present a simple label string will be returned
   * (if present).
   *
   * Otherwise the unmodified array of children will be returned.
   *
   * @param {children}  Children of the resource link component.
   * @param {label}  Label string.
   * @param {iri}  Iri of the resource link.
   */
  private getChildren = (
    children: ReactNode,
    label: Data.Maybe<string>,
    iri: string
  ) => {
    if ((_.isEmpty(children) || children === iri) && label.isJust) {
      children = label.get();
    } else if (_.isEmpty(children)) {
      children = '';
    }
    return children;
  }

  private fetchLabel = (
    resource: Rdf.Iri, children: ReactNode, repository: string
  ): Kefir.Property<string> => {
    if (this.props.getlabel !== false && (_.isEmpty(children) || children === resource.value)) {
      return this.cancellation.map(
        getLabel(resource, {semanticContext: {repository: repository}})
      );
    } else {
      return Kefir.constant(resource.value);
    }
  }

  private static repositories = getRepositoryStatus();
  private getRepository = (): Kefir.Property<string> => {
    if (this.props.guessRepository) {
      return ResourceLinkComponent.repositories.map(
        repositories =>
          repositories.filter(running => running).map(
            (_, repository) => this.executeGuessQuery(repository)
          )
      ).flatMap(
        responses => Kefir.combine(responses.toKeyedSeq().toObject())
      ).map(
        responses => _.findKey(responses)
      ).toProperty();
    } else {
      return Kefir.constant(
        this.context.semanticContext ? this.context.semanticContext.repository : undefined
      );
    }
  }



  private static GUESS_QUERY = SparqlUtil.Sparql`ASK { ?subject a ?type }`;
  private executeGuessQuery = (repository: string) => {
   return SparqlClient.ask(
     SparqlClient.setBindings(
       ResourceLinkComponent.GUESS_QUERY, {subject: Rdf.iri(this.props.uri)}
     ),
    {context: {repository: repository}}
   );
  }

}
export default ResourceLinkComponent;
