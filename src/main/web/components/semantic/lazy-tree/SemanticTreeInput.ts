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

import {ReactElement, createElement, ReactNode, Children, Props as ReactProps } from 'react';
import * as D from 'react-dom-factories';
import { findDOMNode } from 'react-dom';
import * as Kefir from 'kefir';
import * as _ from 'lodash';
import { Overlay, Button, Tooltip, OverlayTrigger } from 'react-bootstrap';
import * as SparqlJs from 'sparqljs';
import * as classnames from 'classnames';

import { Cancellation } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { trigger } from 'platform/api/events';
import { SparqlUtil, SparqlClient } from 'platform/api/sparql';
import * as LabelsService from 'platform/api/services/resource-label';
import { Component } from 'platform/api/components';
import { ErrorNotification } from 'platform/components/ui/notification';
import { ClearableInput, ClearableInputProps, RemovableBadge } from 'platform/components/ui/inputs';
import { Spinner } from 'platform/components/ui/spinner';
import { Droppable } from 'platform/components/dnd';

import { KeyedForest, KeyPath } from './KeyedForest';
import { TreeSelection, SelectionNode } from './TreeSelection';
import { SingleFullSubtree, MultipleFullSubtrees } from './SelectionMode';
import { TreeNode, ForestChange, queryMoreChildren } from './NodeModel';
import { Node, SparqlNodeModel, sealLazyExpanding } from './SparqlNodeModel';
import { LazyTreeSelector, LazyTreeSelectorProps } from './LazyTreeSelector';
import { ItemSelectionChanged } from './SemanticTreeInputEvents';
import { navigateToResource } from 'platform/api/navigation';

import * as styles from './SemanticTreeInput.scss';
import {SelectLabel, SelectLabelProps} from "platform/components/ui/inputs/SelectLabel";

import Icon from 'platform/components/ui/icon/Icon';
import { ConfigHolder } from 'platform/api/services/config-holder';

const ITEM_INPUT_VARIABLE = 'item';
const ITEM_OUTPUT_VARIABLE = 'label';

export interface ComplexTreePatterns {
  /*
   *  Need to be specified if component should emit events.
   */
  id?: string;

  /**
   * Tree roots query with no input and [?item, ?label, ?hasChildren] output variables.
   */
  rootsQuery: string;
  /**
   * Children query with [?parent] input and [?item, ?label, ?hasChildren] output variables.
   */
  childrenQuery: string;
  /**
   * Parent nodes query with [?item] inputs through VALUES(...) clause
   * and [?item, ?parent, ?parentLabel] outputs.
   */
  parentsQuery: string;
  /**
   * Search query with [?__token__] input and [?item, ?score, ?label, ?hasChildren] outputs.
   */
  searchQuery: string;
}

export interface SemanticTreeInputProps extends ComplexTreePatterns {
  /**
   * Optional custom class for the tree.
   */
  className?: string;

  /**
   * This component is an uncontrolled component, but this property can be used to specify
   * array of nodes that should be initially selected.
   */
  initialSelection?: ReadonlyArray<Rdf.Iri | string>;

  /** Allows to drop entity if it satisfies ASK-query */
  droppable?: {
    query: string;
    styles?: {
      enabled: any;
      disabled: any;
    };
    components?: {
      disabledHover?: any;
    };
  };
  /** Allows to select multiple items at the same time. */
  multipleSelection?: boolean;
  /** Empty field placeholder. */
  placeholder?: string;
  /** Callback invoked when tree selection changes. */
  onSelectionChanged?: (selection: TreeSelection<Node>) => void;
  /** Callback invoked when user clicks on selected item badge. */
  onSelectionClick?: (selection: TreeSelection<Node>, node: SelectionNode<Node>) => void;
  /** Automatically open/close dropdown in full mode when input focused/blurred. */
  openDropdownOnFocus?: boolean;
  /** Allow forced search with query less than MIN_SEARCH_TERM_LENGTH by pressing Enter **/
  allowForceSuggestion?: boolean;
  /**
   * Closes the dropdown when some value is selected.
   *
   * @default false
   */
  closeDropdownOnSelection?: boolean;

