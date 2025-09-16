/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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

import React, { createFactory, createElement, FormEvent, ChangeEvent } from 'react';
import * as D from 'react-dom-factories';

import * as bem from 'bem-cn';
import * as ReactBootstrap from 'react-bootstrap';
import ReactSelectComponent from 'react-select';
import TextareaAutosize from 'react-textarea-autosize';
import { Just, Nothing } from 'data.maybe';
import * as classnames from 'classnames';

import { Component } from 'platform/api/components';
import { Rdf, vocabularies } from 'platform/api/rdf';
import { SparqlUtil } from 'platform/api/sparql';
import { navigateToResource } from 'platform/api/navigation';
import { LdpService } from 'platform/api/services/ldp';
import { ConfigHolder } from 'platform/api/services/config-holder';

import { SparqlEditor } from 'platform/components/sparql-editor';
import {
  SemanticTreeInput,
  SemanticTreeInputProps,
  TreeSelection,
  createDefaultTreeQueries,
} from 'platform/components/semantic/lazy-tree';
import { Spinner } from 'platform/components/ui/spinner';
import { CopyToClipboardComponent } from 'platform/components/copy-to-clipboard';

import row from './FieldEditorRow';
import {
  State,
  Value,
  LocalizedValue,
  getFieldDefitionState,
  createFieldDefinitionGraph,
  unwrapState,
  ValidatedTreeConfig,
} from './FieldEditorState';
import { TreePatternsEditor } from './TreePatternsEditor';
import * as Validation from './Validation';
import { FieldEditorLabel } from './FieldEditorLabel';

import './field-editor.scss';
import Icon from 'platform/components/ui/icon/Icon';
import  ResourceLinkComponent, {ResourceLinkProps }  from 'platform/api/navigation/components/ResourceLinkComponent';
import { OverlayTrigger, Popover } from 'react-bootstrap';

const btn = createFactory(ReactBootstrap.Button);
const bsrow = createFactory(ReactBootstrap.Row);
const bscol = createFactory(ReactBootstrap.Col);
const input = createFactory(ReactBootstrap.FormControl);
const textarea = createFactory(TextareaAutosize);
const select = createFactory(ReactSelectComponent);

const FIELD_DEF_INSTANCE_BASE = 'http://www.researchspace.org/pattern/';
const CLASS_NAME = 'field-editor';
const block = bem(CLASS_NAME);

interface Props {
  /**
   * IRI of the knowledge pattern to be edited.
   */
  fieldIri?: string;
  /**
   * Optional string to make the base IRI being used
   * for creating new knowledge patterns configurable
   */
  fieldInstanceBaseIri?: string;
  /**
   * Full IRI enclosed in <> or prefixed IRI
   */
  categoryScheme?: string;
  /**
   * URI to navigate after saving/updating a field.
   */
  navigateTo?: string;

   /**
   * hide form actions (KP update): for eg. when KP is type 'system' or from an ontology
   *
   * @default false
   */
  hideFormActions?: boolean;

  badgeLabel?: string;

  badgeTooltip?: string;

}

/* Default queries to be set on the SPARQL input elements as placeholders */
const DEFAULT_INSERT = 'INSERT { $subject ?predicate $value} WHERE {}';
const DEFAULT_SELECT = `SELECT ?value ?label WHERE {
  $subject ?predicate ?value.
  ?value rdfs:label ?label.
}`;
const DEFAULT_DELETE = 'DELETE { $subject ?predicate $value} WHERE {}';
const DEFAULT_ASK = 'ASK {}';
const DEFAULT_VALUE_SET = `SELECT ?value ?label WHERE {
  ?value a ?anyType ;
    rdfs:label ?label .
}`;
const DEFAULT_AUTOSUGGESTION = `SELECT ?value ?label WHERE {
  ?value a ?anyType ;
    rdfs:label|crm:P190_has_symbolic_content ?label .
  FILTER REGEX(STR(?label), "?token", "i")
} LIMIT 10`;

class FieldEditorComponent extends Component<Props, State> {
  static readonly defaultProps: Partial<Props> = {
    categoryScheme: '<http://www.researchspace.org/resource/system/FieldCategories>',
    navigateTo: 'http://www.researchspace.org/resource/system/fieldDefinitionContainer',
  };
  private readonly languages: ReadonlyArray<string>;

