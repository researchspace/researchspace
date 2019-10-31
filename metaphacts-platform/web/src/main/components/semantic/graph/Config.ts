/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import { has } from 'lodash';

export interface Stylesheet {
  /**
   * The selector concept is similar to the CSS selector, but it provides mechanism to match on Rdf Graphs.
   * The most significant difference to the CSS selector is that, the specificity rules are completely ignored in stylesheets. For a given style property for a given element, the last matching selector wins.
   *
   * The selector semantics is based on <a target='_blank' href='http://js.cytoscape.org/#selectors'>Cytoscape's Selectors</a> with additional RDF specific matchers like:
   *
   * 1) Matching on nodes/edges:
   *   * **node** - `node` selector is used to match on all nodes
   *   * **edge** - `edge` selector is used to match on all edges
   *
   * 2) Matching on node type:
   *   * **IRI** - to match only nodes which are IRIs one can use `node[?isIri]` selector
   *   * **literal** - to match only nodes which are literals one can use `node[?isLiteral]` selector
   *   * **bnode** - to match only nodes which are bnodes one can use `node[?isBnode]` selector
   *
   * 3) Exact match on node/edge identifier:
   *   * **IRI**. To match on the IRI use `iri` helper function, for example to match the node with IRI `<http://example.com/perso/alice>` use `node[resource = iri(<http://example.com/person/alice>)]`. In the same way one can match on edges using `edge[resource = iri(<...>)]` syntax
   *   * **literal** To match on the string literal use `literal` helper function. `literal` helper function takes second optional argument to specify literal data type, by default it assumes `xsd:string`. For example to match string literal `"Alice"` one can use the following pattern `node[resource = literal(Alice)]'`. In case of typed literal, for example `2^^xsd:integer`, one need to explicitly provide datatype - `node[resource = literal("2", iri(<http://www.w3.org/2001/XMLSchema#integer>))]`
   *
   * 4) Match on outgoing properties:
   *   * **property existence** One can match all nodes which have specific outgoing property without any constrain on the property value. There is special `property` function to match on outgoing edges. For example to match on all nodes that have `foaf:knows` outgoing edges - `node[property(<http://xmlns.com/foaf/0.1/knows>)]`
   *   * **property value** Also it is possible to match on the nodes which have some specific value for some property. One of the most typical use-case for this matcher is styling of nodes of some `rdf:type`, but it is also possible to match on literal values, etc. For example to match on all nodes that have value `2^^xsd:integer` for some property `<http://example.com/count>` - `[property(<http://example.com/count>) *= literal(2, iri(<http://www.w3.org/2001/XMLSchema#integer>))]`
   *
   * 5) Matching on edge source/target:
   *   * **source** - to match on all edges which have some specific resource as a source one can use `edge[source = iri(<...>)]` syntax
   *   * **target** - to match on all edges which are pointing to some specific resource one can use `edge[target = iri(<...>)]` syntax
   *
   * Selectors can be combined together (logical AND) or joined together (logical OR) with commas.
   * For example to match on nodes that have both `example:Alice` **AND** `example:Bob` as `foaf:knows` values one can use the following selector - `node[property(<http://xmlns.com/foaf/0.1/knows>) *= iri(<http://example.com/person/Alice>)][property(<http://xmlns.com/foaf/0.1/knows>) *= iri(<http://example.com/person/Bob>)`.
   * And to match on nodes that `foaf:knows` has value `example:Alice` **OR** `example:Bob` on can use the following selector `node[property(<http://xmlns.com/foaf/0.1/knows>) *= iri(<http://example.com/person/Alice>)], node[property(<http://xmlns.com/foaf/0.1/knows>) *= iri(<http://example.com/person/Bob>)`.
   *
   * Some cytoscape extensions can define their own useful matchers.
   */
  selector: string

  /**
   * Graph styles definition in JSON format.
   * In additional to built-in [Cytoscape.js Styles](http://js.cytoscape.org/#style) one can also use some features which are specific to RDF graphs.
   *
   * It is possible to use handlebars templates to access values of outgoing edges in style attributes. E.g. to use `rdfs:label` value as label for the node one can use the following style:
   * ```
   * 'style': {
   *   'content': '{{[<http://www.w3.org/2000/01/rdf-schema#label>].[0].value}}',
   * }
   * ```
   * The assumption here is that a property can have multiple values.
   *
   * Also it is possible to use resource preferred label or preferred thumbnail with the help of `data` function.
   * For example to use preferred label for as node content one can use the following snippet:
   * ```
   * 'style': {
   *   'content': 'data(label)',
   * }
   * ```
   * and in A similar way preferred thumbnail can be used as node background:
   * ```
   * 'style': {
   *   'content': 'data(thumbnail)',
   * }
   * ```
   *
   */
  style: Cy.Css.ElementCss
}
export type Stylesheets = Array<Stylesheet>;

/**
 * The most simple graph configuration option which require only SPARQL CONSTRUCT query. Visualize all statements from the resulted graph, including literal nodes.
 */
export interface BaseSemanticGraphConfig {
  /**
   * SPARQL CONSTRUCT query string. By default all triples are visualized, including literal nodes
   */
  query: string;

  /**
   * <semantic-link uri='http://help.metaphacts.com/resource/FrontendTemplating'>Template</semantic-link> which is applied when query returns no results
   */
  noResultTemplate?: string;

  /**
   * Graph styles definitions. There are some default styles defined for `edge`, `node`, `node[?isLiteral]`, `edge.meta`, etc. So be careful when overriding these generic selectors, because then you will lose all defaults.
   */
  graphStyle?: Stylesheets;

  /**
   * It is possible to group nodes according to some predicate (discriminator) value to display containment relation. Accepts full IRI of the property that should be used as a discriminator.
   */
  groupBy?: string;

  /**
   * Height of the graph component canvas in pixels
   *
   * @default 400
   */
  height?: number;

  /**
   * Enable/disable mouse zoom.
   *
   * @default true
   */
  userZoomingEnabled?: boolean;

  /**
   * ID for issuing component events.
   */
  id?: string;

  /**
   * `true` if click on the graph node should open corresponding resource page in the new window.
   *
   * @default false
   */
  openLinksInNewWindow?: boolean;
}

/**
 * With the default configuration, all triples which are present in the graph are always visualized.
 * But it is possible to show only specific triples using `showPredicates` option.
 */
export interface SemanticGraphConfigShow extends BaseSemanticGraphConfig {

  /**
   * White-list edges that should be visualized in graph. If some node is used only with non-visible predicates it will not be shown. Accepts only full IRIs in angle brackets, e.g `<http://example.com/something>`
   */
  showPredicates: string[];
}

/**
 * With the default configuration, all triples which are present in the graph are always visualized.
 * But it is possible to hide triples using `hidePredicates` option. For example most of the time it can be convenient to hide predicates with literal values.
 */
export interface SemanticGraphConfigHide extends BaseSemanticGraphConfig {

  /**
   * Blacklist-list edges that should not be visualized in graph. If some node is used only with black-listed predicates it will not be shown. Accepts only full IRIs in angle brackets, e.g `<http://example.com/something>`.
   */
  hidePredicates: string[];
}

export type SemanticGraphConfig =
  BaseSemanticGraphConfig | SemanticGraphConfigShow | SemanticGraphConfigHide;

export function configWithHidePredicates(
  config: SemanticGraphConfig
): config is SemanticGraphConfigHide {
  return has(config, 'hidePredicates');
}

export function configWithShowPredicates(
  config: SemanticGraphConfig
): config is SemanticGraphConfigShow {
  return has(config, 'showPredicates');
}
