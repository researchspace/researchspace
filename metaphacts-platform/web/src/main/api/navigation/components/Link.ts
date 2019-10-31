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

import { Component, Props as ReactProps, MouseEvent } from 'react';
import * as D from 'react-dom-factories';
import * as classNames from 'classnames';
import * as uri from 'urijs';
import * as _ from 'lodash';

import { navigateToUrl, getCurrentUrl } from '../Navigation';
import { extractParams } from '../NavigationUtils';

/**
 * Component that uses platform 'Navigation',
 * to navigate to the given internal URL without page reload.
 *
 * @example
 *   <mp-link url="/sparql">sparql</mp-link>
 */
export interface LinkConfig {
  /**
   * Root-relative URL to navigate to. e.g "/sparql"
   */
  url: string;

  /**
   * link title shown on mouse-hover
   */
  title?: string;

  /**
   * 'urlqueryparam-*' attribute specify additional url query parameters
   * that will be attached to the resulting url
   */
  params?: {[name: string]: string};

  /**
   * if link should be highlighted as active, if not specified
   * link will be highlighted by active if link's url
   * and parameters fully match current location
   */
  active?: boolean;

  /**
   * css class names list
   */
  className?: string;

  /**
   * css classes that should be applied to the active link
   */
  activeClassName?: string;
}
export type LinkProps = LinkConfig & ReactProps<LinkComponent>;

export class LinkComponent extends Component<LinkProps, {}> {

  public render() {
    const {title, className, activeClassName} = this.props;
    const props = {
      title: title,
      className: classNames(className, {
        [activeClassName]: this.isLinkActive(this.props),
      }),
      onClick: this.onClick,
    };
    return D.a(props, this.props.children);
  }

  private onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();

    navigateToUrl(
      this.constructUrl(this.props)
    ).onValue(() => {/**/});
  }

  private constructUrl(props: LinkProps) {
    const { url } = props;
    const query = extractParams(props);
    return uri(url).setSearch(query);
  }

  private isLinkActive(props: LinkProps) {
    const url = this.constructUrl(props);
    return getCurrentUrl().equals(url) &&
      (_.isUndefined(this.props.active) ? true : this.props.active);
  }
}
export default LinkComponent;
