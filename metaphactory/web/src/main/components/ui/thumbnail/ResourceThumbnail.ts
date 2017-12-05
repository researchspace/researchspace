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
  DOM as D, createElement, CSSProperties, ReactElement, ReactChild, ComponentClass, Children,
} from 'react';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { Component, } from 'platform/api/components';
import { ErrorNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';
import { getThumbnail } from 'platform/api/services/resource-thumbnail';

import { NoResourceThumbnail } from './NoResourceThumbnail';

export interface Props {
  /** IRI of resource to fetch thumbnail for. */
  iri: string;
  /** URI of image to display when resource has no thumbnail. */
  noImageUri?: string;
  /** Additional class names for component root element. */
  className?: string;
  /** Additional styles for thumbnail element. */
  style?: CSSProperties;
}

interface State {
  imageUri?: string | null;
  error?: any;
}

/**
 * Queries for and displays thumbnail image for specified by {@Rdf.Iri} resource
 * with fallback image when no thumbnail for a resource found.
 *
 * @example
 * <mp-resource-thumbnail iri='http://example.com'
 *   no-image-uri='//no-image/available.png'
 *   style="max-width: 400px; max-height: 100px;" />
 *
 * @example
 * <mp-resource-thumbnail iri='http://example.com'
 *   style="max-width: 400px; max-height: 100px;"
 * >
 *   <mp-resource-thumbnail-fallback>
 *     <span>Image not found!</span>
 *   </mp-resource-thumbnail-fallback>
 * </mp-resource-thumbnail>
 *
 */
export class ResourceThumbnail extends Component<Props, State> {
  private subscription: Kefir.Subscription;

  constructor(props: Props, context) {
    super(props, context);
    this.state = {};
  }

  componentDidMount() {
    this.fetchThumbnailUrl(Rdf.iri(this.props.iri));
  }

  componentWillReceiveProps(nextProps: Props) {
    const {iri} = this.props;
    if (nextProps.iri !== iri) {
      this.subscription.unsubscribe();
      this.fetchThumbnailUrl(Rdf.iri(nextProps.iri));
    }
  }

  componentWillUnmount() {
    this.subscription.unsubscribe();
  }

  private fetchThumbnailUrl(resourceIri: Rdf.Iri) {
    this.subscription =
      getThumbnail(resourceIri, this.context)
      .observe({
        value: imageUri => this.setState({imageUri, error: undefined}),
        error: error => this.setState({imageUri: undefined, error}),
      });
  }

  render(): ReactElement<any> {
    const className = `resource-thumbnail ${this.props.className || ''}`;

    if (this.state.imageUri !== undefined) {
      const imageSrc = typeof this.state.imageUri === 'string'
        ? this.state.imageUri : this.props.noImageUri;

      if (typeof imageSrc !== 'string') {
        // use fallback component only if neither imageUri or noImageUri present
        const fallbackComponent = this.findComponent(
          Children.toArray(this.props.children), NoResourceThumbnail);
        if (fallbackComponent) {
          return fallbackComponent;
        }
      }

      return D.img({className, src: imageSrc, style: this.props.style});
    } else if (this.state.error !== undefined) {
      return createElement(ErrorNotification, {className, errorMessage: this.state.error});
    } else {
      return createElement(Spinner, {className});
    }
  }

  private findComponent =
    (children: Array<ReactChild>, component: ComponentClass<any>): ReactElement<any> => {
      const element =
        _.find(
          children, child => (child as React.ReactElement<any>).type === component
        ) as ReactElement<any>;
      return element;
    }
}
export default ResourceThumbnail;
