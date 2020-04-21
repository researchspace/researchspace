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

import { map, reduce, filter, every, some, cloneDeep } from 'lodash';
import { Set, Map } from 'immutable';
import * as Kefir from 'kefir';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient, QueryContext } from 'platform/api/sparql';

import { getLabels } from 'platform/api/services/resource-label';
import { getThumbnails } from 'platform/api/services/resource-thumbnail';
import { SemanticGraphConfig, configWithHidePredicates, configWithShowPredicates, Stylesheets } from './Config';

const DEFAULT_THUMBNAIL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/**
 * Mapping from Node to parent Node. It is used to construct compound nodes in Cytoscape.
 *
 * Typically it is mapping from some Iri to corresponding named graph Iri.
 */
type GroupsMap = Map<Rdf.Node, Set<Rdf.Node>>;

interface ResourceDataDefinition {
  node: Rdf.Node;
  resource: string;
  label?: string;
  thumbnail?: string;
}

interface ResourceNodeDataDefinition extends ResourceDataDefinition, Cy.NodeDataDefinition {
  isIri: boolean;
  isLiteral: boolean;
  isBnode: boolean;
}

interface ResourceEdgeDataDefinition extends ResourceDataDefinition, Cy.EdgeDataDefinition {}

interface ResourceCytoscapeElement extends Cy.ElementDefinition {
  data: ResourceNodeDataDefinition | ResourceEdgeDataDefinition;
}

export interface ResourceCytoscapeNode extends Cy.NodeDefinition {
  data: ResourceNodeDataDefinition;
}

export interface ResourceCytoscapeEdge extends Cy.EdgeDefinition {
  data: ResourceEdgeDataDefinition;
}

/**
 * Special marker that indicates that node doesn't belongs to any compound node.
 */
const GLOBAL_GROUP = Rdf.iri('GLOBAL_GROUP');
const NO_GROUP_SET = Set.of(GLOBAL_GROUP);

/**
 * Parse component config and apply default styles if needed.
 */
export function parseComponentConfig(defaultStyles: Stylesheets, config: SemanticGraphConfig): SemanticGraphConfig {
  const parsedConfig = cloneDeep(config);

  // Merge user provided styles with defaults.
  if (_.has(config, 'graphStyle')) {
    parsedConfig.graphStyle = mergeStyles(defaultStyles, config.graphStyle);
  } else {
    parsedConfig.graphStyle = defaultStyles;
  }

  return parsedConfig;
}

/**
 * Merge two cytoscape style definitions. If there are two styles with same selector
 * then style definition is taken from the second stylesheet. This way we can make sure
 * that user can reuse default styles and override only what is required.
 */
function mergeStyles(defaultStyles: Stylesheets, overrideStyles: Stylesheets): Stylesheets {
  // filter default styles which has not been overridden
  const stylesFromAToKeep = filter(defaultStyles, (d) => !_.some(overrideStyles, (o) => d.selector === o.selector));
  return stylesFromAToKeep.concat(overrideStyles);
}

/**
 * Fetch graph data using SPARQL Construct query and then fetch corresponding labels for
 * all resources from query result. Default system label is always available as
 * 'label' property on cytoscape data element.
 */
export function getGraphDataWithLabels(
  config: SemanticGraphConfig,
  options: { context?: QueryContext }
): Kefir.Property<ResourceCytoscapeElement[]> {
  const { context } = options;
  const graphData = getGraphData(config, context);
  const labels = graphData.flatMap(fetchLabels(context));
  const thumbnails = graphData.flatMap(fetchThumbnails(context));
  return Kefir.combine([graphData, labels, thumbnails], addLabelsToGraphData).toProperty();
}

/**
 * Put default resource label into cytoscpae 'label' data property.
 */
