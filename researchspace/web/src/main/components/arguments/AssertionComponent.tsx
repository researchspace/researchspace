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
import ReactSelect from 'react-select';
import { FormControl, ControlLabel, FormGroup, Button, Panel } from 'react-bootstrap';
import * as Maybe from 'data.maybe';
import * as Immutable from 'immutable';
import * as _ from 'lodash';
import * as Kefir from 'kefir';
import * as SparqlJs from 'sparqljs';
import * as classnames from 'classnames';

import { Component, ComponentChildContext, TemplateContextTypes } from 'platform/api/components';
import { TemplateItem } from 'platform/components/ui/template';
import { Rdf } from 'platform/api/rdf';
import { CapturedContext } from 'platform/api/services/template';
import { ModuleRegistry } from 'platform/api/module-loader';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Cancellation } from 'platform/api/async/Cancellation';
import { trigger } from 'platform/api/events';

import {
  CompositeValue, FieldDefinitionProp, FieldValue, LdpPersistence, ResourceEditorForm,
  SparqlBindingValue, getPreferredLabel, computeModelDiff, queryValues, normalizeFieldDefinition,
} from 'platform/components/forms';
import { Spinner } from 'platform/components/ui/spinner';
import { DropArea } from 'platform/components/dnd/DropArea';
import { ResourceLinkComponent } from 'platform/api/navigation/components';
import { navigateToResource } from 'platform/api/navigation';
import { addNotification } from 'platform/components/ui/notification';

import { crminf, rso } from 'researchspace/data/vocabularies';

import {
  ArgumentsFieldDefinition, Assertion, AssertedBelief, ArgumentsContext, ArgumentsContextTypes,
  SimpleBeliefValue,
} from './ArgumentsApi';
import { saveAssertion, loadAssertion } from './AssertionsStore';
import { AssertionsComponent } from './AssertionsComponent';
import { Belief } from './Belief';

import * as AssertionEvents from './AssertionEvents';

import * as styles from './AssertionComponent.scss';

const DEFAULT_VALUE_TEMPLATE = `<div>
  {{#ifCond field.xsdDatatype.value "=="  "http://www.w3.org/2001/XMLSchema#string"}}
    {{value.value.value}}
  {{/ifCond}}
  {{#ifCond field.xsdDatatype.value "=="  "http://www.w3.org/2001/XMLSchema#dateTime"}}
    {{value.value.value}}
  {{/ifCond}}
  {{#ifCond field.xsdDatatype.value "=="  "http://www.w3.org/2001/XMLSchema#anyURI"}}
    <semantic-link uri="{{value.value.value}}" guess-repository=true></semantic-link>
  {{/ifCond}}
</div>`;

const IS_CANONICAL_ASK_QUERY = `ASK {
  OPTIONAL {
    ?assertion ${rso.targetsRecord} ?subject ;
               ${rso.PX_asserts} ?belief .
    ?belief ${rso.PX_asserts_value} ?value .
    ?belief ${rso.PX_is_canonical_value} ?isCanonicalValue .
  }
  FILTER(!bound(?belief) || ?isCanonicalValue)
}`;

const HAS_ARGUMENT_ASK_QUERY = `ASK {
  ?assertion ${rso.targetsRecord} ?subject ;
             ${rso.PX_asserts} ?belief .
  ?belief ${rso.PX_asserts_value} ?value .
  FILTER EXISTS { ?argument ${crminf.J2_concluded_that} ?belief }
}`;

const SEMANTIC_NARRATIVE_ASK_QUERY = `ASK {
  ?value a ${rso.UserDefinedPage}.
}`;

export enum PostAction {
  None = 'none',
  Redirect = 'redirect',
}

export enum Status {
  Loading,
  Saving,
}

export interface DefaultConfig {
  /**
   * Unique ID of the component.
   */
  id: string;
  /**
   * Template to display values of the field.
   */
  valueTemplate?: string;
  /**
   * Form to be used to add an alternative value to the field.
   */
  formTemplate?: string;
  /**
   * Optional post-action to be performed after saving the assertion.
   */
  postAction?: PostAction;
}

export interface CreateAssertionConfig extends DefaultConfig {
  /**
   * Resource IRI.
   */
  target: string;
  /**
   * Field definitions.
   */
  fields: ReadonlyArray<FieldDefinitionProp>;
}

