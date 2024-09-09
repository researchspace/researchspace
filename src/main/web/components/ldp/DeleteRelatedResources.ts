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

import { ReactElement, Children, Props as ReactProps, cloneElement, createFactory, createElement, useState, useEffect } from 'react';
import * as D from 'react-dom-factories';
import * as maybe from 'data.maybe';
import * as Kefir from 'kefir';

// imports select query function from SparqlClient
import {SparqlClient} from 'platform/api/sparql';

import { Component } from 'platform/api/components';
import { Rdf, vocabularies } from 'platform/api/rdf';
import { VocabPlatform } from 'platform/api/rdf/vocabularies';

import { LdpService } from 'platform/api/services/ldp';
import { DateTimeFunctions } from 'platform/api/services/template/functions/DateTimeFunctions';

const { rdfs, rdf } = vocabularies;
const { graph, iri, triple, literal } = Rdf;

import './create-ldp-resource.scss';

interface DeleteRelatedResourcesState {
}

export interface DeleteRelatedResourcesProps extends ReactProps<DeleteRelatedResourcesComponent> {
  // IRI of the resource for which we need to identify related resources and remove them
  resourceIri: string;
}

/**
 * Creates new LDP resource for an ontology. 
 */
class DeleteRelatedResourcesComponent extends Component<DeleteRelatedResourcesProps, DeleteRelatedResourcesState> {
  constructor(props: DeleteRelatedResourcesProps, context: any) {
    super(props, context);
    this.state = {
    };
  }
  componentDidMount() {
      new LdpService("http://localhost:10214/container/20da8a15-f01e-4173-803c-8cd12cd8441e", { repository: "assets" })
            .deleteResource(Rdf.iri(this.props.resourceIri)).onValue(res => this.setState({}));
/*   
SparqlClient.executeSparqlUpdate("INSERT DATA { graph <"+this.props.ontologyIri+"context> { "+
            iri(VocabPlatform.OntologyContainer.value)+" <http://www.w3.org/ns/ldp#contains> "+iri(this.props.ontologyIri)+". "+
            iri(this.props.ontologyIri)+"<http://www.w3.org/ns/prov#generatedAtTime> '"+DateTimeFunctions.currentDateTime("YYYY-MM-DDThh:mm:ss.sss")+"'^^xsd:dateTime ."+
            iri(this.props.ontologyIri)+"rdf:type"+" <http://www.w3.org/ns/ldp#Resource> ." +
            iri(this.props.ontologyIri)+"rdf:type"+" <http://www.w3.org/ns/prov#Entity> .} }")
        .onValue(
            // once the results arrive, pass them to the component state via setState
            // calling setState will make React to (re) render() - React will handle the diffing of the DOM
            res => this.setState({})
            )*/
  }

  public render() {    
    return D.div({});
  }
 
}
export type deleteRelatedComponent = DeleteRelatedResourcesComponent;
export const deleteRelatedComponent = DeleteRelatedResourcesComponent;
//export const factory = createFactory(ontologyComponent);
export default deleteRelatedComponent;
