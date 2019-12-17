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
import * as _ from 'lodash';
import * as Immutable from 'immutable';
import { Alert, AlertConfig, AlertType } from 'platform/components/ui/alert';

import { Cancellation } from 'platform/api/async';
import { getLabel } from 'platform/api/services/resource-label';
import { Rdf, vocabularies } from 'platform/api/rdf';
import { addNotification } from 'platform/components/ui/notification';
import { refresh, navigateToResource } from 'platform/api/navigation';
import { RDFGraphStoreService } from 'platform/api/services/rdf-graph-store';

const { rdf, rdfs } = vocabularies;
const OWL_ONTOLOGY = Rdf.iri('http://www.w3.org/2002/07/owl#Ontology');

interface CreateOntologyState {
  alertState?: AlertConfig;
  iri: string;
  label: string;
  labelIsEdited: boolean;
}

interface CreateOntologyProps {
  /**
   * Optional post-action to be performed after a new ontology have been created.
   * Can be either 'reload' or 'redirect' (redirects to the newly created resource)
   * or any IRI string to which the form will redirect.
   */
  postAction?: 'none' | 'reload' | 'redirect';
}

/**
 * Component which allows users to create a new ontology
 * by defining IRI and rdf:label of ontology.
 */
export class CreateOntology extends React.Component<CreateOntologyProps, CreateOntologyState> {
  private readonly cancellation = new Cancellation();

  constructor(props: CreateOntologyProps, context: any) {
    super(props, context);

    this.state = {
      alertState: undefined,
      iri: '',
      label: '',
      labelIsEdited: false,
    };
    this.updateLabel();
  }

  updateLabel() {
    const {iri: rawIri, labelIsEdited} = this.state;
    const iri = normalizeIri(rawIri);
    if (iri && !labelIsEdited) {
      this.cancellation.map(
        getLabel(Rdf.iri(iri))
      ).observe({
        value: label => {
          this.setState({label});
        },
        error: () => {/* do nothging */}
      });
    }
  }

  createOntology() {
    const { iri, label } = this.state;
    const normalizedIri = normalizeIri(iri);
    const targetGraph = Rdf.iri(`${normalizedIri}/graph`);
    const ontologyIri = Rdf.iri(normalizeIri(iri));
    const repository = this.getRepository();

    const graphData = new Rdf.Graph(Immutable.Set([
      Rdf.triple(
        ontologyIri,
        rdf.type,
        OWL_ONTOLOGY
      ),
      Rdf.triple(
        ontologyIri,
        rdfs.label,
        Rdf.literal(label)
      ),
    ]));

    const createGraph = RDFGraphStoreService.createGraph({targetGraph, graphData, repository});

    this.cancellation.map(createGraph).observe({
      value: () => {
        addNotification({
          message: `Ontology ${normalizedIri} was successfully created!`,
          level: 'success',
        });
        this.setState({
          alertState: {
            alert: AlertType.SUCCESS,
            message: `Ontology ${normalizedIri} was successfully created!`,
          },
          iri: normalizedIri,
        }, () => {
          this.performPostAction();
        });
      },
      error: error => {
        addNotification({
          message:
            `Error has occurred during the ontology creation process ontology iri: ${normalizedIri}!`,
          level: 'error',
        });
        this.setState({
          alertState: {
            alert: AlertType.WARNING,
            message: error,
          },
          iri: normalizedIri,
        });
      },
    });
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  render() {
    const { alertState, iri, label } = this.state;
    const alert = this.state.alertState ? <Alert {...alertState}></Alert> : null;
    const iriIsCorrect = !iri || checkIri(iri);
    const caCreateOntology = iri && label && iriIsCorrect;
    const errorStyle = {
      borderColor: '#F04124',
      boxShadow: 'inset 0 1px 1px rgba(0, 0, 0, 0.075)',
    };
    return <div style={{
      display: 'flex',
      flexDirection: 'column',
    }}>
      {alert}
      <label>Ontology IRI</label>
      <input
        value={iri}
        placeholder={'Input new ontology IRI...'}
        title={'New ontology IRI'}
        onChange={event => {
          this.setState({iri: event.target.value, alertState: null}, () => {
            this.updateLabel();
          });
        }}
        className='plain-text-field__text form-control'
        style={!iriIsCorrect ? errorStyle : {}}
      />
      <label>Ontology label</label>
      <input
        value={label}
        placeholder={'Input ontology label...'}
        title={'New ontology label'}
        onChange={event => {
          this.setState({
            label: event.target.value,
            labelIsEdited: true,
            alertState: null
          });
        }}
        className='plain-text-field__text form-control'/>
      <div style={{marginTop: 10}}>
        <button
          disabled={!caCreateOntology}
          type='button'
          title={caCreateOntology ? `Create ontology ${iri}` : iriIsCorrect ? 'You should fill all fields' : 'Iri is incorrect'}
          onClick={() => {
            this.createOntology();
          }}
          className='btn btn-primary'>
          Create new Ontology
        </button>
      </div>
    </div>;
  }

  private getRepository() {
    return this.context && this.context.semanticContext && this.context.semanticContext.repository ?
      this.context.semanticContext.repository : 'default';
  }

  /**
   * Performs either a reload (default) or an redirect after the form as been submited
   * and the data been saved.
   */
  private performPostAction = (): void => {
    const { postAction } = this.props;
    const { iri } = this.state;

    if (postAction === 'none') { return; }

    if (!postAction || postAction === 'reload') {
      refresh();
    } else if (this.props.postAction === 'redirect') {
      navigateToResource(
        new Rdf.Iri(iri),
        getPostActionUrlQueryParams(this.props)
      ).onValue(v => v);
    } else {
      let params = getPostActionUrlQueryParams(this.props);
      params['ontologyIri'] = iri;
      navigateToResource(
        Rdf.iri(this.props.postAction),
        params
      ).onValue(v => v);
    }
  }
}

function normalizeIri(rawIri: string) {
  if (!rawIri) { return undefined; }
  let url: URL;

  try { // normalize path
    url = new URL(rawIri); // The exception could be throw here if rawIri is not URL
    url.pathname = url.pathname.split('/').filter(token => Boolean(token)).join('/');
    if (!url.pathname) { url.pathname = '/'; }
    rawIri = decodeURIComponent(url.href);
  } catch { /* do nothing */ }

  if (rawIri.endsWith('#')) {
    return rawIri.substring(0, rawIri.length - 1);
  } else {
    return rawIri;
  }
}

function checkIri(iri: string) {
  try {
    if (!iri) {
      return false;
    }
    let path = new URL(iri).pathname || '';
    if (path.startsWith('/')) {
      path = path.substring(1, path.length);
    }
    if (path.endsWith('/')) {
      path = path.substring(0, path.length - 1);
    }
    return !path || path.split('/').filter(token => !Boolean(token)).length === 0;
  } catch {
    return false;
  }
}

export default CreateOntology;

const POST_ACTION_QUERY_PARAM_PREFIX = 'urlqueryparam';

/**
 * Extracts user-defined `urlqueryparam-<KEY>` query params from
 * a form configuration to provide them on post action navigation.
 */
function getPostActionUrlQueryParams(props: CreateOntologyProps) {
  const params: { [paramKey: string]: string } = {};

  for (const key in props) {
    if (Object.hasOwnProperty.call(props, key)) {
      if (key.indexOf(POST_ACTION_QUERY_PARAM_PREFIX) === 0) {
        const queryKey = key.substring(POST_ACTION_QUERY_PARAM_PREFIX.length).toLowerCase();
        params[queryKey] = props[key];
      }
    }
  }

  return params;
}