export function addLabelsToGraphData(
  elements: ResourceCytoscapeElement[],
  labels: Map<Rdf.Node, string>,
  thumbnails: Map<Rdf.Node, string>
): ResourceCytoscapeElement[] {
  return map(elements, (element) => {
    element.data.label = labels.get(element.data.node);
    element.data.thumbnail = thumbnails.get(element.data.node) || DEFAULT_THUMBNAIL;
    return element;
  });
}

function fetchLabels(context?: QueryContext) {
  return function (elements: ResourceCytoscapeElement[]): Kefir.Property<Map<Rdf.Node, string>> {
    return fetchLabelsForResources(elements, context).map((labels) => getLabelsForLiterals(elements).merge(labels));
  };
}

/**
 * Because labels service doesn't support literals we just use literal value as a label.
 */
function getLabelsForLiterals(elements: ResourceCytoscapeElement[]): Map<Rdf.Node, string> {
  const elementsWithLiterals = elements.filter((e) => e.data.node.isLiteral);
  return Map(
    map<ResourceCytoscapeElement, [Rdf.Node, string]>(elementsWithLiterals, (e) => [e.data.node, e.data.node.value])
  );
}

/**
 * Fetch labels for resources using [LabelsService].
 */
function fetchLabelsForResources(
  elements: ResourceCytoscapeElement[],
  context?: QueryContext
): Kefir.Property<Map<Rdf.Iri, string>> {
  const elementsWithIri = filter(elements, (e) => e.data.node.isIri());
  const iris = map(elementsWithIri, (e) => e.data.node as Rdf.Iri);
  return getLabels(iris, { context });
}

/**
 * Fetch thumbnails for resources using [ThumbnailService].
 */
function fetchThumbnails(context?: QueryContext) {
  return function (elements: ResourceCytoscapeElement[]): Kefir.Property<Map<Rdf.Node, string>> {
    const elementsWithIri = filter(elements, (e) => e.group === 'nodes' && e.data.node.isIri());
    const iris = map(elementsWithIri, (e) => e.data.node as Rdf.Iri);
    return getThumbnails(iris, { context });
  };
}

/**
 * Execute SPARQL construct query for graph widget and parse the result to Cytoscape.js format,
 * applying graph widget configuration. See [prepareGraphData] for more details.
 */
export function getGraphData(
  config: SemanticGraphConfig,
  context: QueryContext
): Kefir.Property<ResourceCytoscapeElement[]> {
  return SparqlClient.construct(config.query, { context }).map(prepareGraphData(config));
}

/**
 * 1) Filter nodes that need to be shown using 'hidePredicates' and 'showPredicates' options.
 * 2) Group nodes if 'groupBy' was provided.
 * 3) Build Cytoscape elements.
 */
export function prepareGraphData(config: SemanticGraphConfig): (triples: Rdf.Triple[]) => ResourceCytoscapeElement[] {
  return (triples: Rdf.Triple[]): ResourceCytoscapeElement[] => {
    const triplesToShow = filter(triples, getTriplesFilterFunction(config));
    const groups = getGroups(config, triples);
    const nodes = buildNodes(triplesToShow, triples, groups);
    const edges = buildEgdes(triplesToShow, triples, groups);
    return (edges as Array<ResourceCytoscapeElement>).concat(nodes as Array<ResourceCytoscapeElement>);
  };
}

/**
 * Group nodes according to 'groupBy' config properties.
 *
 * @see GroupsMap
 * @see constructGroups
 */
function getGroups(config: SemanticGraphConfig, triples: Rdf.Triple[]): GroupsMap {
  if (config.groupBy) {
    return constructGroups(triples, Rdf.fullIri(config.groupBy));
  } else {
    return Map<Rdf.Node, Set<Rdf.Node>>();
  }
}

/**
 * Create mapping from Nodes to parent Nodes, mapping is based on 'groupByPredicate'.
 *
 * @see GroupsMap
 */