    /**
   * query to retrieve the item label that will be visualized
   */
    queryItemLabel?: string;
    openResourceOnClick?: boolean;
}

interface SelectedItem {
  key: string; // iri
  value: string; // label
}

const ITEMS_LIMIT = 200;
const MIN_SEARCH_TERM_LENGTH = 3;
const SEARCH_DELAY_MS = 300;

interface State {
  forest?: KeyedForest<Node>;

  loadError?: any;
  model?: SparqlNodeModel;
  searchQuery?: SparqlJs.SelectQuery;

  confirmedSelection?: TreeSelection<Node>;

  searchInputFocused?: boolean;
  searchText?: string;
  searchForce?: boolean;
  searching?: boolean;
  searchResult?: SearchResult;

  mode?: DropdownMode;
  labelToDisplay?: SelectedItem[];
}

type DropdownMode = { type: 'collapsed' } | ExpandedMode;
type ExpandedMode = {
  type: 'full' | 'search';
  selection: TreeSelection<Node>;
};

interface SearchResult {
  forest?: KeyedForest<Node>;
  error?: any;
  matchedCount?: number;
  matchLimit?: number;
}

/**
 * Tree selector component that allows the user to navigate the tree
 * along a broader/narrower relationship (e.g. parent/child).
 *
 * @example
 *
 * <semantic-tree-input placeholder='Select or search for a place...'
 *
 * roots-query='
 *   prefix skos: <http://www.w3.org/2004/02/skos/core#>
 *   select distinct ?item ?label ?hasChildren where {
 *     {
 *       ?item a <http://www.cidoc-crm.org/cidoc-crm/E53_Place>
 *       MINUS { ?item skos:broader ?parent }
 *       OPTIONAL { ?item skos:prefLabel ?label }
 *     }
 *     OPTIONAL {
 *       ?child skos:broader ?item .
 *       ?child a <http://www.cidoc-crm.org/cidoc-crm/E53_Place>
 *     }
 *     BIND(bound(?child) as ?hasChildren)
 *   } order by ?label
 * '
 *
 * children-query='
 *   prefix skos: <http://www.w3.org/2004/02/skos/core#>
 *   select distinct ?item ?label ?hasChildren where {
 *     {
 *       ?item a <http://www.cidoc-crm.org/cidoc-crm/E53_Place> .
 *       ?item skos:broader ?parent
 *       OPTIONAL { ?item skos:prefLabel ?label }
 *     }
 *     OPTIONAL {
 *       ?child skos:broader ?item .
 *       ?child a <http://www.cidoc-crm.org/cidoc-crm/E53_Place>
 *     }
 *     BIND(bound(?child) as ?hasChildren)
 *   } order by ?label
 * '
 *
 * parents-query='
 *   prefix skos: <http://www.w3.org/2004/02/skos/core#>
 *   select distinct ?item ?parent ?parentLabel where {
 *     ?item skos:broader ?parent .
 *     OPTIONAL { ?parent skos:prefLabel ?parentLabel }
 *   }
 * '
 *
 * search-query='
 *   prefix bds: <http://www.bigdata.com/rdf/search#>
 *   prefix skos: <http://www.w3.org/2004/02/skos/core#>
 *   select distinct ?item ?score ?label ?hasChildren where {
 *     SERVICE <http://www.bigdata.com/rdf/search#search> {
 *       ?label bds:search ?__token__ ;
 *         bds:relevance ?score .
 *     }
 *     ?item a <http://www.cidoc-crm.org/cidoc-crm/E53_Place> .
 *     ?item skos:prefLabel ?label
 *     OPTIONAL {
 *       ?child skos:broader ?item .
 *       ?child a <http://www.cidoc-crm.org/cidoc-crm/E53_Place>
 *     }
 *     BIND(bound(?child) as ?hasChildren)
 *   } order by ?score limit 100
 * '></semantic-tree-input>
 */
