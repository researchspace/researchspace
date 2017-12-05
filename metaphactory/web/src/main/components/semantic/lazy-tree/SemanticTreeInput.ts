/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import {
  DOM as D, ReactElement, createElement, ReactNode, Children, Props as ReactProps,
} from 'react';
import { findDOMNode } from 'react-dom';
import { List } from 'immutable';
import * as Kefir from 'kefir';
import * as _ from 'lodash';
import { Overlay, Button, Tooltip, OverlayTrigger } from 'react-bootstrap';
import * as classnames from 'classnames';

import { Cancellation } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { SparqlUtil, SparqlClient } from 'platform/api/sparql';
import * as LabelsService from 'platform/api/services/resource-label';
import { Component } from 'platform/api/components';
import { ErrorNotification } from 'platform/components/ui/notification';
import { ClearableInput, ClearableInputProps, RemovableBadge } from 'platform/components/ui/inputs';
import { Spinner } from 'platform/components/ui/spinner';
import { Droppable } from 'platform/components/dnd';

import { KeyedForest, OffsetPath } from './KeyedForest';
import { TreeSelection, SelectionNode } from './TreeSelection';
import { SingleFullSubtree, MultipleFullSubtrees } from './SelectionMode';
import {
  Node,
  NodeTreeSelector,
  NodeTreeProps,
  EmptyForest,
  queryMoreChildren,
  RootsChange,
  restoreForestFromLeafs,
} from './NodeModel';
import * as styles from './SemanticTreeInput.scss';

export interface ComplexTreePatterns {
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
  initialSelection?: ReadonlyArray<Rdf.Iri>;

  /** Allows to drop entity if it satisfies ASK-query */
  droppable?: {
    query: string
    styles?: {
      enabled: any
      disabled: any
    }
    components?: {
      disabledHover?: any
    }
  }
  /** Allows to select multiple items at the same time. */
  multipleSelection?: boolean;
  /** Empty field placeholder. */
  placeholder?: string;
  /** Callback invoked when tree selection changes. */
  onSelectionChanged?: (selection: TreeSelection<Node>) => void;
  /** Automatically open/close dropdown in full mode when input focused/blurred. */
  openDropdownOnFocus?: boolean;
  /** Allow forced search with query less than MIN_SEARCH_TERM_LENGTH by pressing Enter **/
  allowForceSuggestion?: boolean;
}

const ITEMS_LIMIT = 200;
const MIN_SEARCH_TERM_LENGTH = 3;
const SEARCH_DELAY_MS = 300;

interface State {
  forest?: KeyedForest<Node>;

  loadError?: any;
  rootsQuery?: SparqlJs.SelectQuery;
  childrenQuery?: SparqlJs.SelectQuery;
  parentsQuery?: SparqlJs.SelectQuery;
  searchQuery?: SparqlJs.SelectQuery;

  confirmedSelection?: TreeSelection<Node>;

  searchInputFocused?: boolean;
  searchText?: string;
  searchForce?: boolean;
  searching?: boolean;
  searchResult?: SearchResult;

  mode?: DropdownMode;
}

