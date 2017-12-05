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

import * as React from 'react';
import { each } from 'lodash';
import { Just } from 'data.maybe';

import { Rdf, XsdDataTypeValidation, vocabularies } from 'platform/api/rdf';
import { SparqlUtil, SparqlClient } from 'platform/api/sparql';

import { isValidChild } from 'platform/components/utils';

import {
  SemanticForm, CompositeValue, FieldDefinitionProp, FieldValue, DataState, readyToSubmit,
  FieldDefinition, normalizeFieldDefinition, FieldError, ErrorKind,
} from 'platform/components/forms';

import { InitialQueryContext, InitialQueryContextTypes } from './SemanticSearchApi';
import { setSearchDomain } from '../commons/Utils';

export interface FormQueryProps {
  /**
   * Query template for form parametrization. Each query argument must have
   * corresponding form field definition.
   */
  queryTemplate: QueryTemplate;
  /**
   * Definitions for form fields.
   *
   * - `maxOccurs` will be overridden to 1;
   * - `minOccurs` will be overridden to 0 or 1 depending on whether
   * corresponding query argument is optional or not.
   */
  fields: FieldDefinitionProp[];

  /**
   * Specify search domain category IRI (full IRI enclosed in <>). Required, if component is used together with facets.
   */
  domain?: string

  domainField?: string
}

export interface QueryTemplate {
  queryString: string;
  arguments: { [id: string]: QueryTemplateArgument };
}

export interface QueryTemplateArgument {
  type: string;
  optional?: boolean;
}

interface State {
  readonly definitions?: ReadonlyArray<FieldDefinition>;
  readonly model?: CompositeValue;
  readonly modelState?: DataState;
}

/**
 * Virtual subject for search form to make sure that it sends `selectPattern` queries to
 * simulate default values for fields. Currently the form assumes as an optimization
 * that every field is empty because form subject is a placeholder (subject IRI == <>).
 */
const PLACEHOLDER_SUBJECT = Rdf.iri(vocabularies.VocabPlatform._NAMESPACE + 'FormQuerySubject');

/**
 * Form-based query formulation component, where the fields in the form
 * are used to provide values for a parameterized query (template).
 *
 * @example
 *  <semantic-search-form-query
 *    query-template='{
 *      "queryString": "SELECT * WHERE { ?s a ?type }",
 *      "arguments": {
 *        "type": {"type": "xsd:anyURI"},
 *        "label": {"type": "xsd:string"},
 *      }
 *    }'
 *    fields='[
 *      {
 *        "id": "type",
 *        "label": "Type",
 *        "description": "The type of the instance",
 *        "xsdDatatype": "xsd:anyURI",
 *        "minOccurs": "1",
 *        "maxOccurs": "2",
 *        "valueSetPattern": "SELECT $value $label WHERE { VALUES ($value $label)
 *        { (<http://www.cidoc-crm.org/cidoc-crm/E22_Man-Made_Object> \"Man Made Object\")
 *        (<http://www.cidoc-crm.org/cidoc-crm/E73_Information_Object> \"Information Object\") } }",
 *        "selectPattern": "SELECT $value WHERE { $subject a $value }"
 *      },
 *      {"id": "label", "label": "Label", "xsdDatatype": "xsd:string"}
 *    ]'>
 *      <semantic-form-select-input for="type"></semantic-form-select-input>
 *      <semantic-form-text-input for="label"></semantic-form-text-input>
 *      <button type='button' name='submit' className='btn btn-default'>Search</button>
 *  </semantic-search-form-query>
 */
export class FormQuery extends React.Component<FormQueryProps, State> {
  static readonly contextTypes = InitialQueryContextTypes;
  context: InitialQueryContext;

  private form: SemanticForm;

  constructor(props: FormQueryProps) {
    super(props);
    this.state = {
      definitions: adjustDefinitionsToTemplate(this.props.queryTemplate, this.props.fields),
    };
  }

  componentWillReceiveProps(props: FormQueryProps, context: InitialQueryContext) {
    if (context.searchProfileStore.isJust && context.domain.isNothing) {
      setSearchDomain(props.domain, context);
    }
  }

  render() {
    return (
      <SemanticForm ref={this.setFormRef}
        fields={this.state.definitions}
        model={this.state.model || FieldValue.fromLabeled({value: PLACEHOLDER_SUBJECT})}
        onChanged={this.onFormChanged}
        onLoaded={this.onFormLoaded}
        onUpdated={this.onFormStateChanged}>
        {this.mapChildren(this.props.children)}
      </SemanticForm>
    );
  }

  private setFormRef = (form: SemanticForm) => {
    this.form = form;
  }