export class SemanticTreeInput extends Component<SemanticTreeInputProps, State> {
  private readonly cancellation = new Cancellation();
  private search = this.cancellation.derive();

  private overlayHolder: HTMLElement;
  private textInput: ClearableInput;

  constructor(props: SemanticTreeInputProps, context: any) {
    super(props, context);
    this.state = {
      ...this.createQueryModel(this.props),
      mode: { type: 'collapsed' },
      forest: Node.readyToLoadForest,
      confirmedSelection: TreeSelection.empty(Node.emptyForest),
      labelToDisplay: []
    };
  }

  /**
   * If the attributes initial_selection and query_item_label are specified
   * For each of the selected items the query will be fired and
   * and the label will be saved in the state, ready to be rendered
   */
  initLabelInitialSelection() {
    const { initialSelection, queryItemLabel } = this.props;
    let selection: ReadonlyArray<Rdf.Iri>;
    if (initialSelection && initialSelection.length !== 0) {
      if (typeof initialSelection[0] == 'string') {
        selection = (initialSelection as ReadonlyArray<string>).map(s => Rdf.iri(s));
      } else {
        selection = initialSelection as ReadonlyArray<Rdf.Iri>;
      }

      if (queryItemLabel && queryItemLabel.indexOf(ITEM_INPUT_VARIABLE) > 0) {
        selection.map((selectedItem) => {

          SparqlClient.select(queryItemLabel.replace(`?${ITEM_INPUT_VARIABLE}`, `<${selectedItem.value}>`)).onValue(
            (result) => {
              const prev = this.state.labelToDisplay
              this.setState(
                {
                  labelToDisplay:
                  [
                    ...prev,
                    {
                      key: selectedItem.value,
                      value: result.results.bindings[0][ITEM_OUTPUT_VARIABLE].value
                    }
                  ]
                }
              );
              return
            }
          )
        });
      }
    }
}

  // initialize the initial selection item labels
  // before component is rendered
  componentWillMount() {
    this.initLabelInitialSelection()
  }

  componentDidMount() {
    const { initialSelection } = this.props;
    let selection: ReadonlyArray<Rdf.Iri>;
    if (initialSelection && initialSelection.length !== 0) {
      if (typeof initialSelection[0] == 'string') {
        selection = (initialSelection as ReadonlyArray<string>).map(s => Rdf.iri(s));
      } else {
        selection = initialSelection as ReadonlyArray<Rdf.Iri>;
      }
      this.setInitialSelection(selection).onValue((value) => {this.onSelectionChanged(value);});
    }
    document.addEventListener('click', this.handleClickOutside, true);
  }

  componentWillReceiveProps(nextProps: SemanticTreeInputProps) {
    const props = this.props;
    const sameQueries =
      props.rootsQuery === nextProps.rootsQuery &&
      props.childrenQuery === nextProps.childrenQuery &&
      props.parentsQuery === nextProps.parentsQuery &&
      props.searchQuery === nextProps.searchQuery
    if (!sameQueries) {
      this.setState(this.createQueryModel(nextProps));
    }
  }

