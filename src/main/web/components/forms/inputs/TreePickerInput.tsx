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
import { Button } from 'react-bootstrap';
import * as Immutable from 'immutable';

import { Rdf } from 'platform/api/rdf';

import {
  SemanticTreeInput,
  Node as TreeNode,
  SelectionNode,
  TreeSelection,
  ComplexTreePatterns,
  createDefaultTreeQueries,
} from 'platform/components/semantic/lazy-tree';

import { FieldDefinition, getPreferredLabel } from '../FieldDefinition';
import { FieldValue, AtomicValue, ErrorKind } from '../FieldValues';
import {
  MultipleValuesInput,
  MultipleValuesProps,
  MultipleValuesHandlerProps,
  CardinalityCheckingHandler,
} from './MultipleValuesInput';
import { NestedModalForm, tryExtractNestedForm } from './NestedModalForm';

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
   * Scheme IRI that that to use in Tree Patterns from the Field Definition.
   */
  scheme?: string;
}

interface State {
  readonly treeVersionKey?: number;
  readonly treeQueries?: ComplexTreePatterns;
  readonly treeSelection?: ReadonlyArray<Rdf.Iri>;
  readonly treeSelectionSet?: Immutable.Set<Rdf.Iri>;
  readonly nestedFormOpen?: boolean;
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

  constructor(props: TreePickerInputProps, context: any) {
    super(props, context);
    const config = this.props.definition.treePatterns || { type: 'simple', scheme: props.scheme };
    const treeQueries: ComplexTreePatterns = config.type === 'full' ? config : createDefaultTreeQueries(config);
    this.state = { treeVersionKey: 0, treeQueries };
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
    const nestedForm = tryExtractNestedForm(this.props.children);
    const showCreateNewButton = nestedForm && (!treeSelection || treeSelection.length < maxOccurs);
    return (
      <div className={CLASS_NAME}>
        {this.renderTreePicker()}
        {showCreateNewButton ? this.renderCreateNewButton() : null}
        {this.state.nestedFormOpen ? (
          <NestedModalForm
            definition={this.props.definition}
            onSubmit={this.onNestedFormSubmit}
            onCancel={() => this.setState({ nestedFormOpen: false })}
          >
            {nestedForm}
          </NestedModalForm>
        ) : null}
      </div>
    );
  }

  private onNestedFormSubmit = (value: AtomicValue) => {
    this.setState({ nestedFormOpen: false });
    const values = this.props.values.concat(value);
    this.onValuesChanged(values);
  };

  private renderTreePicker() {
    const { openDropdownOnFocus, closeDropdownOnSelection } = this.props;
    const { treeVersionKey, treeQueries, treeSelection } = this.state;
    const { rootsQuery, childrenQuery, parentsQuery, searchQuery } = treeQueries;

    const placeholder =
      typeof this.props.placeholder === 'string'
        ? this.props.placeholder
        : createDefaultPlaceholder(this.props.definition);

    return (
      <SemanticTreeInput
        key={treeVersionKey}
        className={`${CLASS_NAME}__picker`}
        placeholder={placeholder}
        rootsQuery={rootsQuery}
        childrenQuery={childrenQuery}
        parentsQuery={parentsQuery}
        searchQuery={searchQuery}
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
      <Button className={`${CLASS_NAME}__create-button`} bsStyle="default" onClick={this.toggleNestedForm}>
        <span className="fa fa-plus" />
        {' Create new'}
      </Button>
    );
  }

  private toggleNestedForm = () => {
    this.setState((state): State => ({ nestedFormOpen: !state.nestedFormOpen }));
  };

  static makeHandler(props: MultipleValuesHandlerProps<TreePickerInputProps>) {
    return new CardinalityCheckingHandler(props);
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
  return `Search or browse for values of ${entityLabel} here...`;
}

MultipleValuesInput.assertStatic(TreePickerInput);

export default TreePickerInput;