function constructGroups(triples: Rdf.Triple[], groupByPredicate: Rdf.Iri): GroupsMap {
  const groupByStatements = filter(triples, (triple) => triple.p.equals(groupByPredicate));
  return reduce(
    groupByStatements,
    (map: GroupsMap, triple: Rdf.Triple) => {
      const groups = map.has(triple.s) ? map.get(triple.s) : Set<Rdf.Node>();
      return map.set(triple.s, groups.add(triple.o));
    },
    Map<Rdf.Node, Set<Rdf.Node>>().asMutable()
  ).asImmutable();
}

function getTriplesFilterFunction(config: SemanticGraphConfig): (triple: Rdf.Triple) => boolean {
  // Order is important because property hidePredicates has default value.
  // configWithHidePredicates(config) is always true.
  // So if change the order then the second part will not be executed.
  if (configWithShowPredicates(config)) {
    // Function to filter only triples which use predicates from 'showPredicates' array.
    const showPredicates = map(config.showPredicates, Rdf.fullIri);
    return (triple: Rdf.Triple) => some(showPredicates, (predicate) => predicate.equals(triple.p));
  } else if (configWithHidePredicates(config)) {
    const hidePredicates = map(config.hidePredicates, Rdf.fullIri);
    // Function to filter only triples which do not use predicates from 'hidePredicates' array.
    return (triple: Rdf.Triple) => every(hidePredicates, (predicate) => predicate.equals(triple.p) === false);
  } else {
    return () => true;
  }
}

function buildNodes(
  triplesToShow: Rdf.Triple[],
  allTriples: Rdf.Triple[],
  groupsMap: GroupsMap
): ResourceCytoscapeNode[] {
  const addNode = (acc: Set<Rdf.Node>, triple: Rdf.Triple) => acc.add(triple.s).add(triple.o);
  const resources = reduce(triplesToShow, addNode, Set<Rdf.Node>());

  const groups = groupsMap.reduce(
    (acc: Set<Rdf.Node>, groupNodes: Set<Rdf.Node>) => acc.union(groupNodes),
    Set<Rdf.Node>()
  );
  return groups
    .union(resources)
    .map((r) => createGraphResourceNodes(r, allTriples, groupsMap.get(r), groupsMap))
    .flatten()
    .toArray();
}

function buildEgdes(
  triplesToShow: Rdf.Triple[],
  allTriples: Rdf.Triple[],
  groupsMap: GroupsMap
): ResourceCytoscapeEdge[] {
  return Set(triplesToShow)
    .flatMap((triple: Rdf.Triple) => createGraphResourceEdges(triple, allTriples, groupsMap))
    .toArray();
}

function createGraphResourceNodes(
  node: Rdf.Node,
  triples: Rdf.Triple[],
  nodeGroups: Set<Rdf.Node> | undefined,
  groupsMap: GroupsMap
): Set<ResourceCytoscapeNode> {
  return nodeGroups
    ? nodeGroups.map((group) => createGraphNode(node, triples, groupsMap, group))
    : Set.of(createGraphNode(node, triples, groupsMap));
}

function createGraphNode(
  node: Rdf.Node,
  triples: Rdf.Triple[],
  groupsMap: GroupsMap,
  nodeGroup: Rdf.Node | undefined = undefined
): ResourceCytoscapeNode {
  /**
   * generate group id for nested groups. Currently group can't be nested in
   * multiple groups at the same time
   */
  const nodeGroupGroup = groupsMap.has(nodeGroup) ? groupsMap.get(nodeGroup).first() : undefined;
  const cytoscapeNode: ResourceCytoscapeNode = {
    group: 'nodes',
    data: {
      id: createNodeId(node, nodeGroup),

      // if node belongs to some group it is specified as 'parent' property,
      // see http://js.cytoscape.org/#notation/compound-nodes
      parent: nodeGroup ? createNodeId(nodeGroup, nodeGroupGroup) : undefined,
      node: node,
      resource: node.toString(),
      isIri: node.isIri(),
      isLiteral: node.isLiteral(),
      isBnode: node.isBnode(),
    },
  };
  return addPropertiesToTheElementData(triples, cytoscapeNode);
}