  private createQueryModel(props: SemanticTreeInputProps): State {
    try {
      const model = new SparqlNodeModel({
        rootsQuery: SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.rootsQuery),
        childrenQuery: SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.childrenQuery),
        parentsQuery: SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.parentsQuery),
        limit: ITEMS_LIMIT,
        sparqlOptions: () => ({ context: this.context.semanticContext }),
      });
      const searchQuery = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.searchQuery);
      return { model, searchQuery };
    } catch (loadError) {
      return { loadError };
    }
  }

  /**
   * To set initial selection we first need to restore the full path from the
   * selected items to the root, we use the same mechanism as we use in search.
   * But in addition to that we also need to fetch labels for selected items using LabelsService.
   */
  private setInitialSelection = (initialSelection: ReadonlyArray<Rdf.Iri>) => {
    const {queryItemLabel} = this.props;
    // if queryItemLabel is passed by, then use that pattern to retrieve the item label
    if(queryItemLabel) {
      return this.cancellation
      .map(SparqlClient.select(queryItemLabel.replace(`?${ITEM_INPUT_VARIABLE}`, `<${initialSelection[0].value}>`)))
      .flatMap((result) => {
        const bindings = initialSelection.map((iri) => ({
          item: iri,
          label: Rdf.literal(result.results.bindings[0][ITEM_OUTPUT_VARIABLE].value),
          hasChildren: Rdf.literal(true),
        }));
        return this.restoreTreeFromLeafNodes(bindings);
      })
      .map(
        (forest) => {
          const confirmedSelection = forest as TreeSelection<Node>;
          this.setState({ confirmedSelection });
          return confirmedSelection;
        }
      );
    }

    // otherwise use the default one
    return this.cancellation
      .map(LabelsService.getLabels(initialSelection))
      .flatMap((labels) => {
        const bindings = initialSelection.map((iri) => ({
          item: iri,
          label: labels.has(iri) ? Rdf.literal(labels.get(iri)) : undefined,
          hasChildren: Rdf.literal(true),
        }));
        return this.restoreTreeFromLeafNodes(bindings);
      })
      .map(
        (forest) => {
          const confirmedSelection = forest as TreeSelection<Node>;
          this.setState({ confirmedSelection });
          return confirmedSelection;
        }
      );
  };

  componentWillUnmount() {
    this.cancellation.cancelAll();
    document.removeEventListener('click', this.handleClickOutside, true);
  }

  private handleClickOutside = (event: Event) => {
    if(this.overlayHolder && !this.overlayHolder.contains(event.target as HTMLDivElement)) {
      this.closeDropdown({ saveSelection: false })
    }
  }

  render() {
    if (this.state.loadError) {
      return D.div(
        { className: classnames(styles.holder, this.props.className) },
        createElement(ErrorNotification, { errorMessage: this.state.loadError })
      );
    } else {
      const result = D.div(
        {
          ref: (holder) => (this.overlayHolder = holder),
          className: classnames(styles.holder, this.props.className),
        },
        D.div({ className: styles.inputAndButtons }, this.renderTextField(), this.renderBrowseButton()),
        this.renderOverlay()
      );
      if (this.props.droppable) {
        return createElement(
          Droppable,
          {
            query: this.props.droppable.query,
            dropStyles: this.props.droppable.styles,
            dropComponents: {
              ...this.props.droppable.components,
            },
            onDrop: (drop: Rdf.Iri) => {
              this.setValue(drop);
            },
          },
          result
        );
      } else {
        return result;
      }
    }
  }

  /**
   * If the attribute query_item_label is specified, and contains ?item,
   * For each of the selected items the query will be fired and
   * and the label will be updated
   */
  private updateLabelField(selection: TreeSelection<Node>) {
    const { queryItemLabel } = this.props;
    if (queryItemLabel) {
      const selectedItems = TreeSelection.leafs(selection);
      if (queryItemLabel.indexOf(ITEM_INPUT_VARIABLE) > 0) {
        selectedItems.map((selectedItem) => {
          SparqlClient.select(queryItemLabel.replace(`?${ITEM_INPUT_VARIABLE}`, `<${selectedItem.iri.value}>`)).onValue(
            (result) => {
              const label = Rdf.literal(result.results.bindings[0][ITEM_OUTPUT_VARIABLE].value);
              const node = TreeSelection.nodesFromKey(selection, selectedItem.iri.value).first();
              selection.updateNode(selection.getKeyPath(node), (singleNode) => {
                singleNode.label = label;
                this.setState({ confirmedSelection: selection });
                return singleNode;
              });
            }
          );
        });
      }
    }
  }

  public setValue(iri: Rdf.Iri) {
    this.setInitialSelection([iri]).onValue(this.onSelectionChanged);
  }

  private onSelectionChanged = (selection: TreeSelection<Node>) => {
    this.updateLabelField(selection)

    if (this.props.onSelectionChanged) {
      this.props.onSelectionChanged(selection);
    }

    /**
     * selection always has one empty root node, so if selection is 1 then in reality there is nothing selected.
     */

    let iris  = Object.keys(selection.nodes.toJS())
                      .filter(item => item !== "SparqlNode:root")
                      .map(item => Rdf.iri(item));

    if (this.props.id && selection.nodes.size <=2 ) {
      const iri = selection.nodes.size == 1 ? undefined : selection.nodes.last().first().iri.value;
      trigger({
        eventType: ItemSelectionChanged, source: this.props.id, data: {iri,iris}
      });
    } else if (this.props.id && selection.nodes.size > 2) {
        trigger({
          eventType: ItemSelectionChanged, source: this.props.id, data: {"iris": iris}
        });
    }

  }

  private getLabelNoteToDisplay(selectedNode: SelectionNode<Node>) {
    // search if the selected node has an entry in labelToDisplay mapping
    const mappedLabels = this.state.labelToDisplay?.filter((b:any) => b.key === selectedNode.iri.value)
    // if it does, return the mapped label value
    // otherwise the selectedNode already has a label value
    return mappedLabels[0]?.value ?? selectedNode.label.value
  }

  private toggleDropdown() {
    const modeType = this.state.mode.type;
    if (modeType === 'collapsed' || modeType === 'search') {
      this.search.cancelAll();
      this.setState({
        searchText: undefined,
        searching: false,
        searchResult: undefined,
        mode: { type: 'full', selection: this.state.confirmedSelection },
      });
    } else if (modeType === 'full') {
      this.closeDropdown({ saveSelection: false });
    }
  }

  private renderTextField() {
    const selection = this.state.confirmedSelection;
    const selectedItems = TreeSelection.leafs(selection).sortBy((item) => item.label.value);
    const textFieldClassNames = classnames(styles.textInput, selectedItems.size === 0 ? 'selection-empty' : 'selection-full')

    const selectLabelProps: SelectLabelProps =  {
      className: textFieldClassNames,
      defaultTitle: this.props.placeholder,
      style: {
        cursor: 'pointer'
      },
      onClickHandler: () => {
        this.toggleDropdown()
      }
    }

    const openResourceOnClick = this.props.openResourceOnClick ?? true

    const { onSelectionClick } = this.props;
    return createElement(
      SelectLabel,
      selectLabelProps,
      selectedItems
        .map((item) =>
          createElement(
            RemovableBadge,
            {
              key: item.iri.value,
              title: item.iri.value,
              onClick: () => {
                if (openResourceOnClick) {
                  navigateToResource(ConfigHolder.getDashboard(), {resource: item.iri.value, view: 'resource-editor'}, this.context.semanticContext.repository ?? undefined);
                } else {
                  this.toggleDropdown()
                }
                onSelectionClick ? () => onSelectionClick(selection, item) : undefined
              },
              onRemove: () => {
                const previous = this.state.confirmedSelection;
                const newSelection = TreeSelection.unselect(previous, previous.keyOf(item));
                this.setState({ confirmedSelection: newSelection }, () => {
                  this.onSelectionChanged(newSelection)
                });
              },
            },
            this.getLabelNoteToDisplay(item)
          )
        )
        .toArray()
    );
  }

  private searchFor(text: string, force: boolean) {
    const doForceSearch = this.props.allowForceSuggestion && force;
    const hasEnoughSearchText = doForceSearch || text.length >= MIN_SEARCH_TERM_LENGTH;

    if (hasEnoughSearchText) {
      const searchingSameText = this.state.searching && this.state.searchText === text;
      if (!searchingSameText) {
        this.setState({
          searchText: text,
          searchForce: force,
          searching: hasEnoughSearchText,
          mode: { type: 'search', selection: this.state.confirmedSelection },
        });

        this.search = this.cancellation.deriveAndCancel(this.search);
        this.search.map(this.performSearch(text)).observe({
          value: (searchResult) => this.setState({ searchResult, searching: false }),
          error: (error) => this.setState({ searchResult: { error }, searching: false }),
        });
      }
    } else {
      this.search.cancelAll();
      
      let mode = this.state.mode;
      let newSearchResult = null

      if (text.length === 0) {

        newSearchResult = {
          searching: false,
          searchResult: undefined,
        }

         if(!this.props.openDropdownOnFocus) {
          mode = { type: 'collapsed' };
         } else {
          mode = { type: 'search', selection: null };  
         }
      } else if (text.length > 0) {
        mode = { type: 'search', selection: this.state.confirmedSelection };
      }
      this.setState({
        mode,
        searchText: text,
        searchForce: force,
        ...newSearchResult,
      });
    }
  }

  private performSearch(text: string) {
    const parametrized = SparqlClient.setBindings(this.state.searchQuery, {
      __token__: SparqlUtil.makeLuceneQuery(text),
    });
    return Kefir.later(SEARCH_DELAY_MS, {})
      .flatMap<SparqlClient.SparqlSelectResult>(() => SparqlClient.select(parametrized))
      .flatMap<SearchResult>((result) =>
        this.restoreTreeFromLeafNodes(result.results.bindings).map((forest) => ({
          forest,
          matchedCount: result.results.bindings.length,
          matchLimit: parametrized.limit,
        }))
      );
  }

  renderBrowseButton() {
    return createElement(
      OverlayTrigger,
      {
        placement: 'bottom',
        overlay: createElement(
          Tooltip,
          {
            id: 'SemanticTreeInput__tooltip',
          },
          'Browse full hierarchy'
        ),
      },
      createElement(
        Button,
        {
          className: styles.browseButton,
          active: this.state.mode.type === 'full',
          onClick: () => {
            this.toggleDropdown()
          },
        },

/*           D.span({}, 'Filter'), */
          D.span({
            className: 'material-icons-round',
            ['aria-hidden' as any]: true,
          }, 'expand_more')

      )
    );
  }

  private closeDropdown(options: { saveSelection: boolean }) {
    this.search.cancelAll();
    this.setState(
      (state: State): State => {
        const mode = state.mode;
        const newState: State = {
          mode: { type: 'collapsed' },
          searchText: undefined,
          searching: false,
          searchResult: undefined,
        };
        if (mode.type !== 'collapsed' && options.saveSelection) {
          newState.confirmedSelection = mode.selection;
          this.onSelectionChanged(mode.selection);
        }
        return newState;
      }
    );
  }

  private clearSearch() {
    this.search.cancelAll();
    this.setState((): State => {
      const newState: State = {
        mode: { type: 'search', selection: null },
        searchText: undefined,
        searching: false,
        searchResult: undefined,
      };
      return newState;
    })
  }

  private renderOverlay() {
    const mode = this.state.mode;
    return createElement(
      Overlay,
      {
        show: mode.type !== 'collapsed',
        placement: 'bottom',
        container: this.overlayHolder,
        target: () => findDOMNode(this.textInput),
      },
      // use proxy component for overlay content to avoid warnings
      // about unknown props provided by React.Bootstrap
      createElement(
        OverlayProxy,
        {},
        mode.type === 'collapsed'
          ? D.div({})
          : D.div({ className: styles.dropdown }, this.renderSearchInput(), this.renderDropdownContent(mode), this.renderDropdownFooter(mode))
      )
    );
  }

  private updateForest(
    displayingSearch: boolean,
    update: (forest: KeyedForest<Node>, state: State, props: SemanticTreeInputProps) => KeyedForest<Node>,
    callback?: () => void
  ) {
    this.setState((state: State, props: SemanticTreeInputProps): State => {
      if (displayingSearch) {
        return {
          searchResult: _.assign({}, state.searchResult, {
            forest: update(state.searchResult.forest, state, props),
          }),
        };
      } else {
        return { forest: update(state.forest, state, props) };
      }
    }, callback);
  }

  private renderDropdownContent(mode: ExpandedMode): ReactElement<any> {
    if (mode.type === 'search') {
      if (
        this.state.searchText && this.state.searchText.length < MIN_SEARCH_TERM_LENGTH &&
        (!this.state.searchForce || !this.props.allowForceSuggestion)
      ) {
        return D.span(
          { className: styles.searchMessage },
          `Minimum length of search term is ${MIN_SEARCH_TERM_LENGTH} characters`
        );
      } else if (this.state.searching) {
        return createElement(Spinner, { className: styles.searchSpinner });
      } else if (this.state.searchResult?.error) {
        return createElement(ErrorNotification, { errorMessage: this.state.searchResult.error });
      }
    }
    return this.renderScrollableDropdownContent(mode);
  }

  private renderScrollableDropdownContent(mode: ExpandedMode): ReactElement<any> {
    let limitMessage: ReactElement<any> = null;

    if (mode.type === 'search' && this.state.searchResult) {
      const { matchedCount, matchLimit, forest } = this.state.searchResult;
      if (matchLimit && matchedCount === matchLimit) {
        limitMessage = D.span(
          { className: styles.searchMessage },
          `Only first ${matchedCount} matches are shown. Please refine your search.`
        );
      } else if (!forest.root.children || forest.root.children.length === 0) {
        return D.span({ className: styles.searchMessage }, `No results found`);
      }
    }
    return D.div({ className: styles.tree }, this.renderTree(mode), limitMessage);
  }

  private renderDropdownFooter(mode: ExpandedMode) {
    const enableSelectionSave = mode.selection !== this.state.confirmedSelection;

    return D.div(
      { className: styles.dropdownFooter },
      createElement(
        Button,
        {
          className: styles.dropdownButton,
          bsStyle: 'default',
          onClick: () => this.closeDropdown({ saveSelection: false }),
        },
        'Cancel'
      ),
      createElement(
        Button,
        {
          className: `${styles.dropdownButton} btn-action`,
          bsStyle: 'default',
          disabled: !enableSelectionSave,
          onClick: () => this.closeDropdown({ saveSelection: true }),
        },
        'Apply'
      )
    );
  }

  private renderSearchInput() {
    const selection = this.state.confirmedSelection;
    const selectedItems = TreeSelection.leafs(selection).sortBy((item) => item.label.value);
    const textFieldClassNames = classnames(styles.textInput, selectedItems.size === 0 ? 'selection-empty' : 'selection-full')
    const textFieldProps: ClearableInputProps & ReactProps<ClearableInput> = {
      ref: (input) => (this.textInput = input),
      className: textFieldClassNames,
      inputClassName: styles.input,
      value: this.state.searchText || '',
      placeholder: this.props.placeholder,
      showPlaceholderIcon: true,
      onFocus: () =>
        this.setState({
          searchInputFocused: true,
          mode:
            this.state.mode.type === 'collapsed' && this.props.openDropdownOnFocus
              ? { type: 'full', selection: this.state.confirmedSelection }
              : this.state.mode,
        }),
      onBlur: () => {
        this.setState({ searchInputFocused: false });
        if (!this.state.searchText && !this.props.openDropdownOnFocus) {
          this.closeDropdown({ saveSelection: false });
        }
      },
      onChange: (e) => this.searchFor(e.currentTarget.value, false),
      onKeyDown: (e) => {
        if (e.keyCode === 13 && this.state.searchInputFocused) {
          // enter
          this.searchFor(this.state.searchText, true);
        }
      },
      onClear: () => {
        if (this.state.searchInputFocused || this.state.searchText) {
          this.clearSearch()
        }
      },
    };

    return createElement(
      ClearableInput,
      textFieldProps
    );
  }

  private renderTree(mode: ExpandedMode): ReactElement<any> {
    const inSearchMode = mode.type === 'search';
    const renderedForest = inSearchMode && this.state.searchResult ? this.state.searchResult.forest : this.state.forest;
    const searchTerm = inSearchMode && this.state.searchText ? this.state.searchText.toLowerCase() : undefined;

    const config: LazyTreeSelectorProps<Node> = {
      forest: renderedForest,
      isLeaf: (item) =>
        item.children ? item.children.length === 0 && !this.state.model.hasMoreChildren(item) : undefined,
      childrenOf: (item) => ({
        children: item.children,
        loading: item.loading,
        hasMoreItems: this.state.model.hasMoreChildren(item),
      }),
      renderItem: (node) => this.renderItem(node, searchTerm),
      requestMore: (node) => {
        const path = renderedForest.getKeyPath(node);
        this.requestChildren(path, inSearchMode);
      },
      selectionMode: this.props.multipleSelection ? MultipleFullSubtrees<Node>() : SingleFullSubtree<Node>(),
      selection: mode.selection,
      onSelectionChanged: (selection) => {
        this.setState(
          (state: State): State => {
            if (state.mode.type === 'collapsed') {
              return {};
            }
            return { mode: { type: state.mode.type, selection } };
          },
          () => {
            if (this.props.closeDropdownOnSelection) {
              this.closeDropdown({saveSelection: true});
            }
          }
        );
      },
      isExpanded: (node) => node.expanded,
      onExpandedOrCollapsed: (item, expanded) => {
        const path = renderedForest.getKeyPath(item);
        this.updateForest(inSearchMode, (forest) =>
          forest.updateNode(path, (node) => TreeNode.set(node, { expanded }))
        );
      },
    };
    return createElement(LazyTreeSelector, config);
  }

  private renderItem(node: Node, highlightedTerm: string) {
    const text = node.label ? node.label.value : node.iri.value;

    let parts: ReactNode[] = [text];
    if (highlightedTerm) {
      const startIndex = text.toLowerCase().indexOf(highlightedTerm);
      if (startIndex >= 0) {
        const endIndex = startIndex + highlightedTerm.length;
        parts = [
          text.substring(0, startIndex),
          D.span({ className: styles.highlighted }, text.substring(startIndex, endIndex)),
          text.substring(endIndex),
        ];
      }
    }

    return D.span(
      {
        title: node.iri.value,
        className: node.error ? styles.error : undefined,
      },
      ...parts
    );
  }

  private requestChildren(path: KeyPath, isSearching: boolean) {
    let changePromise: ForestChange<Node>;
    this.updateForest(
      isSearching,
      (forest, state) => {
        const [loadingForest, forestChange] = queryMoreChildren(
          (parent) => state.model.loadMoreChildren(parent),
          forest,
          path
        );
        changePromise = forestChange;
        return loadingForest;
      },
      () => {
        const cancellation = isSearching ? this.search : this.cancellation;
        cancellation.map(changePromise).onValue((change) => this.updateForest(isSearching, change));
      }
    );
  }

  private restoreTreeFromLeafNodes(searchResult: SparqlClient.Bindings): Kefir.Property<KeyedForest<Node>> {
    const leafs = searchResult
      .map(
        ({ item, score = Rdf.literal('0'), label, hasChildren }): Node => {
          if (!(item.isIri() && label.isLiteral())) {
            return undefined;
          }
          const certainlyLeaf = hasChildren.isLiteral() && hasChildren.value === 'false';
          return {
            iri: item,
            label: label,
            score: parseFloat(score.isLiteral() ? score.value : ''),
            children: [],
            reachedLimit: certainlyLeaf,
          };
        }
      )
      .filter((node) => node !== undefined);

    return this.state.model
      .loadFromLeafs(leafs, { transitiveReduction: true })
      .map((treeRoot) => KeyedForest.create(Node.keyOf, sealLazyExpanding(treeRoot)));
  }
}

class OverlayProxy extends Component<{}, {}> {
  render() {
    return Children.only(this.props.children);
  }
}

export default SemanticTreeInput;
