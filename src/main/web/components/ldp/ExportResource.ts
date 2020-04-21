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

import { ReactElement, cloneElement, Children } from 'react';
import * as assign from 'object-assign';
import * as _ from 'lodash';
import * as moment from 'moment';

import { Component, ComponentContext } from 'platform/api/components';
import { LdpService } from 'platform/api/services/ldp';
import { Cancellation } from 'platform/api/async';
import { getLabels } from 'platform/api/services/resource-label';
import { Rdf } from 'platform/api/rdf';

interface IriProps {
  iri: string;
}
interface SelectionProps {
  selection: string[];
}
export type Props = IriProps | SelectionProps;

function isIriProps(props: Props): props is IriProps {
  return _.has(props, 'iri');
}
function isSelectionProps(props: Props): props is SelectionProps {
  return _.has(props, 'selection');
}

/**
 * Export LDP resource.
 * @example
 *  <mp-ldp-export-resource iri="http://example.com/resource">
 *      <button class="btn btn-default">Export resource</button>
 *  </mp-ldp-export-resource>
 */
export class ExportResourceComponent extends Component<Props, {}> {
  private readonly cancellation = new Cancellation();

  constructor(props: Props, context: ComponentContext) {
    super(props, context);
    this.checkProps(props);
  }

  componentWillReceiveProps(props: Props) {
    this.checkProps(props);
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  checkProps(props: Props) {
    if (isIriProps(props) === isSelectionProps(props)) {
      throw 'Property iri xor selection of mp-ldp-export-resource should be set';
    }
  }

  getLDPService() {
    return new LdpService('', this.context.semanticContext);
  }

  private onClick = () => {
    const selection = isIriProps(this.props) ? [this.props.iri] : this.props.selection;
    const exportURL = this.getLDPService().getExportURL(selection);
    const { repository } = this.context.semanticContext;
    this.cancellation.map(getLabels(selection.map(Rdf.iri), { context: { repository } })).observe({
      value: (labels) => {
        const name = labels.toArray().reduce((acc, curr) => {
          const label = curr.replace(/\s/g, '-');
          return acc === '' ? label : `${acc}-${label}`;
        }, '');
        const filename = `${moment().format('YYYY-MM-DDTHH-mm')}-${window.location.hostname}-${name}.trig`;
        window.open(`${exportURL}&filename=${filename}`, '_blank');
      },
      error: (error) => {
        throw Error(error);
      },
    });
  };

  public render() {
    const child = Children.only(this.props.children) as ReactElement<any>;
    return cloneElement(
      child,
      assign({}, child.props, {
        disabled: isSelectionProps(this.props) && this.props.selection.length === 0,
        onClick: this.onClick,
      })
    );
  }
}

export default ExportResourceComponent;
