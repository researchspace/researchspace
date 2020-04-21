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
import * as Kefir from 'kefir';
import * as _ from 'lodash';
import { FormGroup, ControlLabel, Button } from 'react-bootstrap';
import * as Maybe from 'data.maybe';
import ReactSelect, { Option, Options } from 'react-select';
import * as Immutable from 'immutable';

import { Rdf } from 'platform/api/rdf';
import { getRepositoryStatus } from 'platform/api/services/repository';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { getLabels } from 'platform/api/services/resource-label';
import { Component } from 'platform/api/components';
import { ResourceLinkComponent } from 'platform/api/navigation/components/ResourceLinkComponent';
import { TypedSelectionActionComponent } from 'platform/components/sets/TypedSelectionActionComponent';
import { MenuProps } from 'platform/components/ui/selection/SelectionActionProps';
import { AllTitleProps, TypeProps } from 'platform/components/sets/TypedSelectionActionProps';
import { FieldSelection } from './FieldSelection';
import { QuickAssertionComponent } from './QuickAssertionComponent';
import { ArgumentsFieldDefinition, AssertedBelief } from './ArgumentsApi';

interface BaseConfig extends AllTitleProps, TypeProps, MenuProps {
  selection: Array<string>;
  targetSelectionPlaceholder?: string;
  targetSelectionLabel?: string;
  fieldSelectionLabel?: string;
  valueTemplate: string;
  formTemplate: string;
}

interface WithFixedField extends BaseConfig {
  field: string;
}

export type SimpleAssertionConfig = BaseConfig | WithFixedField;

/**
 * Component that can be used to quickly initiate assertion from the clipboard.
 *
 * 1) User selects some entities that should be used in the assertion.
 * 2) User triggers action.
 * 3) User selects the entity that is the target of the assertion, all other entities that
 *    were selected as part of step 1. are used as values for the assertion.
 * 4) User selects fields for the assertion. User can select only the field that has
 *    the same domain as a target and the same range that is shared for all values.
 */
export class SimpleAssertion extends React.Component<SimpleAssertionConfig, void> {
  static defaultProps = {
    menuTitle: 'Quick Assertion',
    title: 'Assert',
  };

  render() {
    const { selection, closeMenu, menuTitle, title, types, repositories } = this.props;
    return (
      <TypedSelectionActionComponent
        title={title}
        isDisabled={(s) => s.length < 1}
        selection={selection}
        menuTitle={menuTitle}
        repositories={repositories}
        closeMenu={closeMenu}
        types={types}
        dialogType="modal"
        dialogSize="large"
        renderDialog={(s) => <SimpleAssertionDialog {...this.props} selection={s} />}
      />
    );
  }
}
export default SimpleAssertion;

interface State {
  targetOptions: Options;
  targetValue?: Option<string>;
  targetTypes: Array<Rdf.Iri>;
  valueTypes: Array<Rdf.Iri>;
  values: Array<Rdf.Iri>;
  field?: ArgumentsFieldDefinition;
  showAssertionDialog: boolean;
  error?: any;
}

