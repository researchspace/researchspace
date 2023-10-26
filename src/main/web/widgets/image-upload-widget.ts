/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { Component, createElement } from 'react';
import * as React from 'react';
import * as D from 'react-dom-factories';
import * as assign from 'object-assign';
import * as maybe from 'data.maybe';
import * as Kefir from 'kefir';
import * as _ from 'lodash';
import * as ReactBootstrap from 'react-bootstrap';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

import {
  FieldDefinitionProp,
  FieldValue,
  CompositeValue,
  PlainTextInput,
  PlainTextInputProps,
  SelectInput,
  AutocompleteInput,
  DatePickerInput,
  DatePickerInputProps,
  ResourceEditorForm,
  ResourceEditorFormProps,
} from 'platform/components/forms';

import { Alert, AlertConfig, AlertType } from 'platform/components/ui/alert';
import { Dropzone } from 'platform/components/ui/dropzone';
import { FileUploadService } from 'platform/api/services/file-upload';

const ProgressBar = React.createFactory(ReactBootstrap.ProgressBar);

import './image-upload-widget.scss';

interface Props {
  config: {
    createResourceQuery: string;
    generateIdQuery: string;
    storage: string;
    metadataExtractor: string;
    contextUri: string;
    description: string;
    contentType: string;
  };
}

interface State {
  alertState?: AlertConfig;
  progress?: number;
  resourceUri?: string;
  files: File[];
}

