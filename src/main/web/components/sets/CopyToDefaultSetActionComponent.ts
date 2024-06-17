/**
 * ResearchSpace
 * Copyright (C) 2024, Kartography CIC
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
/**
 * @author Diana Tanase
 */

import { cloneElement, Children, Component, MouseEvent } from 'react';
import { Rdf } from 'platform/api/rdf';
import { addToDefaultSet } from 'platform/api/services/ldp-set';
import { MenuProps } from 'platform/components/ui/selection/SelectionActionProps';
import { AllTitleProps } from './TypedSelectionActionProps';
import { trigger } from 'platform/api/events/EventsStore';

type Props = MenuProps & AllTitleProps & { id: string };


export interface CopyToDefaultConfig {
  /**
   * Resource's iri"
   */
  resource: string;
  /**
   * Source id
   */
  id: string;
}
export type CopyToDefaultProps = CopyToDefaultConfig & ReactProps<CopyToDefaultSetActionComponent>;

export class CopyToDefaultSetActionComponent extends Component<CopyToDefaultProps, {}> {
  constructor(props: CopyToDefaultProps, context: any) {
    super(props, context);
  }
  render() {
    const { resource,id } = this.props;
    const props = {
      onClick: this.onClick,
    };

    return cloneElement(<any>Children.only(this.props.children), props);
  }

  onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    //const iri = Rdf.iri(this.props.uri);
    //const repository = this.context.semanticContext ? this.context.semanticContext.repository : undefined;
    //const params = NavigationUtils.extractParams(this.props);

    this.copyToDefaultSet(this.props.resource, this.props.id);
  };
  

  copyToDefaultSet = (selection: string, sourceId: string) => {
    addToDefaultSet(Rdf.iri(selection), sourceId);
  };
}
export default CopyToDefaultSetActionComponent;