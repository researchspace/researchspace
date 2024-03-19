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
import * as React from 'react';
import { Button } from 'react-bootstrap';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { AutoCompletionInput } from 'platform/components/ui/inputs';

import { FieldDefinition, getPreferredLabel } from '../FieldDefinition';
import { FieldValue, AtomicValue, EmptyValue } from '../FieldValues';
import { NestedModalForm, tryExtractNestedForm } from './NestedModalForm';
import {
  SingleValueInput, AtomicValueInput, AtomicValueInputProps,
} from './SingleValueInput';
import { createDropAskQueryForField } from '../ValidationHelpers';
import { ValidationMessages } from './Decorations';
import Icon from 'platform/components/ui/icon/Icon';
import ResourceLinkContainer from 'platform/api/navigation/components/ResourceLinkContainer';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { DropdownButton, MenuItem } from 'react-bootstrap';
import { RdfLiteral } from 'platform/ontodia/src/ontodia';


type nestedFormEl = {
  label?: string,
  nestedForm?: string  
}

export interface AutocompleteInputProps extends AtomicValueInputProps {
  template?: string;
  placeholder?: string;
  nestedFormTemplate?: string;
  minimumInput?: number;
  showLinkResourceButton?: boolean;
  nestedFormTemplates?: nestedFormEl[];
}

interface SelectValue {
  value: Rdf.Node;
  label: Rdf.Literal;
}

interface State {
  nestedForm?: React.ReactElement<any>;
  nestedFormOpen?: boolean;
  activeForm?: string;
  nestedFormTemplates?: nestedFormEl[];
  labelFormSelected?: string;
  
}

const CLASS_NAME = 'autocomplete-text-field';
const MINIMUM_LIMIT = 3;
const DEFAULT_TEMPLATE = `<span title="{{label.value}}">{{label.value}}</span>`;

const SPARQL_QUERY = SparqlUtil.Sparql`
  SELECT DISTINCT ?config ?resourceRestrictionPattern WHERE {
    {
      ?__resourceIri__ (rdf:type/(rdfs:subClassOf*)) ?resourceOntologyClass.
      ?config rdf:type Platform:resource_configuration;
        <http://www.researchspace.org/pattern/system/resource_configuration/resource_ontology_class> ?resourceOntologyClass.
      FILTER(NOT EXISTS { ?config <http://www.researchspace.org/pattern/system/resource_configuration/resource_type> ?resourceP2Type. })
      OPTIONAL { ?config <http://www.researchspace.org/pattern/system/resource_configuration/resource_restriction_sparql_pattern> ?resourceRestrictionPattern . }
    }
    UNION
    {
      ?__resourceIri__ rdf:type ?resourceOntologyClass;
        crm:P2_has_type ?resourceP2Type.
      ?config rdf:type Platform:resource_configuration;
        <http://www.researchspace.org/pattern/system/resource_configuration/resource_ontology_class> ?resourceOntologyClass;
        <http://www.researchspace.org/pattern/system/resource_configuration/resource_type> ?resourceP2Type .
    OPTIONAL { ?config <http://www.researchspace.org/pattern/system/resource_configuration/resource_restriction_sparql_pattern> ?resourceRestrictionPattern . }
    }
  }
`

export class AutocompleteInput extends AtomicValueInput<AutocompleteInputProps, State> {
  private tupleTemplate: string = null;
  private htmlElement = React.createRef<HTMLDivElement>();
  

  constructor(props: AutocompleteInputProps, context: any) {
    super(props, context);
    this.state = { 
      nestedFormOpen: false ,
      nestedFormTemplates: []
    };
    this.tupleTemplate = this.tupleTemplate || this.compileTemplate();
  }

  private compileTemplate() {
    return this.props.template ? this.props.template.replace(/\\/g, '') : DEFAULT_TEMPLATE;
  }