const FORM_FIELDS: FieldDefinitionProp[] = [
  { id: 'title', label: 'Title', minOccurs: 1, maxOccurs: 1, xsdDatatype: 'xsd:string' },
  {
    id: 'person',
    label: 'Digitized By',
    maxOccurs: 1,
    xsdDatatype: 'xsd:anyURI',
    autosuggestionPattern: `prefix owl: <http://www.w3.org/2002/07/owl#>
    prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    prefix bds: <http://www.bigdata.com/rdf/search#>
    prefix rso: <http://www.researchspace.org/ontology/>
    prefix crm: <http://www.cidoc-crm.org/cidoc-crm/>

    SELECT DISTINCT ?value ?label ?type WHERE {
      ?value rso:displayLabel ?label .
      ?value rdf:type ?type .
      ?type rdfs:subClassOf* crm:E39_Actor .
      SERVICE <http://www.bigdata.com/rdf/search#search> {
        ?label bds:search '*?token*' ;
          bds:relevance ?score .
      }
    } ORDER BY ?score`,
  },
  { id: 'date', label: 'Date', maxOccurs: 1, xsdDatatype: 'xsd:dateTime' },
  {
    id: 'type',
    label: 'Type',
    maxOccurs: 1,
    xsdDatatype: 'xsd:anyURI',
    valueSetPattern: `select ?value ?label where {
      values(?value ?label) {
        (<http://collection.britishmuseum.org/id/thesauri/imgtype/scan> \'Scan\')
        (<http://collection.britishmuseum.org/id/thesauri/imgtype/2d> \'2D\')
        (<http://collection.britishmuseum.org/id/thesauri/imgtype/3d> \'3D\')
       }
     }
      `,
  },
  {
    id: 'owner',
    label: 'Owner',
    maxOccurs: 1,
    xsdDatatype: 'xsd:anyURI',
    autosuggestionPattern: `prefix owl: <http://www.w3.org/2002/07/owl#>
    prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    prefix bds: <http://www.bigdata.com/rdf/search#>
    prefix rso: <http://www.researchspace.org/ontology/>
    prefix crm: <http://www.cidoc-crm.org/cidoc-crm/>

    SELECT DISTINCT ?value ?label ?type WHERE {
      ?value rso:displayLabel ?label .
      ?value rdf:type ?type .
      ?type rdfs:subClassOf* crm:E39_Actor .
      SERVICE <http://www.bigdata.com/rdf/search#search> {
        ?label bds:search '*?token*' ;
          bds:relevance ?score .
      }
    } ORDER BY ?score`,
  },
  { id: 'copyright', label: 'Copyright', maxOccurs: 1, xsdDatatype: 'xsd:string' },
  { id: 'description', label: 'Description', maxOccurs: 1, xsdDatatype: 'xsd:string' },
  {
    id: 'scientificType',
    label: 'Scientific Type',
    maxOccurs: 1,
    xsdDatatype: 'xsd:anyURI',
    valueSetPattern: `select ?value ?label where {
      values(?value ?label) {
        (<http://collection.britishmuseum.org/id/thesauri/scitype/xray> 'X-Ray')
        (<http://collection.britishmuseum.org/id/thesauri/scitype/uv> 'Ultra Violet')
        (<http://collection.britishmuseum.org/id/thesauri/scitype/ir> 'Infra Red')
        (<http://collection.britishmuseum.org/id/thesauri/scitype/color> 'Visible light')
      }
    }`,
  },
  { id: 'width', label: 'Width', maxOccurs: 1, xsdDatatype: 'xsd:decimal' },
  { id: 'height', label: 'Height', maxOccurs: 1, xsdDatatype: 'xsd:decimal' },
  {
    id: 'unit',
    label: 'Unit',
    maxOccurs: 1,
    xsdDatatype: 'xsd:anyURI',
    valueSetPattern: `select ?value ?label where {
      values(?value ?label) {
        (<http://collection.britishmuseum.org/id/thesauri/unit/mm> 'Millimeters')
        (<http://collection.britishmuseum.org/id/thesauri/unit/px> 'Pixels')
      }
    }`,
  },
  {
    id: 'depicts',
    label: 'Depicts',
    maxOccurs: 1,
    xsdDatatype: 'xsd:anyURI',
    autosuggestionPattern: `prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    prefix bds: <http://www.bigdata.com/rdf/search#>
    prefix rso: <http://www.researchspace.org/ontology/>

    SELECT DISTINCT ?value ?label WHERE {
      ?value a rso:Concept;
        rso:displayLabel ?label .
      SERVICE <http://www.bigdata.com/rdf/search#search> {
        ?label bds:search '*?token*' ;
          bds:relevance ?score .
      }
    } ORDER BY ?score`,
  },
  {
    id: 'subjects',
    label: 'Carries subject',
    maxOccurs: 1,
    xsdDatatype: 'xsd:anyURI',
    autosuggestionPattern: `prefix owl: <http://www.w3.org/2002/07/owl#>
    prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    prefix bds: <http://www.bigdata.com/rdf/search#>
    prefix rso: <http://www.researchspace.org/ontology/>
    prefix crm: <http://www.cidoc-crm.org/cidoc-crm/>

    SELECT DISTINCT ?value ?label ?type WHERE {
      ?value rso:displayLabel ?label .
      ?value rdf:type ?type .
      ?type rdfs:subClassOf* crm:E24_Physical_Man-Made_Thing .
      SERVICE <http://www.bigdata.com/rdf/search#search> {
        ?label bds:search '*?token*' ;
          bds:relevance ?score .
      }
    } ORDER BY ?score`,
  },
  {
    id: 'refers',
    label: 'Refers To',
    maxOccurs: 1,
    xsdDatatype: 'xsd:anyURI',
    autosuggestionPattern: `prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    prefix bds: <http://www.bigdata.com/rdf/search#>
    prefix rso: <http://www.researchspace.org/ontology/>

    SELECT DISTINCT ?value ?label WHERE {
      ?value rso:displayLabel ?label .
      SERVICE <http://www.bigdata.com/rdf/search#search> {
        ?label bds:search '*?token*' ;
          bds:relevance ?score .
      }
    } ORDER BY ?score`,
  },
  {
    id: 'about',
    label: 'Is about',
    maxOccurs: 1,
    xsdDatatype: 'xsd:anyURI',
    autosuggestionPattern: `prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    prefix bds: <http://www.bigdata.com/rdf/search#>
    prefix rso: <http://www.researchspace.org/ontology/>

    SELECT DISTINCT ?value ?label WHERE {
      ?value rso:displayLabel ?label .
      SERVICE <http://www.bigdata.com/rdf/search#search> {
        ?label bds:search '*?token*' ;
          bds:relevance ?score .
      }
    } ORDER BY ?score`,
  },
];

class ImageUploadWidget extends Component<Props, State> {
  private messages: Kefir.Pool<string>;

  constructor(props: Props) {
    super(props);
    this.state = {
      files: [],
    };
  }

  componentDidMount() {
    this.messages = Kefir.pool<string>();
    this.messages.onValue((v) => {
      const message = this.state.alertState ? this.state.alertState.message : '';
      this.setState(
        assign({}, this.state, {
          alertState: {
            alert: AlertType.WARNING,
            message: message + v,
          },
        })
      );
    });
  }

  private onDrop(files: File[]) {
    this.setState(assign({}, this.state, { files: files }));
  }