  constructor(props: Props, context: any) {
    super(props, context);
    const [categoryScheme] = SparqlUtil.resolveIris([this.props.categoryScheme]);
    const categoryQueries = createDefaultTreeQueries({ scheme: categoryScheme.value });
    this.languages = ConfigHolder.getUIConfig().preferredLanguages;

    this.state = {
      id: Nothing<Value>(),
      label: [] as LocalizedValue[],
      description: Nothing<Value>(),
      categories: [],
      domain: [] as Value[],
      xsdDatatype: Nothing<Value>(),
      range: [] as Value[],
      min: Nothing<Value>(),
      max: Nothing<Value>(),
      order: Nothing<Value>(),
      defaults: [] as Value[],
      testSubject: Nothing<Value>(),
      insertPattern: Nothing<Value>(),
      selectPattern: Nothing<Value>(),
      deletePattern: Nothing<Value>(),
      askPattern: Nothing<Value>(),
      valueSetPattern: Nothing<Value>(),
      autosuggestionPattern: Nothing<Value>(),
      treePatterns: Nothing<ValidatedTreeConfig>(),

      isLoading: this.isEditMode(),
      isValid: false,
      categoryQueries,
    };
  }

  public componentDidMount() {
    // only if in edit mode, we try to fetch an existing
    // knowledge pattern (as identified by the provided fieldIri
    // from backend and de-serialize it back to the component state.
    if (this.isEditMode()) {
      const fieldIri = Rdf.iri(this.props.fieldIri);
      getFieldDefitionState(fieldIri).observe({
        value: (state) => this.setState(state),
      });
    }
  }

  public render() {
    return D.div(
      { className: block('').toString() },
      this.state.isLoading ? createElement(Spinner) : this.renderEditor()
    );
  }

  /**
   * Renders the editor in a row / column layout using different input elements.
   *
   * Each input emits values on change into respective pools i.e. input elements
   * do not provide any validation on their own.
   */
  private isMaxSet() {
    const { max } = this.state;
    return max.isJust && parseInt(max.get().value) >= 1;
  }

  private defaultsUpToMax() {
    const { defaults, max } = this.state;
    if (!this.isMaxSet()) {
      return defaults;
    }
    const maxInt = parseInt(max.get().value);
    return defaults.slice(0, maxInt);
  }

  private renderFormActions() {
    return D.div(
      { style: { display: 'flex', alignItems: 'center', justifyContent:'end', gap:'5px', margin: '5px 0' } },
      btn(
        {
          bsStyle:'default',
          className:'btn-action',
          disabled: !this.state.isValid,
          onClick: () => this.onSaveOrUpdate()
        },
        this.isEditMode() ? 'Update' : 'Create'
      ),
      btn(
        {
          bsStyle:'default',
          className:'btn-action',
          disabled: !this.state.isValid,
          onClick: () => this.onSaveOrUpdate(this.props.navigateTo)
        },
        this.isEditMode() ? 'Update and Close' : 'Create and Close'
      )
    )
  }

  private renderFormBadge() {
    const label = this.props.badgeLabel || 'my label'
    const tooltip = this.props.badgeTooltip || 'my tooltip'
    return (
        <div style={ {position:'relative'} }>
          <span className='badge badge--secondary' style={{height: '32px', padding: '0 15px'}}>{label}</span>
          <OverlayTrigger
            trigger={['hover', 'click']}
            placement="bottom"
            overlay={<Popover id="tooltip">{tooltip}</Popover>}
          >
            <Icon iconType='rounded' iconName='help' symbol style={ {position:'absolute', top: '-5px', right: '-2px', fontSize: '20px'} }/>
          </OverlayTrigger>
        </div>
    )
  }