  componentDidMount() {
    if(!_.isEmpty(this.props.nestedFormTemplates)) {
      this.setState({
        nestedFormTemplates: this.props.nestedFormTemplates
      })
    }
  }

  private openSelectedNestedForm(formTemplate: string) {
    tryExtractNestedForm(this.props.children, this.context, formTemplate)
      .then(nestedForm => {
        if (nestedForm != undefined) {
         this.setState({nestedForm});
          this.toggleNestedForm()
        }
      });
  }

  private buildResourceFormIriQuery(queryResultBindings: SparqlClient.Bindings, iri: Rdf.Iri) {
    const UNION_QUERY = []
    _.forEach(queryResultBindings, (b) => {
      UNION_QUERY.push(
        `{ 
          BIND(${iri} AS ?item)
            BIND(<${b.config.value}> AS ?config)
            ${b.resourceRestrictionPattern ? b.resourceRestrictionPattern.value : ''}
            ?config <http://www.researchspace.org/pattern/system/resource_configuration/resource_form> ?resourceFormIRI .
        }`
      )
    })

    return `SELECT ?resourceFormIRI WHERE { ${UNION_QUERY.join('UNION')} }`
  }

  private findAndOpenNestedForm(queryResultBindings: SparqlClient.Bindings, iri: Rdf.Iri) {
    const RESOURCE_FORM_IRI_QUERY = this.buildResourceFormIriQuery(queryResultBindings, iri)
    SparqlClient.select(RESOURCE_FORM_IRI_QUERY, {context: this.context.semanticContext})
    .onValue((fr) => {
      const resourceFormIri = fr.results.bindings[0].resourceFormIRI.value
      this.openSelectedNestedForm(`{{> "${resourceFormIri}" nested=true editable=true mode="edit" }}`)      
      })
    .onError((err) => console.error('Error during resource form query execution ',err))
  }

  private onEditHandler(iri: Rdf.Iri) {
    if(iri) {
      const query = SparqlClient.setBindings(SPARQL_QUERY, { __resourceIri__: iri});
      SparqlClient.select(query, {context: this.context.semanticContext})
        .onValue((r) => this.findAndOpenNestedForm(r.results.bindings, iri))
        .onError((err) => console.error('Error during query execution ',err))
    }
  }

  private onDropdownSelectHandler(label: string) {
    const nestedFormTemplateSelected = this.state.nestedFormTemplates.filter((e) => e.label === label)[0].nestedForm
    this.setState({
      labelFormSelected: label
    })
    this.openSelectedNestedForm(nestedFormTemplateSelected)
  }

  render() {
    const rdfNode = FieldValue.asRdfNode(this.props.value);
    const value = FieldValue.isAtomic(this.props.value)
      ? {
          value: rdfNode,
          label: Rdf.literal(this.props.value.label || rdfNode.value),
        }
      : undefined;
    return (
      <div className={CLASS_NAME} ref={this.htmlElement}>
        {this.renderSelect(value)}
        <ValidationMessages errors={FieldValue.getErrors(this.props.value)} />
        {this.state.nestedFormOpen ? (
          <NestedModalForm
            subject={
            FieldValue.isEmpty(this.props.value) ? null : this.props.value.value as Rdf.Iri
            }
            title={value?.label.value ?? this.state.labelFormSelected}
            definition={this.props.definition}
            onSubmit={this.onNestedFormSubmit}
            onCancel={() => this.setState({ nestedFormOpen: false })}
            parent={this.htmlElement}
          >
            {this.state.nestedForm}
          </NestedModalForm>
        ) : null}
      </div>
    );
  }

  private onNestedFormSubmit = (value: AtomicValue) => {
    this.setState({ nestedFormOpen: false });
    this.setAndValidate(value);
  };