  private onFormChanged = (model: CompositeValue) => {
    this.setState({model});
  }

  private onFormLoaded = (model: CompositeValue) => {
    const {queryTemplate} = this.props;

    const validationErrors: FieldError[] = [];
    each(queryTemplate.arguments, (argument, argumentId) => {
      const field = model.definitions.get(argumentId);
      validateArgumentAndField(argumentId, argument, field, validationErrors);
    });

    this.setState({
      model: CompositeValue.set(model, {
        errors: model.errors.concat(validationErrors),
      })
    });
  }

  private onFormStateChanged = (modelState: DataState) => {
    this.setState({modelState});
  }

  private mapChildren = (children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, element => {
      if (!isValidChild(element)) { return element; }
      const {type, props} = element;

      if (type === 'button') {
        if (props.name === 'submit') {
          return React.cloneElement(element, {
            disabled: !this.canSubmit(this.state.model),
            onClick: this.executeSearch,
          });
        }
      }

      if ('children' in props && props.children.length > 0) {
         return React.cloneElement(element, {}, this.mapChildren(props.children));
      }

      return element;
    });
  }

  private executeSearch = () => {
    const model = this.form.validate(this.state.model);
    this.setState({model});

    if (!this.canSubmit(model)) { return; }

    if (this.props.domainField) {
      setSearchDomain(
        '<' + FieldValue.asRdfNode(
          model.fields.get(this.props.domainField).values.first()
        ).value + '>', this.context
      );
    }

    const parametrized = parametrizeQueryFromForm(
      this.props.queryTemplate, model);

    return this.context.setBaseQuery(Just(parametrized));
  }

  private canSubmit(model: CompositeValue) {
    return this.state.modelState === DataState.Ready
      && readyToSubmit(model, error => true);
  }
}

function adjustDefinitionsToTemplate(queryTemplate: QueryTemplate, defs: FieldDefinitionProp[]) {
  return defs.map(normalizeFieldDefinition)
    .map<FieldDefinition>(def => {
      const argument = queryTemplate.arguments[def.id];
      if (!argument) { return def; }
      return {...def, maxOccurs: 1, minOccurs: argument.optional ? 0 : 1};
    });
}

/**
 * Performs configuration validation for query `argument` with ID `argumentId`
 * and corresponding field definition `field` and writes any detected errors
 * into `validationErrors`.
 *
 * Currently checks for:
 * - missing field definition for argument;
 * - invalid XSD datatype for query argument;
 * - mismatched datatypes of query argument and field definition.
 */
function validateArgumentAndField(
  argumentId: string,
  argument: QueryTemplateArgument,
  field: FieldDefinition,
  validationErrors: FieldError[],
) {
  if (!field) {
    validationErrors.push({
      kind: ErrorKind.Configuration,
      message: `Missing field definition or input for argument '${argumentId}'`,
    });
    return;
  }

  const argumentType = XsdDataTypeValidation.parseXsdDatatype(argument.type);
  if (argumentType) {
    if (!XsdDataTypeValidation.sameXsdDatatype(argumentType.iri, field.xsdDatatype)) {
      validationErrors.push({
        kind: ErrorKind.Configuration,
        message: `Mismatched argument type ${argumentType.iri} and field type ${field.xsdDatatype}`,
      });
    }
  } else {
    validationErrors.push({
      kind: ErrorKind.Configuration,
      message: `Invalid XSD datatype '${argument.type}' for argument '${argumentId}'`,
    });
  }
}

function parametrizeQueryFromForm(
  queryTemplate: QueryTemplate, model: CompositeValue,
): SparqlJs.SelectQuery {
  const queryArguments = queryTemplate.arguments;
  const bindings: SparqlClient.Dictionary<Rdf.Node> = {};
  for (const argumentID in queryArguments) {
    if (!queryArguments.hasOwnProperty(argumentID)) { continue; }
    const argument = queryArguments[argumentID];

    const fieldState = model.fields.get(argumentID);
    const values = fieldState.values;

    if (values.size === 0) {
      if (argument.optional) { continue; }
      throw new Error(`No field value for query argument ${argumentID}`);
    }
    const value = FieldValue.asRdfNode(values.first());
    if (!value) {
      if (argument.optional) { continue; }
      throw new Error(`Empty field value for query argument ${argumentID}`);
    }
    bindings[argumentID] = value;
  }

  const parsedQuery = SparqlUtil.parseQuery(queryTemplate.queryString);
  if (parsedQuery.type !== 'query' || parsedQuery.queryType !== 'SELECT') {
    throw new Error('Query must be SELECT SPARQL query');
  }
  return SparqlClient.setBindings(parsedQuery, bindings);
}

export default FormQuery;