  private renderEditor = () => {
    const empty = Just<Value>({ value: '' });
    const nothing = Nothing<Value>();
    const lang = this.languages.find((language) => !this.state.label.find((label) => label.lang === language));
    const langOptions = this.languages.map((language) => {
      const isLabelAlreadyExists = Boolean(this.state.label.find((label) => label.lang === language));
      return { value: language, label: language, disabled: isLabelAlreadyExists };
    });
    const addLabel = () => {
      const label = [...this.state.label];
      const validatedLabel = Validation.validateLabel('');
      label.push({ value: validatedLabel, lang: lang || '' });
      this.updateState({ label });
    };
    return D.div(
      {style: { display: 'flex', flexDirection: 'column', height: '100%' } },
      D.div({style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        D.div( {}, 
        this.isEditMode() ? 
          D.div ({ className: 'page__section-container__label-tab', style: {   } },'Knowledge pattern details') : 
          D.h2 ({style: {  margin: '0' }},'New Knowledge pattern')
        ),
        this.hideFormActions() ? this.renderFormBadge() : this.renderFormActions(),
      ),
      D.div({className: 'page__section-container'}, 
        row({
          label: 'Label *',
          expanded: this.state.label.length>0,
          expandOnMount: true,
          onExpand: () => addLabel(),
          element: [
            this.state.label.map((label, index) => this.renderLabel(label, index, langOptions)),
            Boolean(lang) ? 
            D.button ({className:'btn btn-secondary btn-textAndIcon', key:'button_class', onClick: () => addLabel()},
                D.i ({className: 'material-icons-round', key:'italics_icons'}, 'add_box'),
                D.span ({}, 'Label')
              ) : null,
          ],
        }),
        row({
          label: 'Identifier *',
          expanded: this.state.id.isJust,
          expandOnMount: true,
          onExpand: () => this.updateValues({ id: empty }, Validation.validateIri),
          error: this.state.id.map((v) => v.error).getOrElse(undefined),
          element: D.div({ className: 'inputAndButton-wrapper' }, 
            input({
              className: block('iri-input').toString(),
              type: 'text',
              placeholder: 'Enter IRI to be used as unique identifier for the knowledge pattern',
              onChange: (e) => this.updateValues({ id: getFormValue(e) }, Validation.validateIri),
              value: this.state.id.isJust ? this.state.id.get().value : undefined,
              disabled: this.isEditMode(),
            }),
            D.div(
              { },
              this.isEditMode()
                ? this.renderCopyToClipboardButton()
                : btn(
                    {
                      title: 'Generate IRI',
                      className: 'btn btn-default',
                      onClick: (e) => this.generateIRI(),
                    },
                    createElement(Icon, {
                      iconName: 'autorenew',
                      iconType: 'round'
                    }) 
                  )
            ),
          ),
        }),
        row({
          label: 'Description',
          expanded: this.state.description.isJust,
          onExpand: () => this.updateValues({ description: empty }),
          onCollapse: () => this.updateValues({ description: nothing }),
          element: textarea({
            className: classnames('form-control', block('description-input').toString()),
            rows: 4,
            placeholder: 'Enter description (displayed in input info button)',
            onChange: (e) => this.updateValues({ description: getFormValue(e) }),
            value: this.state.description.isJust ? this.state.description.get().value : undefined,
          }),
        }),
        row({
          label: 'Categories',
          expanded: true,
          element: [
            D.div({className: 'inputAndButton-wrapper'},
            createElement(SemanticTreeInput, {
            ...this.state.categoryQueries,
            initialSelection: this.state.categories,
            multipleSelection: true,
            placeholder: 'Select a knowledge pattern category',
            onSelectionChanged: (selection) => {
              const categories = TreeSelection.leafs(selection)
                .map((node) => node.iri)
                .toArray();
              this.updateState({ categories });
            },
          } as SemanticTreeInputProps),           
          createElement(ResourceLinkComponent, {
            "target": "_blank",
            "uri": ConfigHolder.getDashboard().value,
            "urlqueryparam-view": "authority-list",
            "urlqueryparam-resource": "http://www.researchspace.org/resource/system/FieldCategories"
          } as ResourceLinkProps, btn(
            {
              className: 'btn btn-default',
            },
            D.i({ className: 'fa fa-book' })
          ))
          ),],
        }),
        this.renderMultipleValuesInput({
          values: this.state.domain,
          label: 'Domains',
          addButtonLabel: 'Domain',
          showAddButton: true,
          placeholder: 'Any IRI to be used as domain for the knowledge pattern.',
          onChange: (value, index) => {
            const domain = [...this.state.domain];
            domain[index] = Validation.validateIri(value);
            this.updateState({ domain });
          },
          onAdd: () => {
            const domain = [...this.state.domain, Validation.validateIri('')];
            this.updateState({ domain });
          },
          onDelete: (index) => {
            const domain = [...this.state.domain];
            domain.splice(index, 1);
            this.updateState({ domain });
          },
        }),
        row({
          label: 'XSD Datatype',
          expanded: this.state.xsdDatatype.isJust,
          onExpand: () => this.updateValues({ xsdDatatype: empty }),
          onCollapse: () => this.updateValues({ xsdDatatype: nothing }),
          error: this.state.xsdDatatype.map((v) => v.error).getOrElse(undefined),
          element: select({
            value: this.state.xsdDatatype.map((v) => v.value).getOrElse(undefined),
            className: block('xsd-input').toString(),
            multi: false,
            clearable: false,
            placeholder: 'Select any XSD datatype',
            options: vocabularies.xsd.LIST_TYPES,
            onChange: (e: Value) => this.updateValues({ xsdDatatype: Just({ value: e.value }) }),
            labelKey: 'label',
            valueKey: 'value',
          }),
        }),
        this.renderMultipleValuesInput({
          values: this.state.range,
          label: 'Ranges',
          addButtonLabel: 'Range',
          showAddButton: true,
          placeholder: 'Any IRI to be used as range for the knowledge pattern.',
          onChange: (value, index) => {
            const range = [...this.state.range];
            range[index] = Validation.validateIri(value);
            this.updateState({ range });
          },
          onAdd: () => {
            const range = [...this.state.range, Validation.validateIri('')];
            this.updateState({ range });
          },
          onDelete: (index) => {
            const range = [...this.state.range];
            range.splice(index, 1);
            this.updateState({ range });
          },
        }),
        row({
          label: 'Min. Cardinality',
          expanded: this.state.min.isJust,
          onExpand: () => this.updateValues({ min: Just({ value: '0' }) }, Validation.validateMin),
          onCollapse: () => this.updateValues({ min: nothing }),
          error: this.state.min.map((v) => v.error).getOrElse(undefined),
          element: input({
            className: block('min-input').toString(),
            type: 'number',
            min: 0,
            step: 1,
            placeholder: 'Any positive number from 0 to n. "0" for not required.',
            onChange: (e) => this.updateValues({ min: getFormValue(e) }, Validation.validateMin),
            value: this.state.min.map((v) => v.value).getOrElse(undefined),
          }),
        }),
        row({
          label: 'Max. Cardinality',
          expanded: this.state.max.isJust,
          onExpand: () => this.updateValues({ max: Just({ value: '1' }) }, Validation.validateMax),
          onCollapse: () => this.updateValues({ max: nothing }),
          error: this.state.max.map((v) => v.error).getOrElse(undefined),
          element: input({
            className: block('max-input').toString(),
            type: 'text',
            placeholder: 'Any positive number from 1 to n. "unbound" for unlimited.',
            onChange: (e) => this.updateValues({ max: getFormValue(e) }, Validation.validateMax),
            value: this.state.max.map((v) => v.value).getOrElse(undefined),
          }),
        }),
        row({
          label: 'Order',
          expanded: this.state.order.isJust,
          onExpand: () => this.updateValues({ order: Just({ value: '1' }) }, Validation.validateOrder),
          onCollapse: () => this.updateValues({ order: nothing }),
          error: this.state.order.map((v) => v.error).getOrElse(undefined),
          element: input({
            className: block('order-input').toString(),
            type: 'text',
            placeholder: 'Any positive number greater than 0.',
            onChange: (e) => this.updateValues({ order: getFormValue(e) }, Validation.validateOrder),
            value: this.state.order.map((v) => v.value).getOrElse(undefined),
          }),
        }),
        this.renderMultipleValuesInput({
          values: this.defaultsUpToMax(),
          label: 'Default values',
          addButtonLabel: 'Default value',
          showAddButton: !(this.isMaxSet() && this.state.defaults.length >= parseInt(this.state.max.get().value)),
          onChange: (value, index) => {
            const defaults = [...this.defaultsUpToMax()];
            defaults[index] = { value };
            this.updateState({ defaults });
          },
          onAdd: () => {
            const defaults = [...this.defaultsUpToMax(), { value: '' }];
            this.updateState({ defaults });
          },
          onDelete: (index) => {
            const defaults = [...this.defaultsUpToMax()];
            defaults.splice(index, 1);
            this.updateState({ defaults });
          },
        }),
        row({
          label: 'Test Subject',
          expanded: this.state.testSubject.isJust,
          onExpand: () => this.updateValues({ testSubject: empty }, Validation.validateIri),
          onCollapse: () => this.updateValues({ testSubject: nothing }),
          error: this.state.testSubject.map((v) => v.error).getOrElse(undefined),
          element: input({
            className: block('label-input').toString(),
            type: 'text',
            placeholder: `IRI of any entity to be used for testing the patterns of the field.`,
            onChange: (e) => this.updateValues({ testSubject: getFormValue(e) }, Validation.validateIri),
            value: this.state.testSubject.isJust ? this.state.testSubject.get().value : undefined,
          }),
        }),
        row({
          label: 'Insert Pattern*',
          expanded: this.state.insertPattern.isJust,
          expandOnMount: true,
          onExpand: () =>
            this.updateValues({ insertPattern: Just({ value: DEFAULT_INSERT }) }, Validation.validateInsert),
          error: this.state.insertPattern.map((v) => v.error).getOrElse(undefined),
          element: createElement(SparqlEditor, {
            onChange: (e) => this.updateValues({ insertPattern: Just({ value: e.value }) }, Validation.validateInsert),
            syntaxErrorCheck: false,
            query: this.state.insertPattern.map((v) => v.value).getOrElse(''),
          }),
        }),
        row({
          label: 'Select Pattern',
          expanded: this.state.selectPattern.isJust,
          onExpand: () =>
            this.updateValues({ selectPattern: Just({ value: DEFAULT_SELECT }) }, Validation.validateSelect),
          onCollapse: () => this.updateValues({ selectPattern: nothing }),
          error: this.state.selectPattern.map((v) => v.error).getOrElse(undefined),
          element: createElement(SparqlEditor, {
            onChange: (e) => this.updateValues({ selectPattern: Just({ value: e.value }) }, Validation.validateSelect),
            syntaxErrorCheck: false,
            query: this.state.selectPattern.map((v) => v.value).getOrElse(''),
          }),
        }),
        row({
          label: 'Delete Pattern',
          expanded: this.state.deletePattern.isJust,
          onExpand: () =>
            this.updateValues({ deletePattern: Just({ value: DEFAULT_DELETE }) }, Validation.validateDelete),
          onCollapse: () => this.updateValues({ deletePattern: nothing }),
          error: this.state.deletePattern.map((v) => v.error).getOrElse(undefined),
          element: createElement(SparqlEditor, {
            onChange: (e) => this.updateValues({ deletePattern: Just({ value: e.value }) }, Validation.validateDelete),
            syntaxErrorCheck: false,
            query: this.state.deletePattern.map((v) => v.value).getOrElse(''),
          }),
        }),
        row({
          label: 'ASK Validation Pattern',
          expanded: this.state.askPattern.isJust,
          onExpand: () => this.updateValues({ askPattern: Just({ value: DEFAULT_ASK }) }, Validation.validateAsk),
          onCollapse: () => this.updateValues({ askPattern: nothing }),
          error: this.state.askPattern.map((v) => v.error).getOrElse(undefined),
          element: createElement(SparqlEditor, {
            onChange: (e) => this.updateValues({ askPattern: Just({ value: e.value }) }, Validation.validateAsk),
            syntaxErrorCheck: false,
            query: this.state.askPattern.map((v) => v.value).getOrElse(''),
          }),
        }),
        row({
          label: 'Value Set Pattern',
          expanded: this.state.valueSetPattern.isJust,
          onExpand: () =>
            this.updateValues({ valueSetPattern: Just({ value: DEFAULT_VALUE_SET }) }, Validation.validateValueSet),
          onCollapse: () => this.updateValues({ valueSetPattern: nothing }),
          error: this.state.valueSetPattern.map((v) => v.error).getOrElse(undefined),
          element: createElement(SparqlEditor, {
            onChange: (e) =>
              this.updateValues({ valueSetPattern: Just({ value: e.value }) }, Validation.validateValueSet),
            syntaxErrorCheck: false,
            query: this.state.valueSetPattern.map((v) => v.value).getOrElse(''),
          }),
        }),
        row({
          label: 'Autosuggestion Pattern',
          expanded: this.state.autosuggestionPattern.isJust,
          onExpand: () =>
            this.updateValues(
              { autosuggestionPattern: Just({ value: DEFAULT_AUTOSUGGESTION }) },
              Validation.validateAutosuggestion
            ),
          onCollapse: () => this.updateValues({ autosuggestionPattern: nothing }),
          error: this.state.autosuggestionPattern.map((v) => v.error).getOrElse(undefined),
          element: createElement(SparqlEditor, {
            onChange: (e) =>
              this.updateValues({ autosuggestionPattern: Just({ value: e.value }) }, Validation.validateAutosuggestion),
            syntaxErrorCheck: false,
            query: this.state.autosuggestionPattern.map((v) => v.value).getOrElse(''),
          }),
        }),
        row({
          label: 'Tree Patterns',
          expanded: this.state.treePatterns.isJust,
          onExpand: () =>
            this.updateState({
              treePatterns: Just<ValidatedTreeConfig>({ type: 'simple' }),
            }),
          onCollapse: () =>
            this.updateState({
              treePatterns: Nothing<ValidatedTreeConfig>(),
            }),
          element: createElement(TreePatternsEditor, {
            config: this.state.treePatterns.getOrElse({ type: 'simple' }),
            onChange: (config: ValidatedTreeConfig) => {
              const validated = Validation.validateTreeConfig(config);
              this.updateState({ treePatterns: Just(validated) });
            },
          }),
        })
      )
    );
  };

  private renderLabel = (
    { value, lang }: LocalizedValue,
    index: number,
    langOptions: Array<{ value: string; label: string; disabled: boolean }>
  ) => {
    const isRequired = index === 0;
    return createElement(FieldEditorLabel, {
      label: { value, lang },
      isRequired,
      langOptions,
      onChangeLabelValue: (newValue) => this.updateLabelValue(index, isRequired, newValue),
      onChangeLabelLang: (newLang: string) => {
        const label = [...this.state.label];
        label[index] = { ...label[index], lang: newLang };
        this.updateState({ label });
      },
      onDeleteLabel: () => {
        const label = [...this.state.label];
        label.splice(index, 1);
        this.updateState({ label });
      },
    });
  };

  private updateLabelValue(index: number, isRequired: boolean, newValue: string) {
    const labels = [...this.state.label];
    const { value, lang } = labels[index];

    const oldGeneratedId = this.generateIriFromLabel(value.value);

    const validatedValue = Validation.validateLabel(newValue);
    labels[index] = { value: validatedValue, lang };
    this.updateState({ label: labels });

    const shouldUpdateId =
      isRequired &&
      !this.isEditMode() &&
      this.state.id.map((v) => !v.value || v.value === oldGeneratedId).getOrElse(true);

    if (shouldUpdateId) {
      const generatedId = this.generateIriFromLabel(newValue);
      this.updateValues({ id: Just({ value: generatedId }) }, Validation.validateIri);
    }
  }

  private renderCopyToClipboardButton = () => {
    const value = this.state.id.isJust ? this.state.id.get().value : '';
    const button = btn({ title: 'Copy identifier' }, D.span({className: 'material-icons-round'}, 'copy'));
    return createElement(CopyToClipboardComponent, { text: value }, button);
  };

  private renderMultipleValuesInput(params: {
    values: ReadonlyArray<Value>;
    label: string;
    addButtonLabel: string;
    showAddButton: boolean;
    placeholder?: string;
    onChange: (value: string, index: number) => void;
    onAdd: () => void;
    onDelete: (index: number) => void;
  }) {
    const { values, label, addButtonLabel, showAddButton, placeholder, onChange, onAdd, onDelete } = params;
    return row({
      label,
      expanded: true,
      element: [
        values.map(({ value, error }, index) => [
          D.div(
            { className: block('default-input-holder').toString() },
            input({
              className: block('default-input').toString(),
              type: 'text',
              placeholder,
              onChange: (e) => onChange((e.target as HTMLInputElement).value, index),
              value,
            }),
            btn(
              {
                className: block('delete-default').toString(),
                onClick: () => onDelete(index),
              },
              D.span({className: 'material-icons-round'}, 'close')
            )
          ),
          error ? D.div({ className: block('error').toString() }, error.message) : null,
        ]),
        showAddButton ? 
        D.button ({className:'btn btn-secondary btn-textAndIcon', key:'multiple_values_button', onClick: onAdd},
              D.i ({className: 'material-icons-round',key:'italics_multiple_values_button'}, 'add_box'),
              D.span ({}, addButtonLabel)
            ) : null,
      ],
    });
  }

  private isEditMode = (): boolean => {
    return Boolean(this.props.fieldIri);
  };

  private hideFormActions = (): boolean => {
    return Boolean(this.props.hideFormActions);
  };

  private updateValues(
    values: Partial<State> & Record<string, Data.Maybe<Value>>,
    validate?: (value: string) => Value
  ) {
    const validatedValues = Object.keys(values).reduce<Partial<State>>((acc, key) => {
      const original = values[key];
      const validated = original.map<Value>((v) => (validate ? validate(v.value) : { value: v.value }));
      acc[key] = validated;
      return acc;
    }, {});

    this.updateState(validatedValues);
  }

  private updateState(update: Partial<State>) {
    const newState = { ...this.state, ...update };
    const errors = Validation.collectStateErrors(newState); 
    this.setState({ ...update, isValid: errors.length === 0 });
  }

  private generateIRI = () => {
    const local = this.state.label.length > 0 ? encodeURIComponent(this.state.label[0].value.value) : Date.now();
    const id = this.getFieldInstanceIriBase() + local;
    this.updateValues({ id: Just({ value: id }) }, Validation.validateIri);
  };

  private generateIriFromLabel(v: string): string {
    return this.getFieldInstanceIriBase() + encodeURIComponent(v);
  }

  /**
   * Returns base IRI to be used for storing new knowledge patterns.
   * If not configured as attribute on the field editor, it will return a
   * standard LdpBase prefix + 'fieldDefinitionContainer/' or {@FIELD_DEF_INSTANCE_BASE}.
   */
  private getFieldInstanceIriBase = (): string => {
    if (this.props.fieldInstanceBaseIri) {
      return this.props.fieldInstanceBaseIri;
    } else if (SparqlUtil.RegisteredPrefixes['LdpBase']) {
      // fieldDefinitionContainer is local name of the FieldDefinitionContainer IRI
      // see FieldDefinitionContainer.java
      return SparqlUtil.RegisteredPrefixes['LdpBase'] + 'fieldDefinitionContainer/';
    } else {
      return FIELD_DEF_INSTANCE_BASE;
    }
  };

  /**
   * Action for save or update button. Saves the graph (i.e. the knowledge pattern)
   * using LDP api.
   */
  private onSaveOrUpdate = (navigateTo?: string) => {
    const finalGraph = tryCreateFinalGraph(this.state);
    if (finalGraph.isNothing) {
      return;
    }

    const graph = finalGraph.get();
    const ldp = new LdpService(vocabularies.VocabPlatform.FieldDefinitionContainer.value);

    if (this.isEditMode()) {
      ldp.update(Rdf.iri(this.state.id.get().value), graph).onValue(() => {
        if (navigateTo) {
          navigateToResource(Rdf.iri(navigateTo), {}, 'assets').onValue((v) => v);
        } else {
          window.location.reload();
        }
      });
    } else {
      return ldp
        .addResource(graph, Just(this.state.id.get().value))
        .flatMap((newResourceIri) => {
          const resourceIri = navigateTo ? Rdf.iri(navigateTo) : newResourceIri;
          return navigateToResource(resourceIri, {}, 'assets');
        })
        .onValue((v) => v);
    }
  };
}

/**
 * Simple helper to convert the current value of any HTMLInputElement into
 * a Kefir observable.
 */
function getFormValue(e: FormEvent<ReactBootstrap.FormControl> | ChangeEvent<HTMLTextAreaElement>): Data.Maybe<Value> {
  const text = (e.target as HTMLInputElement).value;
  return Just({ value: text });
}

function tryCreateFinalGraph(state: State): Data.Maybe<Rdf.Graph> {
  const fields = unwrapState(state);

  // ignore these cases where iri, label or insert are undefined
  if (!fields.id || !fields.label || !fields.insertPattern) {
    return Nothing<Rdf.Graph>();
  }

  const graph = createFieldDefinitionGraph(fields);
  return Just(graph);
}

export type component = FieldEditorComponent;
export const component = FieldEditorComponent;
export const factory = createFactory(component);
export default component;
