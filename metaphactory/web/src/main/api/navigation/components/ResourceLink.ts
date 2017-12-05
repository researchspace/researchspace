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

import {
  ReactElement, createElement, Props, MouseEvent, DOM as D, CSSProperties,
} from 'react';
import { assign } from 'lodash';
import * as classNames from 'classnames';
import * as Maybe from 'data.maybe';
import * as _ from 'lodash';

import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { Draggable } from 'platform/components/dnd';
import {
  getCurrentResource, navigateToResource, getCurrentUrl, constructUrlForResource,
} from '../Navigation';

export enum ResourceLinkAction {
  edit,
}

interface ResourceLinkProps extends Props<ResourceLink> {
  resource: Rdf.Iri;
  title?: string;
  draggable?: boolean;
  action?: ResourceLinkAction;
  params?: {};
  className?: string;
  activeClassName?: string;
  style?: CSSProperties;
  repository?: string
}

interface State {
  url: Data.Maybe<uri.URI>;
  label: Data.Maybe<string>;
}

export class ResourceLink extends Component<ResourceLinkProps, State> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      url: Maybe.Nothing<uri.URI>(),
      label: Maybe.Nothing<string>(),
    };
  }

  componentDidMount() {
    constructUrlForResource(this.props.resource, this.props.params, this.getRepository())
      .onValue(
        url => this.setState({url: Maybe.Just(url)})
      );
  }

  public render() {
    return this.state.url.map(this.renderLink).getOrElse(D.a());
  }
  private renderLink = (url: uri.URI): ReactElement<any>  => {
    const {title, className, activeClassName, style, resource, draggable} = this.props;
    const props = {
      href: url.toString(),
      title: title,
      className: classNames(className, {
        [activeClassName]: this.isLinkActive(),
      }),
      style: style,
      onClick: this.onClick,
    };

    // by default all links are draggable, but sometimes we want to disable this behavior
    if (draggable === false) {
      return D.a(props, this.props.children);
    } else {
      return createElement(Draggable,
        {iri: resource.value},
        D.a(props, this.props.children)
      );
    }
  }

  private onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const query =
      assign(
        {
          action: ResourceLinkAction[this.props.action],
        },
        this.props.params
      );

    navigateToResource(this.props.resource, query, this.getRepository())
      .onValue(() => {/**/});
  }

  private getRepository = () =>
    this.props.repository ? this.props.repository :
      (this.context.semanticContext ? this.context.semanticContext.repository : undefined);

  private isLinkActive = () => {
    const {resource, params} = this.props;
    const urlParams = assign({}, params);
    if (!_.isUndefined(this.props.action)) {
      urlParams['action'] = ResourceLinkAction[this.props.action];
    }

    // extract params from current url and drop ?uri param
    // for comparison i.e. in case of dealing with full uris
    const currentUrlParms = assign({}, getCurrentUrl().search(true));
    delete currentUrlParms.uri;
    return getCurrentResource().equals(resource) &&
      _.isEqual(currentUrlParms, urlParams);
  }
}
