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

import { Component, Props as ReactProps, createElement } from 'react';
import * as D from 'react-dom-factories';
import * as Kefir from 'kefir';

import { Rdf } from 'platform/api/rdf';
import { ResourceLink } from 'platform/api/navigation/components';
import * as LabelsService from 'platform/api/services/resource-label';
import { compactIriUsingPrefix } from 'platform/api/sparql/SparqlUtil';

import { CopyToClipboardComponent } from 'platform/components/copy-to-clipboard';

export interface RdfValueDisplayProps extends ReactProps<RdfValueDisplay> {
    data: Rdf.Node;
    className?: string;
    /**
     * Optional param to prevent fetching a human readable value for Rdf.Iri nodes
     * Only if explicitly set to false, labels will not be fetched and rendered.
     *
     * Defaults to true.
     */
    showLabel?: boolean;
    showLiteralDatatype?: boolean;
    linkParams?: {};
    showCopyToClipboardButton?: boolean;
}

export class RdfValueDisplay extends Component<RdfValueDisplayProps, {label: string}> {
    private labelsProperty: Kefir.Property<string>;

    constructor(props) {
        super(props);
        this.state = {
            label: '',
        };
    }

    componentDidMount() {
        this.getLabelForIri(this.props.data);
    }

    componentWillReceiveProps(newProps: RdfValueDisplayProps) {
        if (!newProps.data.equals(this.props.data) || newProps.showLabel !== this.props.showLabel) {
            this.getLabelForIri(newProps.data);
        }
    }

    public componentWillUnmount() {
        if (this.labelsProperty) {
            this.labelsProperty.offValue(this.setLabel);
        }
    }

    render() {
        const displayValue = this.props.data.cata<any>(
          iri => {
            const resourceLink = createElement(ResourceLink, {
              className: this.props.className,
              'data-rdfa-about': iri.value,
              resource: iri,
              title: this.state.label,
              params: this.props.linkParams,
            } as any, this.state.label);
            if (!this.props.showCopyToClipboardButton) {
              return resourceLink;
            }
            return D.span({},
              resourceLink,
              createElement(CopyToClipboardComponent, {text: iri.value},
                D.button({className: 'btn btn-link btn-xs', title: 'Copy IRI'},
                  D.i({className: 'fa fa-clipboard text-muted'})
                )
              )
            )
          },
            literal => {
              const dataType = this.props.showLiteralDatatype ?
                D.i({}, ` (${compactIriUsingPrefix(literal.datatype)})`) : undefined;
              return D.span({}, literal.value, dataType);
            },
            bnode => bnode.value
        );
        return D.span({className: this.props.className}, displayValue);
    }

    private getLabelForIri(node: Rdf.Node) {
        if (node instanceof Rdf.Iri) {
            // set label to URI
            this.setState({label: node.value});

            // if this.props.showLabel not explicitly set to false
            if (this.props.showLabel === false) {
                return;
            } else {
                this.labelsProperty = LabelsService.getLabel(node);
                this.labelsProperty.onValue(this.setLabel);
            }
        }
    }

    private setLabel = (label: string) => {
        this.setState({label: label});
    }
}
