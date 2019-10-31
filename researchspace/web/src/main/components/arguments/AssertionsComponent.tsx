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

import * as _ from 'lodash';
import * as React from 'react';
import { Panel, Button, Alert } from 'react-bootstrap';
import * as Kefir from 'kefir';
import { Map } from 'immutable';
import * as Maybe from 'data.maybe';

import { Rdf, vocabularies } from 'platform/api/rdf';
import { ModuleRegistry } from 'platform/api/module-loader';
import { CapturedContext } from 'platform/api/services/template';

import {
  Component, ComponentContext, ComponentChildContext,
  TemplateContext, TemplateContextTypes, SemanticContextProvider,
} from 'platform/api/components';
import { TemplateItem } from 'platform/components/ui/template';
import { ResourceLabel } from 'platform/components/ui/resource-label';

import {
  ResourceEditorForm, FieldValue, CompositeValue, LdpPersistence, normalizeFieldDefinition,
  computeModelDiff, getPreferredLabel,
} from 'platform/components/forms';
import {
  FieldBasedVisualization, FieldDefinitionWithData,
} from 'platform/components/forms/FieldBasedVisualization';

import {
  ArgumentsContext, ArgumentsContextTypes, AssertedBelief, AssertedBeliefTypeKind,
  ArgumentsFieldDefinition,
} from './ArgumentsApi';
import * as styles from './AssertionComponent.scss';

export interface AssertionsProps {
  title: string
  field: ArgumentsFieldDefinition
  target: Rdf.Iri

  valueTemplate: string
  formTemplate: string

  /**
   * Need this to have the ability to start in the adding value mode for the quick assertion workflow,
   * e.g new image assertion
   *
   * @default false
   */
  quickAssertion?: boolean

  beliefs: Map<Rdf.Node, AssertedBelief>;
  onBeliefsChange: (beliefs: Map<Rdf.Node, AssertedBelief>) => void;
}

interface State {
  addingNewValue: boolean;
  newValues: Array<Rdf.Node>;
  formTemplate: Data.Maybe<React.ReactNode>;
  capturedDataContext?: CapturedContext;
}

export class AssertionsComponent extends Component<AssertionsProps, State> {
  context: ComponentContext & TemplateContext & ArgumentsContext;

  constructor(props: AssertionsProps, context) {
    super(props, context);
    this.state = {
      addingNewValue: props.quickAssertion || false,
      newValues: props.beliefs.filter(b => !b.isCanonical).keySeq().toJS(),
      formTemplate: Maybe.Nothing<React.ReactNode>(),
    };
  }

  static defaultProps = {
    quickAssertion: false,
  };

  static childContextTypes = {
    ...Component.childContextTypes,
    ...ArgumentsContextTypes,
    ...TemplateContextTypes,
  };

  getChildContext(): ComponentChildContext & ArgumentsContext {
    const superContext = super.getChildContext();
    return {
      ...superContext,
      templateDataContext: this.state.capturedDataContext,
      changeBelief: this.onBeliefChange,
      removeBelief: this.removeBelief,
      getBeliefValue: this.getBeliefValue,
    };
  }

  componentDidMount() {
    const {templateDataContext} = this.context;
    const capturer = CapturedContext.inheritAndCapture(templateDataContext);
    this.appliedTemplateScope.compile(this.props.formTemplate).then(
      template => ModuleRegistry.parseHtmlToReact(
        template({field: this.props.field}, {capturer, parentContext: templateDataContext})
      )
    ).then(formTemplate => {
      this.setState({
        formTemplate: Maybe.Just(formTemplate),
        capturedDataContext: capturer.getResult(),
      });
    });
  }

  render() {
    const { target, valueTemplate, field, title } = this.props;

    const visualizationTemplate = `
      <div>
        {{#each fields as |field|}}
            {{#each field.values as |value|}}
              <div data-flex-layout='row center-center' class=${styles.valuesRow}>
                <div data-flex-self='right'>
                  ${valueTemplate}
                </div>
                <div data-flex-self='right'>
                  <rs-argument-simple-belief-selector for-value='{{value.value.value}}' is-canonical='{{#if ../../isNotCanonical}}false{{else}}true{{/if}}'>
                  </rs-argument-simple-belief-selector>
                </div>
              </div>
            {{/each}}
        {{/each}}
      </div>
`;

    const fieldClone = _.cloneDeep(field) as any;
    fieldClone.values = this.state.newValues.map(value => ({value}));
    fieldClone.minOccurs = 1;
    fieldClone.maxOccurs = 1;

    return <Panel header={title}>
      {this.assertionHeader(target, fieldClone)}
      <hr />
      {this.noBeliefs() ? <Alert bsStyle='warning'>
        <p><i className="fa fa-exclamation-triangle"></i>
          <strong>Please add an opinion to at least one value!</strong> Opinions are required for
          newly asserted values.</p>
       </Alert> : null}
      <SemanticContextProvider repository='default'>
        <FieldBasedVisualization
          subject={target.value}
          template={visualizationTemplate}
          fields={[fieldClone]}
        />
      </SemanticContextProvider>
      <hr />
      <TemplateItem
        template={{
          source: visualizationTemplate, options: {fields: [normalizeFieldDefinition(_.cloneDeep(fieldClone))], isNotCanonical: true}
        }} />
      { _.isEmpty(fieldClone.values) ? null : <hr /> }
      {
        this.state.addingNewValue && this.state.formTemplate.isJust ?
          <SemanticContextProvider repository='default'>
          <ResourceEditorForm
            newSubjectTemplate={target.value} fields={[fieldClone]}
            persistence={this}
            browserPersistence={false}
            postAction={this.postAction}
          >
            <div data-flex-layout='column justify-stretch' className={styles.valueHolder}>
              <div>
                {this.state.formTemplate.getOrElse(null)}
              </div>
              <div className={styles.actions} data-flex-layout='row top-right'>
                <button className='btn btn-danger' onClick={this.toggleAddNewValue}>Cancel</button>
                <button name='submit' className='btn btn-success'>Submit</button>
              </div>
            </div>
          </ResourceEditorForm>
          </SemanticContextProvider>
          : <div data-flex-layout='row center-right'>
            <Button bsStyle='link' onClick={this.toggleAddNewValue}>Add an alternative value ...</Button>
          </div>
      }
    </Panel>;
  }


