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

import { createElement } from 'react';
import * as Kefir from 'kefir';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { Component } from 'platform/api/components';
import { TemplateItem } from 'platform/components/ui/template';
import { Spinner } from 'platform/components/ui/spinner';
import { getCurrentResource } from 'platform/api/navigation';

import { FieldDefinitionProp, normalizeFieldDefinition } from './FieldDefinition';
import { queryValues } from './QueryValues';
import {SparqlBindingValue } from './FieldValues';

export interface FieldBasedVisualizationConfig {
  /**
   * The IRI of the resource that needs to be visualized.
   */
  subject?: string;

  /**
   * Definition for fields that need to be visualized.
   *
   * See <semantic-link uri='http://help.metaphacts.com/resource/Help:SemanticForm'></semantic-link> for more details about field definitions.
   */
  fields: FieldDefinitionProp[];

 /**
  * <semantic-link uri='http://help.metaphacts.com/resource/Help:FrontendTemplating'>Template</semantic-link>, that gets the `fields` value with the list of field definitions injected as template context.
  * [each helper](http://handlebarsjs.com/builtin_helpers.html#iteration) can be used to iterate over the fields.
  *
  * Every field has corresponding metadata (label, xsdDatatype, etc.), as well as list of `values`.
  *
  * See <semantic-link uri='http://help.metaphacts.com/resource/Help:SemanticForm'></semantic-link> for more details about field definitions.
  */
  template: string;
}

export interface FieldDefinitionWithData extends FieldDefinitionProp {
  values: Array<SparqlBindingValue>;
}

interface State {
  fieldsData: Array<FieldDefinitionWithData>;
  isLoading: boolean
}
export class FieldBasedVisualization extends Component<FieldBasedVisualizationConfig, State> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      fieldsData: [],
      isLoading: false,
    };
  }

  static defaultProps = {
    subject: getCurrentResource().value
  };

  public componentDidMount() {
    this.fetchFieldValues();
  }

  render() {
    return this.state.isLoading ? createElement(Spinner) : this.renderResult();
  }

  private renderResult() {
    return createElement(TemplateItem, {
      template: {
        source: this.props.template,
        options: {
          subject: this.props.subject,
          fields: this.state.fieldsData,
        },
      },
    });
  }

  private fetchFieldValues() {
    const { fields, subject } = this.props;
    const subjectIri = Rdf.iri(subject);
    Kefir.combine(
      fields.map(
        normalizeFieldDefinition
      ).map(
        field => queryValues(
          field.selectPattern, subjectIri, {context: this.context.semanticContext}
        ).map(
          values => {
            const f = _.cloneDeep(field as FieldDefinitionWithData);
            f.values = _.isEmpty(values) ? null : values;
            return f;
          }
        )
      )
    ).onValue(
      values => this.setState({fieldsData: values})
    );
  }
}
export default FieldBasedVisualization;