function createNodeId(node: Rdf.Node, nodeGroup: Rdf.Node | undefined = undefined): string {
  return nodeGroup && !nodeGroup.equals(GLOBAL_GROUP) ? nodeGroup.toString() + node.toString() : node.toString();
}

function createGraphResourceEdges(
  triple: Rdf.Triple,
  triples: Rdf.Triple[],
  groupsMap: GroupsMap
): Set<ResourceCytoscapeEdge> {
  if (groupsMap.isEmpty()) {
    // when we don't have any compound nodes, generate simple single edge.
    return Set.of(createGraphEdge(triple.s.toString(), triple.o.toString(), triple.p, triples));
  } else {
    return createEdgesWithGroups(triple, triples, groupsMap);
  }
}

/*
 * When we have compound nodes, situation is a little bit tricky, because node can be
 * part of multiple groups, so we need to make sure that it is properly visualized in
 * all of them.
 *
 * We duplicate node in all compound nodes that it belongs to.
 */
function createEdgesWithGroups(
  triple: Rdf.Triple,
  triples: Rdf.Triple[],
  groupsMap: GroupsMap
): Set<ResourceCytoscapeEdge> {
  const subjectGroups = groupsMap.has(triple.s) ? groupsMap.get(triple.s) : NO_GROUP_SET;
  const objectGroups = groupsMap.has(triple.o) ? groupsMap.get(triple.o) : NO_GROUP_SET;

  // check if object and subject share the same group
  const shareTheGroup = !subjectGroups.intersect(objectGroups).isEmpty();

  // basically we need to generate edges for all possible group permutations
  return subjectGroups.flatMap((subjectGroup) =>
    objectGroups
      .filterNot(
        // but do not generate outgoing edges to other groups if nodes belongs to the same group
        (objectGroup) => !objectGroup.equals(subjectGroup) && shareTheGroup
      )
      .map((objectGroup) =>
        createGraphEdge(createNodeId(triple.s, subjectGroup), createNodeId(triple.o, objectGroup), triple.p, triples)
      )
  );
}

function createGraphEdge(
  subjectNodeId: string,
  objectNodeId: string,
  predicate: Rdf.Node,
  triples: Rdf.Triple[]
): ResourceCytoscapeEdge {
  const cytoscapeEdge: ResourceCytoscapeEdge = {
    group: 'edges',
    data: {
      id: subjectNodeId + predicate.toString() + objectNodeId,
      node: predicate,
      resource: predicate.toString(),
      source: subjectNodeId,
      target: objectNodeId,
    },
  };
  return addPropertiesToTheElementData(triples, cytoscapeEdge);
}

function addPropertiesToTheElementData<T extends ResourceCytoscapeElement>(
  triples: Rdf.Triple[],
  cytoscapeElement: T
): T {
  return reduce(
    triples,
    (resultingNode: T, triple: Rdf.Triple) => {
      if (triple.s.equals(resultingNode.data.node)) {
        return updateElementPropertyValue(resultingNode, triple);
      } else {
        return resultingNode;
      }
    },
    cytoscapeElement
  );
}

function updateElementPropertyValue<T extends ResourceCytoscapeElement>(node: T, triple: Rdf.Triple): T {
  const propertyValues: Array<Rdf.Node> = node.data[triple.p.toString()] || [];
  propertyValues.push(triple.o);
  node.data[triple.p.toString()] = propertyValues;

  /*
   * For all outgoing RDF properties we generate special data properties for cytoscape: "->URI".
   * So it is possible to use them in Cytoscape style selector.
   * E.g to select all nodes which have rdf:type owl:Thing:
   * '-><http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'*='<http://www.w3.org/2002/07/owl#Thing>'
   */
  node.data['->' + triple.p.toString()] = propertyValues.join(' ');
  return node;
}