export interface EditAssertionConfig extends DefaultConfig {
  /**
   * Assertion IRI.
   */
  assertion: string;
}

export type AssertionComponentConfig = CreateAssertionConfig | EditAssertionConfig;

type Props = AssertionComponentConfig;

interface Value extends SparqlBindingValue {
  isCanonical: boolean;
  hasArgument: boolean;
}

interface State {
  target?: Rdf.Iri;
  fields?: ReadonlyArray<ArgumentsFieldDefinition>;
  field?: ArgumentsFieldDefinition;
  title?: string;
  description?: string;
  beliefs?: Immutable.Map<Rdf.Node, AssertedBelief>;
  values?: ReadonlyArray<Value>;
  addingNewValue?: boolean;
  newValues?: ReadonlyArray<Rdf.Node>;
  formTemplate?: React.ReactNode;
  capturedDataContext?: CapturedContext;
  addingNarrative?: boolean;
  narrative?: Rdf.Iri;
  assertionIri?: Rdf.Iri;
  status?: Status;
}

/**
 * The component to create/edit assertions.
 *
 * @example
 *
 * <!-- Demo configuration for creating an assertion -->
 * <rs-assertion target='http://example.com/some-resource' fields='{[...]}'></rs-assertion>
 *
 * <!-- Demo configuration for editing an assertion -->
 * <rs-assertion target='http://example.com/some-resource'></rs-assertion>
 */
export class AssertionComponent extends Component<Props, State> {
  static defaultProps: Partial<Props> = {
    fields: [],
    valueTemplate: DEFAULT_VALUE_TEMPLATE,
    postAction: PostAction.Redirect,
  };

  private readonly cancellation = new Cancellation();

  constructor(props: Props, context: any) {
    super(props, context);
    const {target, fields} = props as CreateAssertionConfig;
    const {assertion} = props as EditAssertionConfig;
    const argumentsFields = fields.map(field => {
      return {...field, iri: field.iri || field.id, id: 'field'};
    }).sort(compareFieldDefinitionsByLabel);
    this.state = {
      target: target ? Rdf.iri(target) : undefined,
      fields: argumentsFields,
      field: argumentsFields.length === 1 ? argumentsFields[0] : undefined,
      title: '',
      description: '',
      beliefs: Immutable.Map<Rdf.Node, AssertedBelief>(),
      newValues: [],
      assertionIri: assertion ? Rdf.iri(assertion) : undefined,
      status: assertion ? Status.Loading : undefined,
    };
  }

  static childContextTypes = {
    ...Component.childContextTypes,
    ...ArgumentsContextTypes,
    ...TemplateContextTypes,
  };

  getChildContext(): ComponentChildContext & ArgumentsContext {
    const superContext = super.getChildContext();
    return {
      ...superContext,
      changeBelief: this.onChangeBelief,
      removeBelief: this.onRemoveBelief,
      getBeliefValue: this.getBeliefValue,
    };
  }

