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

import { ReactElement, cloneElement, Children, createFactory, createElement } from 'react';
import * as maybe from 'data.maybe';
import * as Kefir from 'kefir';

import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { LdpService } from 'platform/api/services/ldp';
import { navigateToResource, refresh } from 'platform/api/navigation';
import { getOverlaySystem } from 'platform/components/ui/overlay';

import { CreateResourceDialog } from './CreateResourceDialog';

import './create-ldp-resource.scss';

export interface Props {
  /** initial title for created object */
  title?: string;
  /** prompt to enter title */
  placeholder?: string;
  /** IRI of container where original and copied resource resides */
  container?: string;
  /** IRI of resource to duplicate */
  iri: string;

  /**
   * @default 'redirect'
   */
  postAction?: 'redirect' | 'reload' | string;
}

/**
 * Duplicates existing LDP resource.
 * @example
 *  <mp-ldp-duplicate-resource-action iri="http://example.com/resource">
 *      <button class="btn btn-default">Duplicate resource</button>
 *  </mp-ldp-duplicate-resource-action>
 */
class DuplicateResourceComponent extends Component<Props, {}> {
  public static defaultProps = {
    postAction: 'redirect',
  };

  public render() {
    const child = Children.only(this.props.children) as ReactElement<any>;
    const props = {
      onClick: () => {
        const dialogRef = 'duplicate-resource';
        getOverlaySystem().show(
          dialogRef,
          createElement(CreateResourceDialog, {
            onSave: this.onSave,
            onHide: () => getOverlaySystem().hide(dialogRef),
            show: true,
            title: this.props.title ? this.props.title : 'Duplicate resource',
            placeholder: this.props.placeholder,
          })
        );
      },
    };
    return cloneElement(child, props);
  }

  private onSave = (name: string): Kefir.Property<any> => {
    const service = new LdpService(this.props.container, this.context.semanticContext);
    return service
      .copyResource(Rdf.iri(this.props.iri), maybe.fromNullable(this.props.container).map(Rdf.iri), maybe.Just(name))
      .map(Rdf.iri)
      .flatMap((newResourceIri: Rdf.Iri) => {
        if (!this.props.postAction || this.props.postAction === 'reload') {
          refresh();
        } else if (this.props.postAction === 'redirect') {
          // assumption is that ldp resources are always stored in the assets repository
          return navigateToResource(newResourceIri, {}, 'assets').onValue(() => {
            /**/
          });
        } else {
          navigateToResource(Rdf.iri(this.props.postAction)).onValue((v) => v);
        }
      })
      .toProperty();
  };
}

export type component = DuplicateResourceComponent;
export const component = DuplicateResourceComponent;
export const factory = createFactory(component);
export default component;
