/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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
import { Component } from 'react';
import * as D from 'react-dom-factories';
import ReactSelect from 'react-select';
import * as SparqlJs from 'sparqljs';
import * as _ from 'lodash';
import * as Kefir from 'kefir';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { getRepositoryStatus } from 'platform/api/services/repository';

import { TemplateItem } from 'platform/components/ui/template';
import { Spinner } from 'platform/components/ui/spinner';
import { SemanticNarrativeEditorProps } from './SemanticNarrativeEditor';

import { BottomToolbar } from 'ory-editor-ui';
import { SelectField, MenuItem, TextField } from 'material-ui';
import { AutoCompletionInput } from 'platform/components/ui/inputs';
import { ControlLabel, FormGroup, Col, Form } from 'react-bootstrap';


function getTypesFromRepository(repository: string, resource: Rdf.Iri): Kefir.Property<Array<Rdf.Iri>> {
  const TYPES_QUERY = new SparqlJs.Parser().parse(`SELECT DISTINCT ?type WHERE { ?__resource__ a ?type }`);
  return SparqlClient.select(
    SparqlClient.setBindings(TYPES_QUERY, {'__resource__': resource}),
    {context: {repository: repository}}
  ).map(result =>
    result.results.bindings.map(binding =>
      Rdf.iri(binding['type'].value)
    )
  );
}

function getTypes(resource: Rdf.Iri): Kefir.Property<Array<Rdf.Iri>> {
  return getRepositoryStatus().map(repos => repos.keySeq().toArray()).flatMap(repos =>
    Kefir.combine(
      repos.map(r =>
        getTypesFromRepository(r, resource)
      )
    )
  ).map(_.flatten).map(types =>
    _.uniqWith(types, (a, b) => a.equals(b))
  ).toProperty();
}


export interface DropTemplateConfigItem {
  id: string
  // URI of type template could be applied to
  type: string
  // Human-readable description of template
  label: string
  template: string
}

function selectTemplate(templates: DropTemplateConfigItem[], key: string): string {
  return templates.find(key ? tpl => tpl.id === key : tpl => true).template;
}

function findTemplatesForUri(
  dropTemplateConfig: DropTemplateConfigItem[], uri: string
): Kefir.Property<DropTemplateConfigItem[]> {
  return getTypes(Rdf.iri(uri)).map(types => {
    return dropTemplateConfig.filter(configItem =>
      (configItem.type === 'any' || _.find(types, t => t.value === configItem.type))
    );
  });
}


export interface ResourceState {
  readonly resourceIri: Rdf.Iri
  readonly relBinding?: SparqlClient.Binding
  readonly selectedTemplateKey?: string
}
interface Props {
  focused: boolean
  state: ResourceState
  readOnly: boolean
  onChange: (state: ResourceState) => void
  editorProps: SemanticNarrativeEditorProps
}

interface State {
  loading: boolean
  resourceTemplates?: DropTemplateConfigItem[]
}

export class SemanticNarrativeResource extends Component<Props, State> {
  static readonly className = 'ory-resource-component';

  constructor(props, context) {
    super(props, context);
    this.state = {
      loading: true,
    };
  }

  componentWillMount() {
    const urlValue = this.props.state.resourceIri.value;
    const {dropTemplateConfig} = this.props.editorProps;
    findTemplatesForUri(dropTemplateConfig, urlValue).onValue(templates => {
      this.setState({
        loading: false,
        resourceTemplates: templates
      });
    });
  }

  renderTemplate() {
    const {resourceIri, selectedTemplateKey} = this.props.state;
    const {resourceTemplates} = this.state;
    return <TemplateItem template={{
      source: selectTemplate(resourceTemplates, selectedTemplateKey),
      options: {iri: resourceIri},
    }} />;
  }

  renderEditor() {
    const {focused} = this.props;
    const {rdfaRelationQueryConfig} = this.props.editorProps;
    const {resourceTemplates} = this.state;

    const selectedTemplateKeyOuter = this.props.state.selectedTemplateKey ?
      this.props.state.selectedTemplateKey :
      resourceTemplates.find(() => true).id;
    const relBindingOuter = this.props.state.relBinding ? this.props.state.relBinding : {
      'label': Rdf.literal(rdfaRelationQueryConfig.defaultValueLabel),
      'value': Rdf.iri(rdfaRelationQueryConfig.defaultValue),
    };

    return <BottomToolbar open={focused}>
      <Form className='ory-resource-component-bottom-form'>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={4}>Display Entity as</Col>
          <Col sm={8}>
            <ReactSelect
              className='react-select-open-top'
              multi={false} clearable={false}
              options={...resourceTemplates.map(({id, type, label}) => ({value: id, label}))}
              value={selectedTemplateKeyOuter}
              placeholder='Display Entity as'
              onChange={(selected) => {
                if (Array.isArray(selected)) { return; }
                const selectedTemplateKey = selected.value as string;
                const {resourceIri, relBinding} = this.props.state;
                this.props.onChange({resourceIri, relBinding, selectedTemplateKey});
              }}
            />
          </Col>
        </FormGroup>
        <FormGroup>
          <Col componentClass={ControlLabel} sm={4}>Semantic Relation</Col>
          <Col sm={8}>
            <AutoCompletionInput
              className='react-select-open-top'
              {...rdfaRelationQueryConfig}
              autoload={true}
              value={relBindingOuter}
              actions={{
                onSelected: (relBinding: SparqlClient.Binding) => {
                  const {resourceIri, selectedTemplateKey} = this.props.state;
                  this.props.onChange({resourceIri, relBinding, selectedTemplateKey});
                },
              }}
            />
          </Col>
        </FormGroup>
      </Form>
    </BottomToolbar>;
  }

  render() {
    if (this.state.loading) {
      return <Spinner />;
    }
    if (this.props.editorProps.readOnly) {
      return this.renderTemplate();
    } else {
      return D.div({className: SemanticNarrativeResource.className},
        this.renderTemplate(),
        this.renderEditor(),
      );
    }
  }
}