  private renderSelect(value: any) {
    const definition = this.props.definition;
    const placeholder =
      typeof this.props.placeholder === 'undefined'
        ? this.createDefaultPlaceholder(definition)
        : this.props.placeholder;

    const showLinkResourceButton = this.props.showLinkResourceButton ?? true
    const showEditButton = value !== undefined
    const showCreateNewDropdown = !_.isEmpty(this.state.nestedFormTemplates) && this.state.nestedFormTemplates.length > 1 && !showEditButton;
    const showCreateNewButton = !_.isEmpty(this.state.nestedFormTemplates) && this.state.nestedFormTemplates.length === 1 && !showEditButton;

    return (
      <div className={`${CLASS_NAME}__main-row`}>
        <AutoCompletionInput
          key={definition.id}
          className={`${CLASS_NAME}__select`}
          autofocus={false}
          query={this.props.definition.autosuggestionPattern}
          placeholder={placeholder}
          droppable={{
            // enable droppable for autocomplete input
            query: createDropAskQueryForField(definition),
            styles: {
              enabled: {
                outline: '2px dashed var(--color-dark)'
              },
              enabledHover: {
                outline: '4px dashed var(--color-dark)'
              },
              disabled: {}
            }
          }}
          value={value}
          templates={{ suggestion: this.tupleTemplate }}
          actions={{
            // TODO due to the typing in AutocompleteInput, this accepts only a Dictionary<Rdf.Node>
            // however, what will be passed in is a SelectValue
            onSelected: this.onChange as (val: any) => void,
          }}
          minimumInput={this.props.minimumInput || MINIMUM_LIMIT}
        />
        { showCreateNewButton && (
          <Button className={`${CLASS_NAME}__create-button btn-textAndIcon`} onClick={() => this.onDropdownSelectHandler(this.state.nestedFormTemplates[0].label)}>
            <Icon iconType='round' iconName='add_box'/>
            <span>New</span>
          </Button>
        )}
        { showCreateNewDropdown && (
          <DropdownButton title="New" pullRight id="add-form" onSelect={(label) => this.onDropdownSelectHandler(label)}>
            {this.state.nestedFormTemplates.map((e) => {
                return (<MenuItem key={e.label} eventKey={e.label}>{e.label}</MenuItem>)
              }
            )}
          </DropdownButton>
        )}
        { showEditButton && 
          <Button className={`${CLASS_NAME}__create-button btn-textAndIcon`} onClick={() => {this.onEditHandler(value.value as Rdf.Iri)}}>
            <Icon iconType='round' iconName='edit'/>
            <span>Edit</span>
          </Button>
        }
        {showLinkResourceButton && !FieldValue.isEmpty(this.props.value) && 
          <ResourceLinkContainer 
            uri="http://www.researchspace.org/resource/ThinkingFrames" 
            urlqueryparam-view="entity-editor"
            urlqueryparam-resource={(this.props.value.value as Rdf.Iri).value}
          >
            <Button className={`${CLASS_NAME}__open-in-new-tab`} title='Open in new tab'>
              <Icon iconType='round' iconName='open_in_new' />
            </Button>
        </ResourceLinkContainer>
        }
      </div>
    );
  }

  private toggleNestedForm = () => {
    this.setState((state): State => ({ nestedFormOpen: !state.nestedFormOpen }));
  };

  private onChange = (selected: SelectValue | null): void => {
    let value: AtomicValue | EmptyValue;
    if (selected) {
      value = FieldValue.fromLabeled({
        value: selected.value,
        label: selected.label.value,
      });
    } else {
      value = FieldValue.empty;
    }
    this.setState({ nestedFormOpen: false });
    this.setAndValidate(value);
  };

  private createDefaultPlaceholder(definition: FieldDefinition): string {
    const fieldName = (getPreferredLabel(definition.label) || 'entity').toLocaleLowerCase();
    return `Search and select ${fieldName} here...`;
  }

  static makeHandler = AtomicValueInput.makeAtomicHandler;
}

SingleValueInput.assertStatic(AutocompleteInput);

export default AutocompleteInput;
