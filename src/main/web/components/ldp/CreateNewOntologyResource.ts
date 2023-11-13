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

interface CreateNewOntologyResourceState {
}

export interface CreateNewOntologyResourceProps extends ReactProps<CreateNewOntologyResourceComponent> {
  // IRI of resource type
  ontologyIri: string;
}

/**
 * Creates new LDP resource for an ontology. 
 */
class CreateNewOntologyResourceComponent extends Component<CreateNewOntologyResourceProps, CreateNewOntologyResourceState> {
  
  constructor(props: CreateNewOntologyResourceProps, context: any) {
    super(props, context);
    this.state = {
    };
  }

  // this function is called by React when component is mounted to the DOM
  componentDidMount() {
    //check ontology container exists and if not create it
    const askOntologyContainerQuery = "ASK {"+iri(VocabPlatform.OntologyContainer.value)+" rdf:type <http://www.w3.org/ns/ldp#Container>}";

    SparqlClient.ask(askOntologyContainerQuery)
        .onValue((res) => {
          this.setState({})
          if (!res) {
            new LdpService(VocabPlatform.RootContainer.value, this.context.semanticContext).addResource(
                graph([triple(iri(''), rdf.type, iri('http://www.w3.org/ns/ldp#Resource')),
                        triple(iri(''), rdf.type, iri('http://www.w3.org/ns/ldp#Container')),
                        triple(iri(''), rdfs.label, literal('Ontology Container')),
                        triple(iri(''), rdfs.comment, literal('Container to store resources of rdf:type owl:Ontology')),
                        ]),
                maybe.Just(VocabPlatform.OntologyContainer.value)
                ).onValue(res => this.setState({}));
          }
        });

    //check if ends in / before 
    // evaluate asynchronously the SPARQL select query
    new LdpService(VocabPlatform.OntologyContainer.value, this.context.semanticContext).addResource(
      graph([triple(iri(''), rdf.type, iri('http://www.w3.org/ns/ldp#Resource'))]),
      maybe.Just(this.props.ontologyIri)
    ).onValue(res => this.setState({}));
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
export type ontologyComponent = CreateNewOntologyResourceComponent;
export const ontologyComponent = CreateNewOntologyResourceComponent;
export const factory = createFactory(ontologyComponent);
export default ontologyComponent;