class SimpleAssertionDialog extends Component<SimpleAssertionConfig, State> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      showAssertionDialog: false,
      targetOptions: [],
      targetValue: undefined,
      error: undefined,
      targetTypes: [],
      valueTypes: [],
      values: [],
    };
  }

  static defaultProps = {
    targetSelectionPlaceholder: 'Please select the target record for the assertion',
    targetSelectionLabel: 'Assertion Target Record',
    fieldSelectionLabel: 'Assertion Field',
  };

  componentDidMount() {
    this.createTargetOptions(this.props.selection);
  }

  private createTargetOptions = (selection: Array<string>) => {
    const selectionIris = _.map(selection, Rdf.iri);
    getLabels(selectionIris)
      .onValue((labels) => {
        const targetOptions = _.map(labels.toArray(), (label, i) => ({ value: selection[i], label }));
        this.setState({ targetOptions });
      })
      .onError((error) => this.setState({ error: error }));
  };

  render() {
    if (this.state.showAssertionDialog) {
      return (
        <QuickAssertionComponent
          fieldIri={this.state.field.iri}
          target={this.state.targetValue.value}
          valueTemplate={this.props.valueTemplate}
          formTemplate={this.props.formTemplate}
          editMode={false}
          initialBeliefs={this.constructInitialBeliefs()}
          postAction="redirect"
        />
      );
    } else {
      return (
        <div style={{ height: 400 }}>
          {this.targetSelection()}
          {_.isEmpty(this.state.values) ? null : this.assertedValues()}
          {this.state.targetValue && !_.isEmpty(this.state.targetTypes) ? this.fieldSelection() : null}
          {_.isEmpty(this.state.values) ? null : this.createAssertionButton()}
        </div>
      );
    }
  }

  private targetSelection = () => {
    const { targetOptions, targetValue } = this.state;
    return (
      <FormGroup>
        <ControlLabel>{this.props.targetSelectionLabel}</ControlLabel>
        <ReactSelect
          placeholder={this.props.targetSelectionPlaceholder}
          value={targetValue}
          options={targetOptions}
          onChange={this.onTargetSelectionChange}
        />
      </FormGroup>
    );
  };

  private fieldSelection = () => {
    const { targetValue } = this.state;
    return (
      <FormGroup>
        <ControlLabel>{this.props.fieldSelectionLabel}</ControlLabel>
        <FieldSelection
          multiSelection={false}
          placeholder="Select field for assertion"
          record={Rdf.iri(targetValue.value)}
          types={this.state.targetTypes}
          onCancel={() => this.onFieldSelectionChange(null)}
          onSave={this.onFieldSelectionChange}
          fieldFilter={this.fieldFilter}
        />
      </FormGroup>
    );
  };

  private assertedValues = () => (
    <div>
      <p>Values that will be asserted for the given target:</p>
      <ul>
        {_.map(this.state.values, (value) => (
          <li key={value.value}>
            <ResourceLinkComponent guessRepository={true} uri={value.value} />
          </li>
        ))}
      </ul>
    </div>
  );

  private createAssertionButton = () => (
    <div className="pull-right">
      <Button onClick={this.onCreateAssertion} bsStyle="primary">
        Continue
      </Button>
    </div>
  );

  private onCreateAssertion = () => this.setState({ showAssertionDialog: true });

  private onFieldSelectionChange = (field: ArgumentsFieldDefinition) => {
    this.setState({ field });
  };

  private onTargetSelectionChange = (targetValue: Option<string>) => {
    if (targetValue) {
      const values = _.map(
        _.filter(this.props.selection, (selection) => selection !== targetValue.value),
        Rdf.iri
      );

      // get common types for all values that are going to be asserted
      const valueTypesProperty = Kefir.combine(_.map(values, this.getTypes))
        .map(_.flatten)
        .map((types) => _.intersectionBy(types, (t) => t.value))
        .toProperty();

      this.getTypes(Rdf.iri(targetValue.value))
        .flatMap((targetTypes) => valueTypesProperty.map((valueTypes) => ({ targetTypes, valueTypes })))
        .onValue(({ targetTypes, valueTypes }) => this.setState({ targetTypes, valueTypes, targetValue, values }));
    } else {
      this.setState({ targetValue, values: [] });
    }
  };

  private constructInitialBeliefs = () => {
    const beliefs: Array<[Rdf.Node, AssertedBelief]> = _.map(
      this.state.values,
      (assertion) =>
        [
          assertion,
          {
            iri: Maybe.Nothing<Rdf.Iri>(),
            belief: {
              type: 'simple',
              value: 'Agree',
            },
            target: Rdf.iri(this.state.targetValue.value),
            originRepository: 'default',
            field: this.state.field,
            beliefType: 'AssertedBelief',
            targetValue: assertion,
            isCanonical: false,
          },
        ] as [Rdf.Node, AssertedBelief]
    );
    return Immutable.Map(beliefs);
  };

  private fieldFilter = (field: ArgumentsFieldDefinition): Kefir.Property<boolean> => {
    return Kefir.constant(_.some(this.state.valueTypes, (vt) => vt.value === (field.range as string)));
  };

  private repositories = getRepositoryStatus().map((repos) => repos.keySeq().toArray());
  private getTypes = (resource: Rdf.Iri): Kefir.Property<Array<Rdf.Iri>> =>
    this.repositories
      .flatMap((repos) => Kefir.combine(repos.map((r) => this.getTypesFromRepository(r, resource))))
      .map(_.flatten)
      .map((types) => _.uniqWith(types, (a, b) => a.equals(b)))
      .toProperty();

  private TYPES_QUERY = SparqlUtil.Sparql`SELECT DISTINCT ?type WHERE { ?__resource__ a ?type }`;
  private getTypesFromRepository = (repository: string, resource: Rdf.Iri): Kefir.Property<Array<Rdf.Iri>> =>
    SparqlClient.select(SparqlClient.setBindings(this.TYPES_QUERY, { __resource__: resource }), {
      context: { repository: repository },
    }).map((result) => result.results.bindings.map((binding) => binding['type'] as Rdf.Iri));
}