  componentDidMount() {
    const {field, assertionIri} = this.state;
    if (field) {
      this.queryValues(field);
      this.updateFormTemplate();
    }
    if (assertionIri) {
      this.loadAssertion();
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const {field, assertionIri} = this.state;
    if (field !== prevState.field && !assertionIri) {
      this.resetState();
      if (field) {
        this.queryValues(field);
        this.updateFormTemplate();
      }
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private loadAssertion() {
    this.cancellation.map(
      loadAssertion(this.state.assertionIri)
    ).onValue(assertion => {
      const assertedBeliefs = Immutable.Map<Rdf.Node, AssertedBelief>(
        assertion.beliefs.map(belief => [belief.targetValue, belief])
      );
      this.setState({
        target: assertion.target,
        field: assertion.field,
        title: assertion.title,
        description: assertion.note,
        narrative: assertion.narrative,
        beliefs: assertedBeliefs,
      });
      this.queryValues(assertion.field);
      this.updateFormTemplate();
    });
  }

  private resetState() {
    this.setState({
      title: '',
      description: '',
      beliefs: Immutable.Map<Rdf.Node, AssertedBelief>(),
      values: undefined,
      newValues: [],
      addingNewValue: false,
      narrative: undefined,
      addingNarrative: false,
    });
  }

  private queryValues(field: ArgumentsFieldDefinition) {
    const {semanticContext: context} = this.context;
    const {target} = this.state;
    this.setState({status: Status.Loading});
    queryValues(field.selectPattern, target, {context}).flatMap(values => {
      if (!values.length) {
        return Kefir.constant([]);
      }
      const querying = values.map(value => {
        const isCanonicalQuery = this.parametrizeQuery(IS_CANONICAL_ASK_QUERY, value);
        const isCanonicalQuerying = SparqlClient.ask(isCanonicalQuery, {context});

        const hasArgumentQuery = this.parametrizeQuery(HAS_ARGUMENT_ASK_QUERY, value);
        const hasArgumentQuerying = SparqlClient.ask(hasArgumentQuery, {context});

        return Kefir.combine({
          isCanonical: isCanonicalQuerying,
          hasArgument: hasArgumentQuerying,
        }).map(({isCanonical, hasArgument}) =>
          ({...value, isCanonical, hasArgument})
        );
      });
      return Kefir.zip(querying);
    }).onValue(values =>
      this.setState({values, status: undefined})
    );
  }

  private parametrizeQuery(queryStr: string, value: SparqlBindingValue) {
    const {target} = this.state;
    const parsedQuery = SparqlUtil.parseQuerySync<SparqlJs.AskQuery>(queryStr);
    return SparqlClient.setBindings(parsedQuery, {'subject': target, 'value': value.value});
  }

  private updateFormTemplate() {
    const {templateDataContext} = this.context;
    const {formTemplate} = this.props;
    if (!formTemplate) { return; }
    const capturer = CapturedContext.inheritAndCapture(templateDataContext);
    this.appliedTemplateScope.compile(formTemplate).then(
      template => ModuleRegistry.parseHtmlToReact(
        template({field: this.state.field}, {capturer, parentContext: templateDataContext})
      )
    ).then(formTemplate => {
      this.setState({
        formTemplate: formTemplate,
        capturedDataContext: capturer.getResult(),
      });
    });
  }

  private onChangeBelief = (belief: AssertedBelief) => {
    this.setState(({beliefs}): State => {
      if (belief.isCanonical && belief.belief.value === 'No Opinion') {
        return {beliefs: beliefs.remove(belief.targetValue)};
      }
      return {beliefs: beliefs.set(belief.targetValue, belief)};
    });
  }

  private onRemoveBelief = (belief: AssertedBelief) => {
    this.setState(({beliefs}): State =>
      ({beliefs: beliefs.remove(belief.targetValue)})
    );
  }

  private getBeliefValue = (forValue: string, isCanonical: boolean): AssertedBelief => {
    const {target, field, beliefs} = this.state;
    const node = AssertionsComponent.deserializeBeliefValue(this.state.field, forValue);
    return beliefs.get(node) || AssertionsComponent.getDefaultBelief(
      target, field, node, isCanonical, 'default'
    );
  }

  private onSaveAssertion = () => {
    const {id, postAction} = this.props;
    const {target, field, title, description, beliefs, narrative, assertionIri} = this.state;

    this.setState({status: Status.Saving});

    const assertion: Assertion = {
      iri: Maybe.fromNullable(assertionIri),
      title: title,
      note: description,
      narrative: narrative,
      field: field,
      target: target,
      beliefs: beliefs.valueSeq().toArray(),
    };
    this.cancellation.map(
      saveAssertion(assertion)
    ).flatMap(saveAssertion => {
      if (postAction === PostAction.None) {
        this.setState({
          assertionIri: saveAssertion.assertion,
          status: undefined,
        });
        trigger({
          source: id,
          eventType: AssertionEvents.AssertionSaved,
          data: {resourceIri: saveAssertion.assertion.value},
        });
        return Kefir.constant(undefined);
      }
      return navigateToResource(saveAssertion.assertion, {}, 'assets');
    }).observe({
      value: () => {
        addNotification({
          level: 'success',
          message: `Assertion has been ${assertionIri ? 'updated' : 'saved'} successfully!`,
        });
      },
      error: e => {
        console.error(e);
        addNotification({
          level: 'error',
          message: `Something went wrong during ${assertionIri ? 'updating' : 'saving'} the assertion.`,
        });
        this.setState({status: undefined});
      },
    });
  }

  private renderNewValueForm() {
    const {target, field, addingNewValue, formTemplate} = this.state;
    if (!formTemplate) { return null; }

    const fieldClone = {...field} as any;
    fieldClone.values = this.state.newValues.map(value => ({value}));
    fieldClone.minOccurs = 1;
    fieldClone.maxOccurs = 1;

    let input = (
      <div>
        <a href='' onClick={e => {
          e.preventDefault();
          this.setState({addingNewValue: true});
        }}>
          Add an alternative value...
        </a>
      </div>
    );
    if (addingNewValue && formTemplate) {
      input = (
        <ResourceEditorForm
          newSubjectTemplate={target.value}
          fields={[fieldClone]}
          persistence={this}
          browserPersistence={false}
          postAction={() => this.setState({addingNewValue: false})}
        >
          <FormGroup>
            {formTemplate}
          </FormGroup>
          <div data-flex-layout='row top-right'>
            <Button bsStyle='danger'
              onClick={() => this.setState({addingNewValue: false})}>
              Cancel
            </Button>
            <button name='submit'
              className='btn btn-success'
              style={{marginLeft: 12}}>
              Submit
            </button>
          </div>
        </ResourceEditorForm>
      );
    }
    return (
      <FormGroup>
        <ControlLabel>New Value</ControlLabel>
        {input}
      </FormGroup>
    );
  }

  private renderNarrative() {
    const {addingNarrative, narrative} = this.state;
    let input = (
      <div>
        <a href='' onClick={e => {
          e.preventDefault();
          this.setState((prevState: State): State =>
            ({addingNarrative: !prevState.addingNarrative})
          );
        }}>
          Add semantic narrative...
        </a>
        {addingNarrative ? (
          <Panel collapsible expanded={addingNarrative}>
            <DropArea alwaysVisible={true}
              query={SEMANTIC_NARRATIVE_ASK_QUERY}
              repository='assets'
              onDrop={narrative => this.setState({narrative})}
              dropMessage='You can drag and drop Semantic Narrative from Clipboard here, to use it as a description' />
          </Panel>
        ) : null}
      </div>
    );
    if (narrative) {
      input = (
        <div>
          <ResourceLinkComponent iri={narrative.value} />
        </div>
      );
    }
    return (
      <FormGroup>
        <ControlLabel>Narrative</ControlLabel>
        {input}
      </FormGroup>
    );
  }

  private renderAssertionForm() {
    const {field, title, description, beliefs, assertionIri, status} = this.state;
    if (!field) { return null; }
    const isSaving = status === Status.Saving;
    const isSaveDisabled = isSaving
      || status === Status.Loading
      || title.length === 0
      || beliefs.isEmpty()
      || beliefs.some(({belief}) => belief.value === SimpleBeliefValue.NoOpinion);
    return (
      <div>
        <hr />
        <h4>New Assertion</h4>
        <FormGroup>
          <ControlLabel>Title*</ControlLabel>
          <FormControl type='text'
            value={title}
            placeholder='Enter assertion title...'
            onChange={e =>
              this.setState({title: (e.target as HTMLInputElement).value})
            } />
        </FormGroup>
        <FormGroup>
          <ControlLabel>Description</ControlLabel>
          <FormControl componentClass='textarea'
            value={description}
            placeholder='Enter assertion description...'
            onChange={e =>
              this.setState({description: (e.target as HTMLTextAreaElement).value})
            } />
        </FormGroup>
        {this.renderNarrative()}
        {this.renderNewValueForm()}
        <Button bsStyle='primary'
          onClick={this.onSaveAssertion}
          disabled={isSaveDisabled}>
          {isSaving ? (
            <span>
              {assertionIri ? 'Updating' : 'Saving'}
              <i className='fa fa-cog fa-spin' style={{marginLeft: 5}} />
            </span>
          ) : (
            assertionIri ? 'Update Assertion' : 'Save Assertion'
          )}
        </Button>
      </div>
    );
  }

  private renderValue = (
    value: {
      value: Rdf.Node;
      isCanonical: boolean;
      hasArgument: boolean;
    },
    index: number
  ) => {
    const {valueTemplate} = this.props;
    const {field} = this.state;
    const className = classnames({
      [styles.dot]: true,
      [styles.item]: true,
      [styles.canonical]: value.isCanonical,
      [styles.notCanonical]: !value.isCanonical,
      [styles.hasArgument]: value.hasArgument,
    });
    return (
      <div key={index} className={styles.row}>
        <div className={styles.dotCell}>
          <span className={className} />
        </div>
        <div className={styles.valueCell}>
          <TemplateItem template={{
            source: valueTemplate,
            options: {value, field: normalizeFieldDefinition(field)}
          }}/>
        </div>
        <div className={styles.beliefCell}>
          <Belief forValue={value.value.value} isCanonical={value.isCanonical} />
        </div>
      </div>
    );
  }

  private renderNote() {
    return (
      <div>
        <span className={`label ${styles.label} ${styles.canonical}`}>
          BRITISH MUSEUM
        </span><br/>
        <span className={`label ${styles.label} ${styles.notCanonical}`}>
          COMMUNITY
        </span><br/>
        <div className={styles.note}>
          <span className={
            `${styles.dot} ${styles.canonical} ${styles.hasArgument} ${styles.noteDot}`
          } />
          <span className={
            `${styles.dot} ${styles.notCanonical} ${styles.hasArgument} ${styles.noteDot}`
          } />
          <i className={styles.note}>Has an argument given in support of a belief</i>
        </div>
        <div className={styles.note}>
          <span className={`${styles.dot} ${styles.canonical} ${styles.noteDot}`}/>
          <span className={`${styles.dot} ${styles.notCanonical} ${styles.noteDot}`}/>
          <i className={styles.note}>No argument given</i>
        </div>
      </div>
    );
  }

  private renderValues() {
    const {field, values, newValues}  = this.state;
    if (!field) { return null; }
    if (!values) {
      return <Spinner />;
    }
    return (
      <div>
        <div className={styles.row}>
          <div className={styles.dotCell} />
          <div className={styles.valueCell}>
            <strong>Value</strong>
          </div>
          <div className={styles.beliefCell}>
            <i className={styles.beliefTitle}>Do you agree?</i>
          </div>
        </div>
        <div className={styles.body}>
          {!values.length && !newValues.length
            ? <i>No Values</i>
            : <div>
              {values.map(this.renderValue)}
              {newValues.map((value, index) =>
                this.renderValue({value, isCanonical: false, hasArgument: false}, index)
              )}
            </div>}
        </div>
        {this.renderNote()}
      </div>
    );
  }

  render() {
    const {fields, field, assertionIri, status}  = this.state;
    if (status === Status.Loading) {
      return <Spinner />;
    }
    return <div>
      <FormGroup>
        <ControlLabel>Field to assert on</ControlLabel>
        {assertionIri ? (
          <FormControl type='text'
          value={getPreferredLabel(field.label)}
          disabled={true} />
        ) : (
          <ReactSelect value={field ? field.iri : undefined}
          options={fields.map(field =>
            ({value: field.iri, label: getPreferredLabel(field.label)})
          )}
          onChange={(newValue: { value: string }) => {
            const newField = newValue
              ? fields.find(field => field.iri === newValue.value)
              : undefined;
            this.setState({field: newField});
          }} />
        )}
      </FormGroup>
      {this.renderValues()}
      {this.renderAssertionForm()}
    </div>;
  }

  persist(
    initialModel: CompositeValue, currentModel: CompositeValue
  ): Kefir.Property<void> {
    const {target, field} = this.state;
    return this.persistCompositeValue(initialModel, currentModel).map(
      values =>
        this.setState((prevState: State): State => {
          const belief = AssertionsComponent.getDefaultBelief(
            target, field, values[0], false, 'default'
          );
          belief.belief.value = SimpleBeliefValue.Agree;
          return {
            beliefs: prevState.beliefs.set(values[0], belief),
            newValues: prevState.newValues.concat(values),
          };
        })
    );
  }

  private persistCompositeValue(
    initialModel: CompositeValue, currentModel: CompositeValue
  ): Kefir.Property<ReadonlyArray<Rdf.Node>> {
    const {target} = this.state;
    const entries = computeModelDiff(FieldValue.empty, currentModel);
    if (entries.length > 1) {
      const topLevelFieldValue =
        _.find(entries, entry => entry.subject.equals(target));
      const nestedValues =
        _.filter(entries, entry => !entry.subject.equals(target));
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

export default AssertionComponent;

function compareFieldDefinitionsByLabel(
  a: ArgumentsFieldDefinition, b: ArgumentsFieldDefinition
): number {
  if (a.label < b.label) {
    return - 1;
  }
  if (a.label > b.label) {
    return 1;
  }
  return 0;
}
