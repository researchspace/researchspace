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
import { each } from 'lodash';
import * as SparqlJs from 'sparqljs';
import { Just } from 'data.maybe';

import { Rdf, XsdDataTypeValidation, vocabularies } from 'platform/api/rdf';
import { SparqlUtil, SparqlClient } from 'platform/api/sparql';

import { isValidChild } from 'platform/components/utils';

import {
  SemanticForm,
  CompositeValue,
  FieldDefinitionProp,
  FieldValue,
  DataState,
  readyToSubmit,
  FieldDefinition,
  normalizeFieldDefinition,
  FieldError,
  ErrorKind,
} from 'platform/components/forms';

import { SemanticSearchContext, InitialQueryContext } from './SemanticSearchApi';
import { setSearchDomain } from '../commons/Utils';

export interface SemanticFormBasedQueryConfig {
  /**
   * Query template for form parametrization. Each query argument must have
   * corresponding form field definition.
   */
  queryTemplate: QueryTemplate;
  /**
   * Definitions for form fields. Every field `id` must be map exactly to a
   * single argument as defined in the arguments map of the `queryTemplate`
   * as well as must be referenced by the `for=` attribute of the HTML form input elements.
   *
   * - `maxOccurs` will be overridden to 1 (if the `multi` property set to `false`);
   * - `minOccurs` will be overridden to 0 or 1 depending on whether
   * corresponding query argument is optional or not.
   */
  fields: FieldDefinitionProp[];

  /**
   * Specifies the search domain category IRI (full IRI enclosed in <>).
   * Required, if component is used together with facets.
   */
  domain?: string;

  domainField?: string;

  /**
   * Enables multi-value injection.
   * If set to `true`, VALUES clause will be used to parametrize the base query for arguments with more than one value.
   * If set to `false`, the first value will be used to parametrize the base query by replacement of the binding variable.
   * To disable multi-value parameterization for particular variables, one can explicitly set `maxOccurs: 1` for corresponding fields.
   *
   * @default false
   */
  multi?: boolean;

  /**
   * Default query that should be executed when no input values are provided.
   */
  defaultQuery?: string;
}

export interface QueryTemplate {
  /**
   * The SPARQL query string, which is supposed to be parameterized, i.e. the query must
   * have query variables as listed in the arguments maps.
   */
  queryString: string;

  /**
   * A map of query arguments.
   * The key of every map entry must be equal to the query variable in the SPARQL queryString.
   */
  arguments: { [id: string]: QueryTemplateArgument };
}