  private noBeliefs = () => {
    const noBeliefForNewValues =
      _.some(
        this.state.newValues.map(
          value => Maybe.fromNullable(this.props.beliefs.get(value)).map(belief => belief.belief.value === 'No Opinion').getOrElse(true)
        ), x => x === true
      );
    return this.props.beliefs.isEmpty() || noBeliefForNewValues ||
           this.props.beliefs.every(b => b.belief.value === 'No Opinion');
  }

  private assertionHeader = (subject: Rdf.Iri, field: FieldDefinitionWithData) =>
    <div className={styles.header}>
      <div className={styles.subject}>
        <ResourceLabel iri={subject.value} />
      </div>
      <div className={styles.field}>
        {getPreferredLabel(field.label)}
      </div>
    </div>

  private onBeliefChange = (belief: AssertedBelief) => {
    if (belief.isCanonical && belief.belief.value === 'No Opinion') {
      this.props.onBeliefsChange(this.props.beliefs.remove(belief.targetValue));
    } else {
      this.props.onBeliefsChange(this.props.beliefs.set(belief.targetValue, belief));
    }
  }

  private removeBelief = (belief: AssertedBelief) => {
    this.setState({
      newValues: _.filter(this.state.newValues, value => !value.equals(belief.targetValue))
    });
    this.props.onBeliefsChange(
      this.props.beliefs.remove(belief.targetValue)
    );
  }

  private getBeliefValue = (forValue: string, isCanonical: boolean): AssertedBelief => {
    const node = AssertionsComponent.deserializeBeliefValue(this.props.field, forValue);
    return this.props.beliefs.has(node) ? this.props.beliefs.get(node) :
      AssertionsComponent.getDefaultBelief(
        this.props.target, this.props.field, node, isCanonical, 'default'
      );
  }

  // TODO use the logic from forms
  public static deserializeBeliefValue = (field: ArgumentsFieldDefinition, value: string): Rdf.Node => {
    if (vocabularies.xsd.anyURI.value === field.xsdDatatype) {
      return Rdf.iri(value);
    } else {
      return Rdf.literal(value, Rdf.iri(field.xsdDatatype as string));
    }
  }

  public static getDefaultBelief = (
    target: Rdf.Iri, field: ArgumentsFieldDefinition, value: Rdf.Node,
    isCanonical: boolean, repository: string
  ): AssertedBelief =>
    ({
      iri: Maybe.Nothing<Rdf.Iri>(),
      beliefType: AssertedBeliefTypeKind,
      target: target,
      field: field,
      targetValue: value,
      isCanonical: isCanonical,
      originRepository: repository,
      belief: {
        type: 'simple',
        value: 'No Opinion',
      }
    });

  private toggleAddNewValue = (event?: React.MouseEvent<any>) => {
    if (event) {
      event.preventDefault();
    }
    this.setState(state => ({addingNewValue: !state.addingNewValue}));
  }

  private postAction = (subject: Rdf.Iri): void => {
    this.toggleAddNewValue();
  }

  persist(
    initialModel: CompositeValue, currentModel: CompositeValue
  ): Kefir.Property<void> {
    return this.persistCompositeValue(initialModel, currentModel).map(
      values => {
        // for quick assertions workflow we automatically agree with all new values
        if (this.props.quickAssertion) {
          const beliefs =
            values.map(value => {
              const belief = AssertionsComponent.getDefaultBelief(
                this.props.target, this.props.field, value, false, 'default'
              );
              belief.belief.value = 'Agree';
              return [value, belief];
            }) as Array<[Rdf.Node, AssertedBelief]>;
          this.props.onBeliefsChange(Map(beliefs));
        }

        this.props.onBeliefsChange(
          this.props.beliefs.set(values[0], AssertionsComponent.getDefaultBelief(
            this.props.target, this.props.field, values[0], false, 'default'
          ))
        );
        this.setState(
          (state: State) => ({
            newValues: state.newValues.concat(values)
          })
        );
      }
    );
  }

  private persistCompositeValue(
    initialModel: CompositeValue, currentModel: CompositeValue
  ): Kefir.Property<ReadonlyArray<Rdf.Node>> {
    const entries = computeModelDiff(FieldValue.empty, currentModel);
    if (entries.length > 1) {
      const topLevelFieldValue =
        _.find(entries, entry => entry.subject.equals(this.props.target));
      const nestedValues =
        _.filter(entries, entry => !entry.subject.equals(this.props.target));
      return new LdpPersistence()
        .persistModelUpdates(nestedValues[0].subject, nestedValues)
        .map(() => topLevelFieldValue.inserted);
    } else {
      return Kefir.constant(
        _.flatten(entries.map(entry => entry.inserted as Array<Rdf.Node>))
      );
    }
  }
}

export default AssertionsComponent;
