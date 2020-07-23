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

import * as React from 'react';
import * as Maybe from 'data.maybe';
import * as _ from 'lodash';
import * as Kefir from 'kefir';
import ReactSelect from 'react-select';
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { getPreferredLabel } from 'platform/components/forms';
import { getRepositoryStatus } from 'platform/api/services/repository';

import { getArgumentsFieldDefinition } from './FieldUtils';
import { ArgumentsFieldDefinition } from './ArgumentsApi';

export interface BaseFieldSelectionProps {
  record: Rdf.Iri;
  types: Array<Rdf.Iri>;
  placeholder: string;
  onCancel: () => void;
  multiSelection: boolean;

  /**
   * Show only fields that satisfy some condition.
   */
  fieldFilter?: (field: ArgumentsFieldDefinition) => Kefir.Property<boolean>;
}
export interface MultiFieldSelectionProps extends BaseFieldSelectionProps {
  onSave: (fields: Array<ArgumentsFieldDefinition>) => void;
}
export interface SingleFieldSelectionProps extends BaseFieldSelectionProps {
  onSave: (field: ArgumentsFieldDefinition) => void;
}
export type FieldSelectionProps = MultiFieldSelectionProps | SingleFieldSelectionProps;
function isMultiSelection(props: FieldSelectionProps): props is MultiFieldSelectionProps {
  return props.multiSelection;
}

interface SelectedField {
  value: string;
  label: string;
}

interface State {
  fields: Data.Maybe<Array<ArgumentsFieldDefinition>>;
  selectedFields: Array<SelectedField> | SelectedField;
}

interface UndocumentedReactSelect {
  closeMenu?(): void;
}

/**
 * Provides the ability to select multiple Fields for some Record.
 * 1) Only fields that have range matching type of the Record can be selected.
 * 2) Only fields with canonical values (values from default repository)
 *    for the give record can be selected.
 */
export class FieldSelection extends React.Component<FieldSelectionProps, State> {
  private fieldSelection: ReactSelect;
  private repositories = getRepositoryStatus().map((repos) => repos.keySeq().toArray());

  constructor(props: FieldSelectionProps, context) {
    super(props, context);
    this.state = {
      fields: Maybe.Nothing<Array<ArgumentsFieldDefinition>>(),
      selectedFields: props.multiSelection ? [] : null,
    };
  }

  componentDidMount() {
    this.fetchFields(this.props);
  }

  componentWillReceiveProps(props: FieldSelectionProps) {
    if (!_.isEqual(props, this.props)) {
      this.fetchFields(props);
    }
  }

  render() {
    const { fields: maybeFields } = this.state;
    return maybeFields
      .map((fields) => (_.isEmpty(fields) ? <p>'No applicable field for the record'</p> : this.fieldsSelection(fields)))
      .getOrElse(<p>Loading fields ... </p>);
  }

  private fieldsSelection = (fields: Array<ArgumentsFieldDefinition>) => (
    <div style={{ height: 400 }}>
      <ReactSelect
        ref={(component) => (this.fieldSelection = component)}
        multi={this.props.multiSelection}
        clearable={true}
        onChange={this.onFieldSelectionChange(fields)}
        options={fields.map((field) => ({ value: field.iri, label: getPreferredLabel(field.label) }))}
        value={this.state.selectedFields}
        placeholder={this.props.placeholder}
      />
    </div>
  );

  private onFieldSelectionChange = (fields: Array<ArgumentsFieldDefinition>) => (
    selected: Array<SelectedField> | SelectedField
  ) => {
    (this.fieldSelection as UndocumentedReactSelect).closeMenu();
    this.setState({ selectedFields: selected });
    if (isMultiSelection(this.props)) {
      const multiSelectd = selected as Array<SelectedField>;
      const selectedFields = fields.filter((field) => _.some(multiSelectd, ({ value }) => field.iri === value));
      this.props.onSave(selectedFields);
    } else {
      const selectedField = fields.find((field) => (selected as SelectedField).value === field.iri);
      this.props.onSave(selectedField);
    }
  };

  private fetchFields = (props: FieldSelectionProps) => {
    const { record, types } = props;
    this.setState({ fields: Maybe.Nothing<Array<ArgumentsFieldDefinition>>() });
    this.getExistingFieldsForRecord(record, types).onValue((fields) => this.setState({ fields: Maybe.Just(fields) }));
  };

  private getExistingFieldsForRecord = (
    record: Rdf.Iri,
    types: Array<Rdf.Iri>
  ): Kefir.Property<Array<ArgumentsFieldDefinition>> => {
    const allFields = this.getFieldsForRecord(record, types);
    return allFields
      .flatMap((fields) =>
        Kefir.combine(
          fields.map((field) =>
            this.checkField(field).map<[ArgumentsFieldDefinition, boolean]>((check) => [field, check])
          )
        )
      )
      .map((fields) => fields.filter(([, check]) => check).map(([field]) => field))
      .toProperty();
  };

  private checkField = (field: ArgumentsFieldDefinition): Kefir.Property<boolean> => {
    if (this.props.fieldFilter) {
      return this.props.fieldFilter(field);
    } else {
      return this.repositories
        .flatMap((repos) => Kefir.combine(repos.map((repo) => this.executeFieldTestForRepository(field, repo))))
        .map(_.some)
        .toProperty();
    }
  };

  private executeFieldTestForRepository = (field: ArgumentsFieldDefinition, repository: string) => {
    const query = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(field.selectPattern);
    const askQuery: SparqlJs.AskQuery = {
      prefixes: query.prefixes,
      type: 'query',
      queryType: 'ASK',
      where: query.where,
    };
    return SparqlClient.ask(SparqlClient.setBindings(askQuery, { subject: this.props.record }), {
      context: { repository: repository },
    });
  };

  private FIELDS_QUERY = SparqlUtil.Sparql`
    SELECT ?field {
    ?field <http://www.researchspace.org/resource/system/fields/domain> ?__type__ .
    <http://www.researchspace.org/resource/system/fieldDefinitionContainer> <http://www.w3.org/ns/ldp#contains> ?field .
    }
  ` as SparqlJs.SelectQuery;
  private getFieldsForRecord = (
    record: Rdf.Iri,
    types: Array<Rdf.Iri>
  ): Kefir.Property<Array<ArgumentsFieldDefinition>> => {
    const fieldIris = SparqlClient.select(
      SparqlClient.prepareParsedQuery(types.map((type) => ({ __type__: type })))(this.FIELDS_QUERY),
      { context: { repository: 'assets' } }
    ).map((res) => res.results.bindings.map((binding) => binding['field'] as Rdf.Iri));

    const fieldsData = fieldIris.flatMap((iris) =>
      Kefir.combine(iris.map((field) => getArgumentsFieldDefinition(field)))
    );
    return fieldsData.toProperty();
  };
}
