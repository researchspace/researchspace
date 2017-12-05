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
  Component, ReactElement, cloneElement, Children, Props as ReactProps, DOM as D,
  createFactory, createElement,
} from 'react';
import * as maybe from 'data.maybe';

import { Rdf, vocabularies } from 'platform/api/rdf';
import { navigateToResource } from 'platform/api/navigation';
import { LdpService } from 'platform/api/services/ldp';
import { getOverlaySystem } from 'platform/components/ui/overlay';
import { CreateResourceDialog } from './CreateResourceDialog';


const {graph, iri, triple, literal, Iri} = Rdf;
const {VocabPlatform, rdfs, rdf, ldp} = vocabularies;

import './create-ldp-resource.scss';

export interface CreateNewResourceProps  extends ReactProps<CreateNewResourceComponent> {
  // initial title for created object
  title?: string;
  // prompt to enter title
  placeholder?: string;
  // IRI of LDP container to create resource within
  container: string;
  // IRI of resource type
  type: string;
}

/**
 * Creates new LDP resource. Currently hard-coded usage of rdfs:label to represent object title.
 * Next improvements are to allow placing a semantic form for definition of resource fields and probably sparql construct
 * parametrized with entered values to actually persist them.
 */
class CreateNewResourceComponent extends Component<CreateNewResourceProps, {}>  {
  public render() {
    const child = Children.only(this.props.children) as ReactElement<any>;
    const props = {
      onClick: () => {
        const dialogRef = 'create-new-resource';
        getOverlaySystem().show(
          dialogRef,
          createElement(CreateResourceDialog, {
            onSave: this.onSave,
            onHide: () => getOverlaySystem().hide(dialogRef),
            show: true,
            title: this.props.title,
            placeholder: this.props.placeholder,
          })
        );
      },
    };

    return D.div({},
      cloneElement(child, props)
    );
  }

  /**
   * Creates graph of persisted resource.
   * @param name
   * @returns {Kefir.Property<Rdf.Iri>}
     */
  private createResource = (name: string): Kefir.Property<Rdf.Iri> => {
    return new LdpService(this.props.container).addResource(
      graph([
        triple(
          iri(''),
          rdf.type,
          iri(this.props.type)
        ),
        triple(
          iri(''),
          rdfs.label,
          literal(name)
        ),
      ]), maybe.Just(name)
    );
  }

  /**
   * Creates container if it doesn't exist yet.
   * @returns {Kefir.Property<Rdf.Iri>}
     */
  private createContainer = (): Kefir.Property<Rdf.Iri> => {
    return new LdpService(VocabPlatform.RootContainer.value).addResource(
      graph([
        triple(
          iri(''),
          rdf.type,
          ldp.Container
        ),
        triple(
          iri(''),
          rdfs.label,
          literal('LDP Container for resources of type ' + this.props.container)
        ),
      ]), maybe.Just(this.props.container)
    );
  }


  /**
   * Callback for dialog approval
   * @param name
   * @returns {Property<Property<undefined>>}
     */
    private onSave = (name: string): Kefir.Property<any> => {
      return new LdpService(VocabPlatform.RootContainer.value).options(
        iri(this.props.container)
      ).flatMap(
        // if container already exists, simply add new resource
        v => this.createResource(name)
      ).flatMapErrors<Rdf.Iri>(
          // otherwise create new container under root resource
          e => this.createContainer().flatMap(containerIri => this.createResource(name))
      ).map(
        newResourceIri => navigateToResource(newResourceIri).onValue(() => {})
      ).toProperty();
    }
}

export type component = CreateNewResourceComponent;
export const component = CreateNewResourceComponent;
export const factory = createFactory(component);
export default component;