  private submit(fieldValues: CompositeValue): Kefir.Property<void> {
    if (this.state.files.length === 0) {
      this.messages.plug(Kefir.constant('You have selected no images.<br>'));
      return;
    }

    const title = fieldValues.fields.get('title');
    if (!title || title.values.size === 0) {
      this.messages.plug(Kefir.constant('Please fill in title to proceed with image upload.<br>'));
      return;
    }

    const file = this.state.files[0];
    const contentType =
      _.isEmpty(this.props.config) || _.isEmpty(this.props.config.contentType)
        ? FileUploadService.getMimeType(file)
        : this.props.config.contentType;

    const createResourceQuery = SparqlUtil.serializeQuery(
      parametrizeQueryWithFormValues(this.props.config.createResourceQuery, fieldValues)
    );

    return FileUploadService.uploadFile({
      createResourceQuery,
      generateIdQuery: this.props.config.generateIdQuery,
      storage: this.props.config.storage,
      metadataExtractor: this.props.config.metadataExtractor,
      contextUri: this.props.config.contextUri,
      file: file,
      contentType: contentType,
      onProgress: (percent) =>
        this.setState(
          assign({}, this.state, {
            progress: percent,
          })
        ),
    })
      .map((newImageIri) => {
        this.messages.plug(Kefir.constant('File: ' + file.name + ' uploaded.<br/>'));
        window.location.reload();
      })
      .mapErrors((error) => this.messages.plug(Kefir.constant('File: ' + file.name + ' failed (' + error + ').<br/>')));
  }

  render() {
    const progress = maybe.fromNullable(this.state.progress);

    const description =
      _.isEmpty(this.props.config) || _.isEmpty(this.props.config.description)
        ? 'Please drag & drop your image file here or click to browse the file system.'
        : this.props.config.description;

    return D.div(
      { className: 'iiif-upload__holder' },
      this.state.alertState ? createElement(Alert, this.state.alertState) : null,
      progress.map((progress) => ProgressBar({ active: true, min: 0, max: 100, now: progress })).getOrElse(null),
      createElement(
        Dropzone,
        {
          className: 'iiif-upload__dropzone',
          onDrop: this.onDrop.bind(this),
          multiple: false,
        },
        D.div({ className: 'iiif-upload__description' }, D.p({}, description)),
        D.button(
          {
            className: 'iiif-upload__dropzone-button btn btn-sm btn-default',
          },
          'Browse'
        )
      ),
      this.state.files.map((file) => D.h4({ key: file.name }, 'Selected file: ' + file.name)),
      createElement(
        ResourceEditorForm,
        {
          fields: FORM_FIELDS,
          persistence: {
            persist: (intialModel, model) => {
              if (FieldValue.isEmpty(model)) {
                return;
              }
              return this.submit(model);
            },
          },
        } as ResourceEditorFormProps,
        React.createElement<PlainTextInputProps>(PlainTextInput, { for: 'title', placeholder: 'Type title here' }),
        React.createElement(AutocompleteInput, { for: 'person' }),
        React.createElement<DatePickerInputProps>(DatePickerInput, { for: 'date', mode: 'date' }),
        React.createElement(SelectInput, { for: 'type' }),
        React.createElement(AutocompleteInput, { for: 'owner' }),
        React.createElement(PlainTextInput, { for: 'copyright' }),
        React.createElement<PlainTextInputProps>(PlainTextInput, { for: 'description', multiline: true }),
        React.createElement(SelectInput, { for: 'scientificType' }),
        React.createElement(PlainTextInput, { for: 'width' }),
        React.createElement(PlainTextInput, { for: 'height' }),
        React.createElement(SelectInput, { for: 'unit' }),
        React.createElement(AutocompleteInput, { for: 'depicts' }),
        React.createElement(AutocompleteInput, { for: 'subjects' }),
        React.createElement(AutocompleteInput, { for: 'refers' }),
        React.createElement(AutocompleteInput, { for: 'about' }),
        D.button(
          { className: 'btn btn-sm btn-success iiif-upload__submit-button pull-right', name: 'submit' },
          'Submit'
        ),
        D.button(
          {
            className: 'btn btn-sm btn-default iiif-upload__cancel-button pull-right',
            onClick: () => window.location.reload(),
          },
          'Cancel'
        )
      ),
      this.state.alertState ? createElement(Alert, this.state.alertState) : null,
      progress.map((progress) => ProgressBar({ active: true, min: 0, max: 100, now: progress })).getOrElse(null)
    );
  }
}

function parametrizeQueryWithFormValues(createResourceQuery: string, fieldValues: CompositeValue) {
  const initialQuery = SparqlUtil.parseQuery(createResourceQuery);
  if (initialQuery.type !== 'query') {
    throw new Error('createResourceQuery must be a SELECT or CONSTRUCT query');
  }
  const resultQuery = fieldValues.fields.reduce((query, { values }, fieldId) => {
    const bindings = values
      .filter(FieldValue.isAtomic)
      .map(FieldValue.asRdfNode)
      .map((value) => ({ [fieldId]: value } as _.Dictionary<Rdf.Node>))
      .toArray();
    return SparqlClient.prepareParsedQuery(bindings)(query);
  }, initialQuery);
  return resultQuery;
}

export type c = ImageUploadWidget;
export const c = ImageUploadWidget;
export const f = React.createFactory(c);
export default c;
