import { ReactElement, createElement } from 'react';
import * as React from 'react';
import * as D from 'react-dom-factories';
import * as SparqlJs from 'sparqljs';
import * as Kefir from 'kefir';
import * as _ from 'lodash';
import * as classnames from 'classnames';

import { Component } from 'platform/api/components';
import { Cancellation } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { SparqlUtil, SparqlClient } from 'platform/api/sparql';
import { TemplateItem } from 'platform/components/ui/template';
import * as LabelsService from 'platform/api/services/resource-label';
import { ErrorNotification } from 'platform/components/ui/notification';
import { ClearableInput, RemovableBadge } from 'platform/components/ui/inputs';
import { Spinner } from 'platform/components/ui/spinner';

import { KeyedForest, KeyPath } from './KeyedForest';
import { TreeSelection, SelectionNode } from './TreeSelection';
import { SingleFullSubtree, MultipleFullSubtreesUnselectable } from './SelectionMode';
import { ForestChange, queryMoreChildren } from './NodeModel';
import { Node, SparqlNodeModel, sealLazyExpanding } from './SparqlNodeModel';
import { LazyTreeSelector, LazyTreeSelectorProps } from './LazyTreeSelector';

import * as styles from './LazyTreeWithSearch.scss';
import { defaultKeywordSearchConfig, KeywordSearchConfig, textConfirmsToConfig } from 'platform/components/shared/KeywordSearchConfig';
import { Action } from 'platform/components/utils';

const ITEMS_LIMIT = 200;
const SEARCH_DELAY_MS = 300;

export interface LazyTreeWithSearchProps extends KeywordSearchConfig {
  rootsQuery: string;
  childrenQuery: string;
  parentsQuery: string;
  searchQuery: string;
  className?: string;
  placeholder?: string;
  onSelectionChanged?: (selection: TreeSelection<Node>) => void;
  initialSelection?: ReadonlyArray<Rdf.Iri | string>;
  multipleSelection?: boolean;
  infoTemplate?: string;

  // number of ms to wait before tiggering text search query
  debounce?: number;
}

interface State {
  forest?: KeyedForest<Node>;
  loadError?: any;
  model?: SparqlNodeModel;
  searchQuery?: SparqlJs.SelectQuery;
  confirmedSelection?: TreeSelection<Node>;
  searchText?: string;
  searching?: boolean;
  searchResult?: SearchResult;
}

interface SearchResult {
  forest?: KeyedForest<Node>;
  error?: any;
  matchedCount?: number;
  matchLimit?: number;
}

export class LazyTreeWithSearch extends Component<LazyTreeWithSearchProps, State> {
  static defaultProps: Partial<LazyTreeWithSearchProps> = {
    debounce: SEARCH_DELAY_MS,
    ... defaultKeywordSearchConfig
  };


  private readonly cancellation = new Cancellation();
  private search = this.cancellation.derive();
  private keys: Action<string>;

  constructor(props: LazyTreeWithSearchProps, context) {
    super(props, context);
    this.state = {
      ...this.createQueryModel(props),
      forest: Node.readyToLoadForest,
      confirmedSelection: TreeSelection.empty(Node.emptyForest),
    };

    this.keys = Action<string>('');
  }