export interface QueryTemplateArgument {
  /**
   * The RDF datatype of the expected value, i.e. xsd:anyURI, xsd:string, xsd:integer etc.
   */
  type: string;
  /**
   * Whether the argument is optional.
   * @default false
   */
  optional?: boolean;
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
 *        "label": {"type": "xsd:string"}
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
export class FormQuery extends React.Component<SemanticFormBasedQueryConfig> {
  render() {
    return (
      <SemanticSearchContext.Consumer>
        {(context) => <FormQueryInner {...this.props} context={context} />}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps extends SemanticFormBasedQueryConfig {
  context: InitialQueryContext;
}

interface State {
  readonly definitions?: ReadonlyArray<FieldDefinition>;
  readonly model?: CompositeValue;
  readonly modelState?: DataState;
}

class FormQueryInner extends React.Component<InnerProps, State> {
  private form: SemanticForm;

  constructor(props: InnerProps) {
    super(props);
    this.state = {
      definitions: adjustDefinitionsToTemplate({
        queryTemplate: this.props.queryTemplate,
        defs: this.props.fields,
        multi: this.props.multi,
      }),
    };
  }

  componentWillReceiveProps(props: InnerProps) {
    const { context } = props;
    if (context.searchProfileStore.isJust && context.domain.isNothing) {
      setSearchDomain(props.domain, context);
    }
  }

  componentDidMount() {
    if (this.props.defaultQuery) {
      return this.props.context.setBaseQuery(Just(SparqlUtil.parseQuery(this.props.defaultQuery)));
    }
  }

  render() {
    return (
      <SemanticForm
        ref={this.setFormRef}
        fields={this.state.definitions}
        model={this.state.model || FieldValue.fromLabeled({ value: PLACEHOLDER_SUBJECT })}
        onChanged={this.onFormChanged}
        onLoaded={this.onFormLoaded}
        onUpdated={this.onFormStateChanged}
      >
        <div onKeyDown={this.onKeyDown}>{this.mapChildren(this.props.children)}</div>
      </SemanticForm>
    );
  }

  private onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.keyCode === 13) {
      this.executeSearch();
    }
  };

  private setFormRef = (form: SemanticForm) => {
    this.form = form;
  };

  private onFormChanged = (model: CompositeValue) => {
    this.setState({ model });
  };

  private onFormLoaded = (model: CompositeValue) => {
    const { queryTemplate } = this.props;

    const validationErrors: FieldError[] = [];
    each(queryTemplate.arguments, (argument, argumentId) => {
      const field = model.definitions.get(argumentId);
      validateArgumentAndField(argumentId, argument, field, validationErrors);
    });

    this.setState({
      model: CompositeValue.set(model, {
        errors: model.errors.concat(validationErrors),
      }),
    });
  };

  private onFormStateChanged = (modelState: DataState) => {
    this.setState({ modelState });
  };

  private mapChildren = (children: React.ReactNode): React.ReactNode => {
    return React.Children.map(children, (element) => {
      if (!isValidChild(element)) {
        return element;
      }
      const { type, props } = element;

      if (type === 'button') {
        if (props.name === 'submit') {
          return React.cloneElement(element, {
            disabled: !this.canSubmit(this.state.model),
            onClick: this.executeSearch,
          });
        }
      }

      if (props.children && props.children.length > 0) {
        return React.cloneElement(element, {}, this.mapChildren(props.children));
      }

      return element;
    });
  };

  private executeSearch = () => {
    const model = this.form.validate(this.state.model);
    this.setState({ model });

    if (!this.canSubmit(model)) {
      return;
    }

    if (this.props.domainField) {
      setSearchDomain(
        '<' + FieldValue.asRdfNode(model.fields.get(this.props.domainField).values.first()).value + '>',
        this.props.context
      );
    }

    const parametrized = parametrizeQueryFromForm(this.props.queryTemplate, model);

    return this.props.context.setBaseQuery(Just(parametrized));
  };

  private canSubmit(model: CompositeValue) {
    return this.state.modelState === DataState.Ready && readyToSubmit(model, (error) => true);
  }
}

function adjustDefinitionsToTemplate({
  queryTemplate,
  defs,
  multi,
}: {
  queryTemplate: QueryTemplate;
  defs: FieldDefinitionProp[];
  multi: boolean;
}) {
  return defs.map(normalizeFieldDefinition).map<FieldDefinition>((def) => {
    const argument = queryTemplate.arguments[def.id];
    if (!argument) {
      return def;
    }
    return { ...def, maxOccurs: multi ? def.maxOccurs : 1, minOccurs: argument.optional ? 0 : 1 };
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
  validationErrors: FieldError[]
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

function parametrizeQueryFromForm(queryTemplate: QueryTemplate, model: CompositeValue): SparqlJs.SelectQuery {
  let parsedQuery = SparqlUtil.parseQuery(queryTemplate.queryString);
  if (parsedQuery.type !== 'query' || parsedQuery.queryType !== 'SELECT') {
    throw new Error('Query must be SELECT SPARQL query');
  }
  const queryArguments = queryTemplate.arguments;
  const bindings: SparqlClient.Dictionary<Rdf.Node> = {};

  parsedQuery = Object.keys(queryArguments).reduce((query, argumentId) => {
    const argument = queryArguments[argumentId];

    const { values } = model.fields.get(argumentId);
    const { maxOccurs } = model.definitions.get(argumentId);

    if (values.size === 0) {
      if (argument.optional) {
        return query;
      }
      throw new Error(`No field value for query argument ${argumentId}`);
    }

    // use variable replacement if an argument has cardinality equals 1 or it has only one value
    if (maxOccurs === 1 || values.size === 1) {
      const rdfNode = FieldValue.asRdfNode(values.first());
      if (!rdfNode) {
        if (argument.optional) {
          return query;
        }
        throw new Error(`Empty field value for query argument ${argumentId}`);
      }
      bindings[argumentId] = rdfNode;

      return query;
    }

    const parameters: SparqlClient.Dictionary<Rdf.Node>[] = [];
    values.forEach((value) => {
      const rdfNode = FieldValue.asRdfNode(value);
      if (!rdfNode) {
        if (argument.optional) {
          return;
        }
        throw new Error(`Empty field value for query argument ${argumentId}`);
      }
      parameters.push({ [argumentId]: rdfNode });
    });

    return SparqlClient.prepareParsedQuery(parameters)(query);
  }, parsedQuery);

  return SparqlClient.setBindings(parsedQuery, bindings);
}

export default FormQuery;
