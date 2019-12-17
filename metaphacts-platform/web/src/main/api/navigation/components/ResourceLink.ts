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

import { ReactElement, createElement, Props, MouseEvent, CSSProperties } from 'react';
import * as D from 'react-dom-factories';
import { assign } from 'lodash';
import * as classNames from 'classnames';
import * as Maybe from 'data.maybe';
import * as _ from 'lodash';

import { Cancellation } from 'platform/api/async';
import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { Draggable } from 'platform/components/dnd';
import {
  getCurrentResource, navigateToResource, getCurrentUrl,
  constructUrlForResource, construcUrlForResourceSync,
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
  repository?: string;
  target?: '_self' | '_blank';
  fragment?: string;
}

interface State {
  readonly url?: uri.URI;
}

export class ResourceLink extends Component<ResourceLinkProps, State> {
  private readonly cancellation = new Cancellation();

  constructor(props: ResourceLinkProps, context: any) {
    super(props, context);
    this.state = {
      url: construcUrlForResourceSync(
        this.props.resource, this.props.params, this.getRepository(), this.props.fragment
      ),
    };
  }

  static defaultProps = {
    target: '_self' as '_self',
  };

  componentDidMount() {
    this.cancellation.map(
      constructUrlForResource(
        this.props.resource, this.props.params, this.getRepository(), this.props.fragment
      )
    ).observe({
      value: url => this.setState({url}),
      error: error => console.error(error),
    });
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  public render() {
    const {
      title, className, activeClassName, style, resource, draggable, target,
    } = this.props;
    const {url} = this.state;
    const props = {
      href: url.toString(),
      title: title,
      className: classNames(className, {
        [activeClassName]: this.isLinkActive(),
      }),
      style: style,
      onClick: this.onClick,
      target: target,
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
    if (isSimpleClick(e) && this.props.target === '_self') {
      e.preventDefault();
      e.stopPropagation();

      const query = {action: ResourceLinkAction[this.props.action], ...this.props.params};
      navigateToResource(this.props.resource, query, this.getRepository(), this.props.fragment)
        .onValue(() => {/**/});
    }
    // otherwise we just let default link action trigger, and for example if
    // target='_blank' is set it will just open the page in a new window
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


/**
 * make sure that we don't hijack Ctrl+Click, Meta+Click, middle mouse click default actions
 */
export function isSimpleClick(e: MouseEvent<HTMLAnchorElement>) {
  return e.button === 0 && !(e.ctrlKey || e.metaKey);
}