  private createQueryModel(props: LazyTreeWithSearchProps): Partial<State> {
    try {
      const model = new SparqlNodeModel({
        rootsQuery: SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.rootsQuery),
        childrenQuery: SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.childrenQuery),
        parentsQuery: SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.parentsQuery),
        limit: ITEMS_LIMIT,
        sparqlOptions: () => ({ context: this.context.semanticContext }),
        useLabelService: true,
      });
      const searchQuery = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.searchQuery);
      return { model, searchQuery };
    } catch (loadError) {
      return { loadError };
    }
  }

  componentDidMount() {
    this.initialize();

    const { initialSelection } = this.props;
    if (initialSelection && initialSelection.length !== 0) {
      const selection = initialSelection.map(s => typeof s === 'string' ? Rdf.iri(s) : s);
      this.setInitialSelection(selection).onValue(() => {});
    }
  }

  initialize() {
    const keysProp = this.keys.$property.debounce(this.props.debounce);

    const conformingKeys = keysProp.filter((str) => textConfirmsToConfig(str, this.props));
    const nonConformingKeys = keysProp.filter((str) => !textConfirmsToConfig(str, this.props));

    keysProp.flatMapLatest(text => {
      if (!textConfirmsToConfig(text, this.props)) {
        return Kefir.constant({ searchResult: undefined, searching: false });
      } else {
        this.setState({ searching: true });
        return this.performSearch(text)
          .map(searchResult => ({ searchResult, searching: false }))
          .mapErrors(error => ({ searchResult: { error }, searching: false }));
      }
    })
    .onValue(state => this.setState(state));
  }

  componentWillReceiveProps(newProps: LazyTreeWithSearchProps) {
    if (newProps.rootsQuery !== this.props.rootsQuery) {
      this.setState({
        ...this.createQueryModel(newProps),
        forest: Node.readyToLoadForest,  
      })
    } else if(TreeSelection.leafs(this.state.confirmedSelection).size != newProps.initialSelection.length) {
      const selection = newProps.initialSelection.map(s => typeof s === 'string' ? Rdf.iri(s) : s);
      this.setInitialSelection(selection).onValue(() => {});
    }
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private setInitialSelection = (initialSelection: ReadonlyArray<Rdf.Iri>) => {
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

  render() {
    if (this.state.loadError) {
      return D.div(
        { className: classnames(styles.holder, this.props.className) },
        React.createElement(ErrorNotification, { errorMessage: this.state.loadError })
      );
    }

    return D.div(
      { className: classnames(styles.holder, this.props.className), style: { height: '100%', width: '100%' } },
      this.renderSearchInput(),
      this.renderHierarchy()
    );
  }

  private renderSearchInput() {
    return React.createElement(ClearableInput, {
      className: styles.textInput,
      inputClassName: styles.input,
      value: this.state.searchText || '',
      placeholder: this.props.placeholder,
      onChange: (e) => this.onKeyPress(e.currentTarget.value),
      onClear: () => this.setState({ searchText: '', searchResult: undefined }),
    });
  }

  onKeyPress = (searchText: string) => {
    this.setState({searchText}, () => this.keys(this.state.searchText));
  }

  performSearch = (text: string) => {
    const { escapeLuceneSyntax, tokenizeLuceneQuery, minTokenLength } = this.props;

    const parametrized = SparqlClient.setBindings(this.state.searchQuery, {
      __token__: SparqlUtil.makeLuceneQuery(text, escapeLuceneSyntax, tokenizeLuceneQuery, minTokenLength),
    });

    return this.search.map(
        SparqlClient.select(parametrized, { context: this.context.semanticContext })
      )
      .flatMap<SearchResult>((result) =>
        this.restoreTreeFromLeafNodes(result.results.bindings).map((forest) => ({
          forest,
          matchedCount: result.results.bindings.length,
          matchLimit: parametrized.limit,
        }))
      );
  }

  private renderHierarchy(): ReactElement<any> {
    const { searchResult, searching, forest, searchText } = this.state;
    
    if (searching) {
      return React.createElement(Spinner, { className: styles.searchSpinner });
    }

    if (searchResult?.error) {
      return React.createElement(ErrorNotification, { errorMessage: searchResult.error });
    }

    const renderedForest = searchResult?.forest || forest;

    if (!_.isEmpty(searchText) && (!renderedForest.root.children || renderedForest.root.children.length === 0)) {
      return D.span({ className: styles.searchMessage }, `No results found.`);
    } else {
      const config: LazyTreeSelectorProps<Node> = {
        forest: renderedForest,
        isLeaf: (item) => item.children ? item.children.length === 0 && !this.state.model.hasMoreChildren(item) : undefined,
        childrenOf: (item) => ({
          children: item.children,
          loading: item.loading,
          hasMoreItems: this.state.model.hasMoreChildren(item),
        }),
        renderItem: (node) => this.renderItem(node),
        requestMore: (node) => this.requestChildren(renderedForest.getKeyPath(node)),
        selectionMode: this.props.multipleSelection ? MultipleFullSubtreesUnselectable<Node>() : SingleFullSubtree<Node>(),
        selection: this.state.confirmedSelection,
        onSelectionChanged: this.onSelectionChanged,
        isExpanded: (node) => node.expanded,
        onExpandedOrCollapsed: (item, expanded) => {
          const path = renderedForest.getKeyPath(item);
          this.updateForest(
            !!this.state.searchResult,
            (forest) => forest.updateNode(path, (node) => ({ ...node, expanded }))
          );
        },
      };

      return React.createElement(LazyTreeSelector, config);
    }
  }

  private renderItem(node: Node) {
    const text = node.label ? node.label.value : node.iri.value;
    return D.span({ title: node.iri.value }, text, this.renderNodeInfoTemplate(node));
  }

  private renderNodeInfoTemplate(node: Node) {
    if (this.props.infoTemplate) {
      return createElement(TemplateItem, {template: {source: this.props.infoTemplate, options: {iri: node.iri.value, label: node.label.value, binding: node.tuple}}});
    } else {
      return null;
    }
  }

  private onSelectionChanged = (selection: TreeSelection<Node>) => {
    this.setState({ confirmedSelection: selection });
    if (this.props.onSelectionChanged) {
      this.props.onSelectionChanged(selection);
    }
  }

  private requestChildren(path: KeyPath) {
    let changePromise: ForestChange<Node>;
    this.setState(
      (state) => ({
        forest: (() => {
          const [loadingForest, forestChange] = queryMoreChildren(
            (parent) => state.model.loadMoreChildren(parent),
            state.forest,
            path
          );
          changePromise = forestChange;
          return loadingForest;
        })(),
      }),
      () => {
        this.cancellation.map(changePromise).onValue((change) =>
          this.setState((state) => ({ forest: change(state.forest) }))
        );
      }
    );
  }

  private updateForest(
    displayingSearch: boolean,
    update: (forest: KeyedForest<Node>) => KeyedForest<Node>,
    callback?: () => void
  ) {
    this.setState((state: State): Partial<State> => {
      if (displayingSearch) {
        return {
          searchResult: {
            ...state.searchResult,
            forest: update(state.searchResult.forest),
          },
        };
      } else {
        return { forest: update(state.forest) };
      }
    }, callback);
  }

  private restoreTreeFromLeafNodes(searchResult: SparqlClient.Bindings): Kefir.Property<KeyedForest<Node>> {
    const leafs = searchResult
      .map(
        (binding): Partial<Node> => {
          const { item, score = Rdf.literal('0'), hasChildren } = binding;
          if (!item.isIri()) {
            return undefined;
          }
          const certainlyLeaf = hasChildren.isLiteral() && hasChildren.value === 'false';
          return {
            iri: item,
            tuple: binding,
            score: parseFloat(score.isLiteral() ? score.value : ''),
            children: [],
            reachedLimit: certainlyLeaf,
          };
        }
      )
      .filter((node): node is Partial<Node> => node !== undefined);
  
    return LabelsService.getLabels(leafs.map(node => node.iri), { context: this.context.semanticContext })
      .flatMap(labels => {
        const nodesWithLabels = leafs.map(node => ({
          ...node,
          label: labels.has(node.iri) ? Rdf.literal(labels.get(node.iri)) : undefined,
        }));
  
        return this.state.model
          .loadFromLeafs(nodesWithLabels as Node[], { transitiveReduction: true })
          .map((treeRoot) => KeyedForest.create(Node.keyOf, sealLazyExpanding(treeRoot)));
      })
      .toProperty();
  }
  
}