type DropdownMode = {type: 'collapsed'} | ExpandedMode;
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
  private cancellation = new Cancellation();

  private search = this.cancellation.cache<string, SearchResult>((text, cancellation) => {
    const parametrized = SparqlClient.setBindings(
      this.state.searchQuery, {'__token__': SparqlUtil.makeLuceneQuery(text)});
    return Kefir.later(SEARCH_DELAY_MS, {})
      .flatMap<SparqlClient.SparqlSelectResult>(() => SparqlClient.select(parametrized))
      .flatMap<SearchResult>(result =>
        this.restoreTreeFromLeafNodes(result.results.bindings, cancellation)
        .map(forest => ({
          forest,
          matchedCount: result.results.bindings.length,
          matchLimit: parametrized.limit,
        }))
      );
  });

  private overlayHolder: HTMLElement;
  private textInput: ClearableInput;

  constructor(props: SemanticTreeInputProps, context: any) {
    super(props, context);
    this.state = {
      mode: {type: 'collapsed'},
      forest: EmptyForest.setRoot({
        iri: undefined,
        children: List<Node>(),
        hasMoreItems: true,
      }),
      confirmedSelection: TreeSelection.empty(EmptyForest.keyOf),
    };
  }

  componentDidMount() {
    this.load(this.props, this.setInitialSelection);
  }

  componentWillReceiveProps(nextProps: SemanticTreeInputProps) {
    this.load(nextProps);
  }

  /**
   * To set initial selection we first need to restore the full path from the
   * selected items to the root, we use the same mechanism as we use in search.
   * But in addition to that we also need to fetch labels for selected items using LabelsService.
   */
  private setInitialSelection = () => {
    const {initialSelection} = this.props;
    if (!initialSelection || initialSelection.length === 0) {
      return;
    }
    this.cancellation.map(
      LabelsService.getLabels(initialSelection)
    ).flatMap(labels => {
      const bindings = initialSelection.map(iri => ({
        item: iri,
        label: labels.has(iri) ? Rdf.literal(labels.get(iri)) : undefined,
        hasChildren: Rdf.literal(true),
      }));
      return this.restoreTreeFromLeafNodes(bindings, this.cancellation);
    }).observe({
      value: forest => {
        const confirmedSelection = forest as TreeSelection<Node>;
        this.setState({confirmedSelection});
      },
      error: error => console.error('Failed to restore initial tree selection', error),
    });
  }

  private load(props: SemanticTreeInputProps, cb?: () => void) {
    this.setState({
      rootsQuery: SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.rootsQuery),
      childrenQuery: SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.childrenQuery),
      parentsQuery: SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.parentsQuery),
      searchQuery: SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.searchQuery),
    }, cb);
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  render() {
    const queriesLoaded =
      this.state.rootsQuery &&
      this.state.childrenQuery &&
      this.state.parentsQuery &&
      this.state.searchQuery;

    if (this.state.loadError) {
      return D.div({className: classnames(styles.holder, this.props.className)},
        createElement(ErrorNotification, {errorMessage: this.state.loadError})
      );
    } else if (queriesLoaded) {
      const result = D.div(
        {
          ref: holder => this.overlayHolder = holder,
          className: classnames(styles.holder, this.props.className),
        },
        D.div({className: styles.inputAndButtons},
          this.renderTextField(),
          this.renderBrowseButton(),
        ),
        this.renderOverlay(),
      );
      if (this.props.droppable) {
        return createElement(Droppable,
          {
            query: this.props.droppable.query,
            dropStyles: this.props.droppable.styles,
            dropComponents: {
              ...this.props.droppable.components,
              rootStyle: {position: 'relative'},
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
    } else {
      return D.div({className: styles.holder}, createElement(Spinner));
    }
  }

  private setValue(iri: Rdf.Iri) {
    this.cancellation.map(LabelsService.getLabel(iri)).onValue(label => {
      const newValue: TreeSelection<Node> = TreeSelection.empty(EmptyForest.keyOf).setRoot({
        iri: undefined,
        children: List<Node>([
          {iri, label: Rdf.literal(label)},
        ]),
      } as SelectionNode<Node>);
      this.setState({
        mode: {type: 'collapsed'},
        searchText: undefined,
        searching: false,
        searchResult: undefined,
        confirmedSelection: newValue,
      }, () => {
        if (this.props.onSelectionChanged) {
          this.props.onSelectionChanged(this.state.confirmedSelection);
        }
      });
    });
  }

  private renderTextField() {
    const textFieldProps: ClearableInputProps & ReactProps<ClearableInput> = {
      ref: input => this.textInput = input,
      className: styles.textInput,
      inputClassName: styles.input,
      value: this.state.searchText || '',
      placeholder: this.props.placeholder,
      onFocus: () => this.setState({
        searchInputFocused: true,
        mode: (this.state.mode.type === 'collapsed' && this.props.openDropdownOnFocus)
          ? {type: 'full', selection: this.state.confirmedSelection} : this.state.mode,
      }),
      onBlur: () => {
        this.setState({searchInputFocused: false});
        if (!this.state.searchText && this.props.openDropdownOnFocus) {
          this.closeDropdown({saveSelection: false});
        }
      },
      onChange: e => this.searchFor(e.currentTarget.value, false),
      onKeyDown: e => {
        if (e.keyCode === 13 && this.state.searchInputFocused) { // enter
          this.searchFor(this.state.searchText, true);
        }
      },
      onClear: () => {
        if (this.state.searchInputFocused || this.state.searchText) {
          this.closeDropdown({saveSelection: false});
        }
      },
    };

    const selectedItems = TreeSelection.leafs(this.state.confirmedSelection)
      .sortBy(item => item.label.value);

    return createElement(ClearableInput, textFieldProps, selectedItems.map(item =>
      createElement(RemovableBadge, {
        key: item.iri.value,
        onRemove: () => {
          const previous = this.state.confirmedSelection;
          const newSelection = TreeSelection.unselect(previous, previous.keyOf(item));
          this.setState({confirmedSelection: newSelection}, () => {
            if (this.props.onSelectionChanged) {
              this.props.onSelectionChanged(newSelection);
            }
          });
        },
      }, item.label.value)
    ).toArray());
  }

  private searchFor(text: string, force: boolean) {
    const hasEnoughSearchText =
      (this.props.allowForceSuggestion && force) || text.length >= MIN_SEARCH_TERM_LENGTH;
    if (hasEnoughSearchText) {
      this.setState({
        searchText: text,
        searchForce: force,
        searching: hasEnoughSearchText,
        mode: {type: 'search', selection: this.state.confirmedSelection},
      });

      this.search.compute(text, this.props.allowForceSuggestion && force)
        .onValue(searchResult => {
          this.setState({searchResult, searching: false});
        }).onError(error => {
          this.setState({searchResult: {error}, searching: false});
        });
    } else {
      this.search.cancel();

      let mode = this.state.mode;
      if (text.length === 0 && !this.props.openDropdownOnFocus) {
        mode = {type: 'collapsed'};
      } else if (text.length > 0) {
        mode = {type: 'search', selection: this.state.confirmedSelection};
      }
      this.setState({
        mode,
        searchText: text,
        searchForce: force,
      });
    }
  }

  renderBrowseButton() {
    return createElement(
      OverlayTrigger,
      {
        placement: 'bottom',
        overlay: createElement(Tooltip, {
          id: 'SemanticTreeInput__tooltip',
        }, 'Browse full hierarchy'),
      },
      createElement(Button,
        {
          className: styles.browseButton,
          active: this.state.mode.type === 'full',
          onClick: () => {
            const modeType = this.state.mode.type;
            if (modeType === 'collapsed' || modeType === 'search') {
              this.search.cancel();
              this.setState({
                searchText: undefined,
                searching: false,
                searchResult: undefined,
                mode: {type: 'full', selection: this.state.confirmedSelection},
              });
            } else if (modeType === 'full') {
              this.closeDropdown({saveSelection: false});
            }
          },
        },
        D.span({
          className: 'fa fa-sitemap fa-lg',
          ['aria-hidden' as any]: true,
        })
      )
    );
  }

  private closeDropdown(options: {saveSelection: boolean}) {
    this.search.cancel();
    this.setState((state: State, props: SemanticTreeInputProps): State => {
      const mode = state.mode;
      const newState: State = {
        mode: {type: 'collapsed'},
        searchText: undefined,
        searching: false,
        searchResult: undefined,
      };
      if (mode.type !== 'collapsed' && options.saveSelection) {
        newState.confirmedSelection = mode.selection;
        if (props.onSelectionChanged) {
          props.onSelectionChanged(mode.selection);
        }
      }
      return newState;
    });
  }

  private renderOverlay() {
    const mode = this.state.mode;
    return createElement(Overlay,
      {
        show: mode.type !== 'collapsed',
        placement: 'bottom',
        container: this.overlayHolder,
        target: () => findDOMNode(this.textInput),
      },
      // use proxy component for overlay content to avoid warnings
      // about unknown props provided by React.Bootstrap
      createElement(OverlayProxy, {},
        mode.type === 'collapsed'
        ? D.div({})
        : D.div(
          {className: styles.dropdown},
          this.renderDropdownContent(mode),
          this.renderDropdownFooter(mode)
        )
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
        return {searchResult: _.assign({}, state.searchResult, {
          forest: update(state.searchResult.forest, state, props),
        })};
      } else {
        return {forest: update(state.forest, state, props)};
      }
    }, callback);
  }

  private renderDropdownContent(mode: ExpandedMode): ReactElement<any> {
    if (mode.type === 'search') {
      if (this.state.searchText.length < MIN_SEARCH_TERM_LENGTH &&
        (!this.state.searchForce || !this.props.allowForceSuggestion)
      ) {
        return D.span({className: styles.searchMessage},
          `Minimum length of search term is ${MIN_SEARCH_TERM_LENGTH} characters.`);
      } else if (this.state.searching) {
        return createElement(Spinner, {style: {margin: '10px 0;'}});
      } else if (this.state.searchResult.error) {
        return createElement(ErrorNotification, {errorMessage: this.state.searchResult.error});
      }
    }
    return this.renderScrollableDropdownContent(mode);
  }

  private renderScrollableDropdownContent(mode: ExpandedMode): ReactElement<any> {
    let limitMessage: ReactElement<any> = null;
    let noResultsMessage: ReactElement<any> = null;

    if (mode.type === 'search') {
      const {matchedCount, matchLimit, forest} = this.state.searchResult;
      if (matchLimit && matchedCount === matchLimit) {
        limitMessage = D.span(
          {className: styles.searchMessage},
          `Only first ${matchedCount} matches are shown. Please refine your search.`
        );
      } else if (forest.root.children.size === 0) {
        noResultsMessage = D.span({className: styles.searchMessage}, `No results found.`);
      }
    }

    return D.div(
      {className: styles.tree},
      this.renderTree(mode),
      limitMessage,
      noResultsMessage,
    );
  }

  private renderDropdownFooter(mode: ExpandedMode) {
    const enableSelectionSave = mode.selection !== this.state.confirmedSelection;

    return D.div({className: styles.dropdownFooter},
      createElement(Button, {
        className: styles.dropdownButton,
        bsStyle: 'danger',
        onClick: () => this.closeDropdown({saveSelection: false}),
      }, 'Cancel'),
      createElement(Button, {
        className: styles.dropdownButton,
        bsStyle: 'success',
        disabled: !enableSelectionSave,
        onClick: () => this.closeDropdown({saveSelection: true}),
      }, 'Select'),
    );
  }

  private renderTree(mode: ExpandedMode): ReactElement<any> {
    const inSearchMode = mode.type === 'search';
    const renderedForest = inSearchMode ? this.state.searchResult.forest : this.state.forest;
    const searchTerm = (inSearchMode && this.state.searchText)
      ? this.state.searchText.toLowerCase() : undefined;

    return createElement<NodeTreeProps>(NodeTreeSelector, {
      forest: renderedForest,
      isLeaf: item => item.children
        ? (item.children.size === 0 && !item.hasMoreItems) : undefined,
      childrenOf: ({children, loading, hasMoreItems, error}) => ({
        children, loading, hasMoreItems: hasMoreItems && !error,
      }),
      renderItem: node => this.renderItem(node, searchTerm),
      requestMore: node => {
        const path = renderedForest.getOffsetPath(node);
        this.requestChildren(path, inSearchMode);
      },
      selectionMode: this.props.multipleSelection
        ? MultipleFullSubtrees<Node>() : SingleFullSubtree<Node>(),
      selection: mode.selection,
      onSelectionChanged: selection => {
        this.setState((state: State): State => {
          if (state.mode.type === 'collapsed') { return {}; }
          return {mode: {type: state.mode.type, selection}};
        });
      },
      isExpanded: node => node.expanded,
      onExpandedOrCollapsed: (item, expanded) => {
        const path = renderedForest.getOffsetPath(item);
        this.updateForest(inSearchMode, forest =>
          forest.updateNode(path, node => Node.set(node, {expanded})
        ));
      },
    });
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
          D.span(
            {className: styles.highlighted},
            text.substring(startIndex, endIndex)),
          text.substring(endIndex),
        ];
      }
    }

    return D.span({
      title: node.iri.value,
      className: node.error ? styles.error : undefined,
    }, ...parts);
  }

  private requestChildren(path: OffsetPath, isSearching: boolean) {
    const context = this.context.semanticContext;
    let changePromise: RootsChange;
    this.updateForest(isSearching, (forest, state) => {
      const [loadingForest, forestChange] = queryMoreChildren(
        forest, path, state.rootsQuery, state.childrenQuery, ITEMS_LIMIT, {context});
      changePromise = forestChange;
      return loadingForest;
    }, () => {
      const cancellation = isSearching ? this.search.cancellation : this.cancellation;
      cancellation.map(changePromise)
        .onValue(change => this.updateForest(isSearching, change));
    });
  }

  private restoreTreeFromLeafNodes(
    searchResult: SparqlClient.Bindings,
    cancellation: Cancellation
  ): Kefir.Property<KeyedForest<Node>> {
    const leafs = List(searchResult).map<Node>(
      ({item, score = Rdf.literal('0'), label, hasChildren}) => {
        if (!(item.isIri() && label.isLiteral())) { return undefined; }
        const certainlyLeaf = hasChildren.isLiteral() && hasChildren.value === 'false';
        return {
          iri: item,
          label: label,
          score: parseFloat(score.isLiteral() ? score.value : ''),
          children: List<Node>(),
          hasMoreItems: !certainlyLeaf,
        };
      }).filter(node => node !== undefined);

    const context = this.context.semanticContext;
    return restoreForestFromLeafs(
      leafs, this.state.parentsQuery, cancellation, {context}
    ).map(children => EmptyForest.setRoot({iri: undefined, children}));
  }
}

class OverlayProxy extends Component<{}, void> {
  render() { return Children.only(this.props.children); }
}

function leafsToCommaSeparatedValues(leafs: List<Node>) {
  return leafs.map(node => node.label ? node.label.value : '')
    .sort().join(', ');
}

export default SemanticTreeInput;
