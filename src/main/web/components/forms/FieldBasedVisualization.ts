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
import { SparqlBindingValue } from './FieldValues';

export interface FieldBasedVisualizationConfig {
  /**
   * The IRI of the resource that needs to be visualized.
   */
  subject?: string;

  /**
   * Additional IRIs for the subject, useful when there are alignment with owl:sameAs or skos:exactMatch.
   *
   * If specified field values are fetched for the main subject as well as for additional.
   */
  additionalSubjects?: [string]

  /**
   * Definition for fields that need to be visualized.
   *
   * See <semantic-link uri='http://help.researchspace.org/resource/Help:SemanticForm'></semantic-link> for more details about field definitions.
   */
  fields: FieldDefinitionProp[];

  /**
   * <semantic-link uri='http://help.researchspace.org/resource/Help:FrontendTemplating'>Template</semantic-link>, that gets the `fields` value with the list of field definitions injected as template context.
   * [each helper](http://handlebarsjs.com/builtin_helpers.html#iteration) can be used to iterate over the fields.
   *
   * Every field has corresponding metadata (label, xsdDatatype, etc.), as well as list of `values`.
   *
   * See <semantic-link uri='http://help.researchspace.org/resource/Help:SemanticForm'></semantic-link> for more details about field definitions.
   */
  template: string;
}

export interface FieldDefinitionWithData extends FieldDefinitionProp {
  values: Array<SparqlBindingValue>;
}

interface State {
  fieldsData: Array<FieldDefinitionWithData>;
  isLoading: boolean;
  noData: boolean;
}
export class FieldBasedVisualization extends Component<FieldBasedVisualizationConfig, State> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      fieldsData: [],
      isLoading: true,
      noData: true,
    };
  }

  static defaultProps = {
    subject: getCurrentResource().value,
    additionalSubjects: []
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
          additionalSubjects: this.props.additionalSubjects,
          fields: this.state.fieldsData,
          noData: this.state.noData,
        },
      },
    });
  }

  private fetchFieldValues() {
    const { fields, subject, additionalSubjects } = this.props;
    const subjectIri = Rdf.iri(subject);
    const otherSubjects = additionalSubjects.map(s => Rdf.iri(s));
    Kefir.combine(
      fields.map(
        normalizeFieldDefinition
      ).map(
        field => queryValues(
          field.selectPattern, subjectIri, { context: this.context.semanticContext }, otherSubjects
        ).map(
          values => {
            const f = _.cloneDeep(field as FieldDefinitionWithData);
            f.values = _.isEmpty(values) ? null : values;
            return f;
          }
        )
      )
    ).onValue(
      values =>
        this.setState({
          fieldsData: values,
          isLoading: false,
          noData: _.every(values, v => v.values === null)
        })
    );
  }
}
export default FieldBasedVisualization;
