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
import * as React from 'react';
import { Button } from 'react-bootstrap';
import * as Immutable from 'immutable';
import * as D from 'react-dom-factories';

import { Rdf } from 'platform/api/rdf';

import {
  SemanticTreeInput,
  Node as TreeNode,
  SelectionNode,
  TreeSelection,
  ComplexTreePatterns,
  createDefaultTreeQueries,
  LightwightTreePatterns,
} from 'platform/components/semantic/lazy-tree';

import { FieldDefinition, getPreferredLabel, TreeQueriesConfig, SimpleTreeConfig } from '../FieldDefinition';
import { FieldValue, AtomicValue, ErrorKind } from '../FieldValues';
import {
  MultipleValuesInput,
  MultipleValuesProps,
  MultipleValuesHandlerProps,
  CardinalityCheckingHandler,
} from './MultipleValuesInput';
import { NestedModalForm, tryExtractNestedForm } from './NestedModalForm';
import { createDropAskQueryForField } from '../ValidationHelpers';
import Icon from 'platform/components/ui/icon/Icon';

import { ResourceLinkComponent, ResourceLinkContainer } from 'platform/api/navigation/components';
import { Overlay, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { ValidatedTreeConfig } from '../field-editor/FieldEditorState';

interface schemePageButtonConfigProps {
  iri: string;
  view: string;
  scheme: string;
  tooltip?: string;
}
export interface TreePickerInputProps extends MultipleValuesProps {
  placeholder?: string;

  /**
   * Automatically open/close dropdown in full mode when input focused/blurred.
   * @default true
   */
  openDropdownOnFocus?: boolean;

  /**
   * Closes the dropdown when some value is selected.
   *
   * @default true
   */
  closeDropdownOnSelection?: boolean;

  /**
   * Override Tree Patterns from the Field Definition.
   */
  treePatterns?: LightwightTreePatterns | ComplexTreePatterns;

  /**
   * Override scheme from Field Definitions. Overrides the scheme from tree-patterns.
   */
  scheme?: string;

  /**
   * Form template that can be used to create new instance or edit existing one.
   */
  nestedFormTemplate?: string;

  allowForceSuggestion?: boolean;

  schemePageButtonConfig?: schemePageButtonConfigProps;

  queryItemLabel?: string;
  openResourceOnClick?: boolean;
  
}

interface State {
  readonly treeVersionKey?: number;
  readonly treeQueries?: ComplexTreePatterns;
  readonly treeSelection?: ReadonlyArray<Rdf.Iri>;
  readonly treeSelectionSet?: Immutable.Set<Rdf.Iri>;
  readonly nestedFormOpen?: boolean;
  nestedForm?: React.ReactElement<any>;
}

const CLASS_NAME = 'semantic-form-tree-picker-input';

/**
 * Component to select one or many values from a hierarchy represented by a tree selector.
 *
 * @example
 * <semantic-form-tree-picker-input for='place'></semantic-form-tree-picker-input>
 */
export class TreePickerInput extends MultipleValuesInput<TreePickerInputProps, State> {
  static defaultProps: Partial<TreePickerInputProps> = {
    openDropdownOnFocus: true,
    closeDropdownOnSelection: true,
  };

  private htmlElement = React.createRef<HTMLDivElement>();

  constructor(props: TreePickerInputProps, context: any) {
    super(props, context);
    let config = props.definition.treePatterns;
    let newConfig: TreeQueriesConfig;

    if (this.props.treePatterns) {
      if (this.props.treePatterns["rootsQuery"] && 
          this.props.treePatterns["childrenQuery"] && 
          this.props.treePatterns["parentsQuery"] &&
          this.props.treePatterns["searchQuery"]) {
        
        newConfig = {
          type: 'full',
          rootsQuery: this.props.treePatterns["rootsQuery"],
          childrenQuery: this.props.treePatterns["childrenQuery"],
          parentsQuery: this.props.treePatterns["parentsQuery"],
          searchQuery: this.props.treePatterns["searchQuery"],
        };
      }
    }
    
    if (!newConfig) {
    if (props.treePatterns) {
      config = Object.assign(
        {},
        props.definition.treePatterns || {},
        {type: 'simple', ...props.treePatterns} as SimpleTreeConfig)
    }
    if (props.scheme && !config) {
      config = {type: 'simple', scheme: props.scheme };
    } else if (props.scheme && config.type === 'simple') {
      config.scheme = props.scheme;
    }
    } else {config = newConfig;};

    const treeQueries: ComplexTreePatterns = config?.type === 'full' ? config : createDefaultTreeQueries(config);
    
    this.state = { treeVersionKey: 0, treeQueries };
  }

  componentDidMount() {
    tryExtractNestedForm(this.props.children, this.context, this.props.nestedFormTemplate)
      .then(nestedForm => {
        if (nestedForm != undefined) {
          this.setState({nestedForm});
        }
      });
  }

  componentWillReceiveProps(nextProps: TreePickerInputProps) {
    const previousValues = this.state.treeSelectionSet;
    const nextValues = toSetOfIris(nextProps.values);
    const isValuesSame =
      (!previousValues && nextValues.size === 0) ||
      (previousValues &&
        previousValues.equals(
          // workaround for broken typyings for ImmutableJS with TypeScript 2.6.0
          // (Set<T> not assignable to Iterable<T, T>)
          nextValues as Immutable.Iterable<Rdf.Iri, Rdf.Iri>
        ));

    if (!isValuesSame) {
      this.setState(
        (state): State => ({
          treeVersionKey: state.treeVersionKey + 1,
          treeSelection: nextValues.toArray(),
          treeSelectionSet: nextValues,
        })
      );
    }
  }

  render() {
    const { maxOccurs } = this.props.definition;
    const { treeSelection } = this.state;
    const showCreateNewButton = this.state.nestedForm && (!treeSelection || treeSelection.length < maxOccurs);
    return (
      <div className={CLASS_NAME} ref={this.htmlElement}>
        {this.renderTreePicker()}
        {showCreateNewButton ? this.renderCreateNewButton() : null}
        {this.state.nestedFormOpen ? (
          <NestedModalForm
            definition={this.props.definition}
            onSubmit={this.onNestedFormSubmit}
            onCancel={() => this.setState({ nestedFormOpen: false })}
            parent={this.htmlElement}
          >
            {this.state.nestedForm}
          </NestedModalForm>
        ) : null}
        {this.props.schemePageButtonConfig && this.renderSchemePage()}
      </div>
    );
  }

  private onNestedFormSubmit = (value: AtomicValue) => {
    this.setState({ nestedFormOpen: false });
    const values = this.props.values.concat(value);
    this.onValuesChanged(values);
  };

  private renderTreePicker() {
    const { openDropdownOnFocus, closeDropdownOnSelection, definition, queryItemLabel, openResourceOnClick } = this.props;
    const { treeVersionKey, treeQueries, treeSelection } = this.state;
    const { rootsQuery, childrenQuery, parentsQuery, searchQuery } = treeQueries;

    const placeholder =
      typeof this.props.placeholder === 'string'
        ? this.props.placeholder
        : createDefaultPlaceholder(definition);

    const allowForceSuggestion =
      typeof this.props.allowForceSuggestion === 'boolean'
        ? this.props.allowForceSuggestion
        : false;
   
    return (
      <SemanticTreeInput
        key={treeVersionKey}
        droppable={{
          // enable droppable for autocomplete input
          query: createDropAskQueryForField(definition),
          styles: {
            enabled: {
              outline: '2px solid var(--color-dark)'
            },
            disabled: {}
          }
        }}
        className={`${CLASS_NAME}__picker`}
        placeholder={placeholder}
        rootsQuery={rootsQuery}
        childrenQuery={childrenQuery}
        parentsQuery={parentsQuery}
        searchQuery={searchQuery}
        allowForceSuggestion={allowForceSuggestion}
        initialSelection={treeSelection}
        multipleSelection={true}
        openDropdownOnFocus={openDropdownOnFocus}
        closeDropdownOnSelection={closeDropdownOnSelection}
        onSelectionChanged={(selection) => {
          const selectionLeafs = TreeSelection.leafs(selection);
          const selectionSet = selectionLeafs.map((leaf) => leaf.iri).toSet();
          this.setState(
            {
              treeSelection: selectionSet.toArray(),
              treeSelectionSet: selectionSet,
              nestedFormOpen: false,
            },
            () => this.onTreeSelectionChanged(selectionLeafs)
          );
        }}
        queryItemLabel={queryItemLabel}
        openResourceOnClick={openResourceOnClick}
      />
    );
  }

  private onTreeSelectionChanged(leafs: Immutable.List<SelectionNode<TreeNode>>) {
    const values = Immutable.List(
      leafs.map(({ iri, label }) =>
        FieldValue.fromLabeled({
          value: iri,
          label: label ? label.value : undefined,
        })
      )
    );
    this.onValuesChanged(values);
  }

  private onValuesChanged(values: Immutable.List<FieldValue>) {
    const { updateValues, handler } = this.props;
    updateValues(({ errors }) => handler.validate({ values, errors }));
  }

  private renderCreateNewButton() {
    return (
      <Button className={`${CLASS_NAME}__create-button btn-textAndIcon`} onClick={this.toggleNestedForm}>
        <Icon iconType='round' iconName='add_box'/>
        <span>New</span>
      </Button>
    );
  }

  private toggleNestedForm = () => {
    this.setState((state): State => ({ nestedFormOpen: !state.nestedFormOpen }));
  };

  static makeHandler(props: MultipleValuesHandlerProps<TreePickerInputProps>) {
    return new CardinalityCheckingHandler(props);
  }

  private renderSchemePage = () => {
    const { iri, view, scheme, tooltip} = this.props.schemePageButtonConfig

    const overlay = <Tooltip id="SemanticTreeInput__tooltip">{tooltip ? tooltip : 'Open list of terms'}</Tooltip>;
    
    return (
      <OverlayTrigger placement='bottom' overlay={overlay} key='scheme-button-tooltip'>
        <div>
            <ResourceLinkContainer 
              uri={iri} 
              urlqueryparam-view={view}
              urlqueryparam-resource={scheme}
              urlqueryparam-open-as-drag-and-drop="true"
            >
            <Button className={`${CLASS_NAME}__create-button`} style={{height: '100%'}}>
              <span className='fa fa-book'></span>
            </Button>
          </ResourceLinkContainer>
          <span style={{visibility: 'hidden'}}></span>
        </div>
    </OverlayTrigger>
    )
  }

}

function toSetOfIris(values: Immutable.List<FieldValue>) {
  return values
    .filter((v) => FieldValue.isAtomic(v) && v.value.isIri())
    .map((v) => (v as AtomicValue).value as Rdf.Iri)
    .toSet();
}

function createDefaultPlaceholder(definition: FieldDefinition): string {
  const entityLabel = (getPreferredLabel(definition.label) || 'entity').toLocaleLowerCase();
  return `Select ${entityLabel}`;
}


MultipleValuesInput.assertStatic(TreePickerInput);

export default TreePickerInput;
