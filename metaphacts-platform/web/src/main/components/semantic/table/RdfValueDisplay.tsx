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

import * as React from 'react';
import * as Kefir from 'kefir';

import { Rdf } from 'platform/api/rdf';
import { ResourceLink } from 'platform/api/navigation/components';
import { SparqlUtil, QueryContext } from 'platform/api/sparql';
import { getLabel } from 'platform/api/services/resource-label';

import { CopyToClipboardComponent } from 'platform/components/copy-to-clipboard';

export interface RdfValueDisplayProps {
  data: Rdf.Node;
  className?: string;
  label?: string;
  fetchLabel?: boolean;
  fetchContext?: QueryContext;
  showLiteralDatatype?: boolean;
  linkParams?: {};
  showCopyToClipboardButton?: boolean;
}

interface State {
  readonly label?: string;
}

const NON_BREAKABLE_SPACE = '\xa0';

export class RdfValueDisplay extends React.Component<RdfValueDisplayProps, State> {
  private subscription: Kefir.Subscription | undefined;

  constructor(props: RdfValueDisplayProps) {
    super(props);
    this.state = {label: props.label};
  }

  componentDidMount() {
      this.fetchLabelForIri(this.props);
  }

  componentWillReceiveProps(nextProps: RdfValueDisplayProps) {
    if (!nextProps.data.equals(this.props.data) || nextProps.fetchLabel !== this.props.fetchLabel) {
        this.fetchLabelForIri(nextProps);
    }
  }

  fetchLabelForIri(props: RdfValueDisplayProps) {
    const node = props.data;
    if (node instanceof Rdf.Iri) {
      if (this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = undefined;
      }
      if (props.label === undefined && props.fetchLabel) {
        // display non-breakable space instead of nothing to
        // prevent vertical size changes in most circumstances
        this.setState({label: NON_BREAKABLE_SPACE});
        this.subscription = getLabel(node, {context: props.fetchContext}).observe({
          value: label => this.setState({label}),
          error: () => this.setState({label: node.value})
        });
      } else {
        this.setState({label: props.label});
      }
    }
  }

  componentWillUnmount() {
      if (this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = undefined;
      }
  }

  render() {
    const {className} = this.props;
    const {label} = this.state;
    const displayValue = renderRdfNode(this.props, label);
    return <span className={className}>{displayValue}</span>;
  }
}

function renderRdfNode(
  props: RdfValueDisplayProps,
  label: string | undefined
): JSX.Element | string | undefined {
  const {data} = props;
  if (data.isIri()) {
    const content = typeof label === 'string' ? label : data.value;
    const resourceLink = (
      <ResourceLink
        className={props.className}
        data-rdfa-about={data.value}
        resource={data}
        title={content}
        params={props.linkParams}>
        {content}
      </ResourceLink>
    );
    if (!props.showCopyToClipboardButton) {
      return resourceLink;
    }
    return (
      <span>
        {resourceLink}
        <CopyToClipboardComponent text={data.value}>
          <button className='btn btn-link btn-xs' title='Copy IRI'>
            <i className='fa fa-clipboard text-muted'></i>
          </button>
        </CopyToClipboardComponent>
      </span>
    );
  } else if (data.isLiteral()) {
    const dataType = props.showLiteralDatatype
      ? <i>{` (${SparqlUtil.compactIriUsingPrefix(data.datatype)})`}</i>
      : undefined;
    return <span>{data.value}{dataType}</span>;
  } else if (data.isBnode()) {
    return data.value;
  } else {
    return null;
  }
}
