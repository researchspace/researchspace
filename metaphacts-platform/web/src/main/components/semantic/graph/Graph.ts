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

import { identity } from 'core.lambda';
import { Component, Props as ReactProps, createFactory } from 'react';
import * as D from 'react-dom-factories';
import * as assign from 'object-assign';
import * as jquery from 'jquery';
import * as cytoscape from 'cytoscape';
import * as regCose from 'cytoscape-cose-bilkent';
import * as maybe from 'data.maybe';
import * as _ from 'lodash';

import { vocabularies } from 'platform/api/rdf';
import { TemplateScope, CompiledTemplate } from 'platform/api/services/template';
import { CytoscapeContext, CytoscapeContextTypes, DATA_LOADED_EVENT } from './api/Api';

// need to register jquery instance in Cytoscape, to make sure that we're using the same instance
// in the core Cytoscape, as well as in all Cytoscape plugins
cytoscape.registerJquery(jquery);

/**
 * Cytoscape component properties
 */
export interface Config {
  /**
   * An array of [[Cy.ElementDefinition]] specified as plain objects.
   */
  elements: Cy.ElementDefinition[];

  /**
   * Height of the Cytoscape canvas in pixels.
   */
  height: number;

  /**
   * List of style definitions to apply to graph.
   */
  graphStyle?: Cy.Stylesheet[];

  /**
   * Enable/disable mouse zoom
   */
  userZoomingEnabled?: boolean;

  /**
   * Action to execute on node/edge click.
   */
  onClick?: (event: Cy.EventObject) => void;
}
export type Props = Config & ReactProps<Graph>;

export interface State {
  cytoscape?: Data.Maybe<Cy.Instance>;
  layout?: Cy.LayoutOptions;
}

/**
 * React wrapper around Cytoscape.js library.
 *
 * # Extension Mechanism
 * It is possible to extend default Cytoscape functionality with 3-rd party plugins.
 * E.g see http://js.cytoscape.org/#extensions for list of  Cytoscape.js
 * community supported extensions.
 *
 * To simplify integration of 3-rd party extensions into platform we provide extension
 * mechanism based on React. Cytoscape React extension is a component which can be used
 * as child component of CytoscapeComponent and have an access to Cytoscape internals.
 * Access to Cytoscape instance is provided with the help of React Context
 * (see https://facebook.github.io/react/docs/context.html).
 *
 * @see http://js.cytoscape.org/
 */
export class Graph extends Component<Props, State> {

  /**
   * Regex to find handlebars templates in the Cytoscape JSON style definition.
   */
  private HANDLEBARS_REGEX: RegExp = /{{{?([^{}]+)}}}?/;

  private static CYTOSCAPE_CONTAINER_REF = 'cytoscape';
  refs: {
    cytoscape: Element
  };

  constructor(props: Props) {
    super(props);

    regCose(cytoscape);  // register cose-bilkent layout

    this.state = {
      cytoscape: maybe.Nothing<Cy.Instance>(),
      layout: {
        name: 'cose-bilkent',
        idealEdgeLength: 100,
      },
    };
  }

  static childContextTypes = CytoscapeContextTypes;

  getChildContext(): CytoscapeContext {
    return {
      cytoscapeApi: {
        cytoscape: cytoscape,
        jQuery: jquery,
        instance: this.state.cytoscape,
        actions: {
          setLayout: this.setLayout,
          runLayout: this.runLayout,
        },
      },
    };
  }

  componentDidMount() {
    const cy = this.createCytoscapeInstance(this.props);
    this.replaceCytoscapeData(cy, this.props.elements);
    this.setState({
      cytoscape: maybe.Just(cy),
    });
  }

  componentWillReceiveProps(props: Props) {
    if (!_.isEqual(props.elements, this.props.elements)) {
      this.state.cytoscape.map(
        cy => this.replaceCytoscapeData(cy, props.elements)
      );
    }
  }

  componentWillUnmount() {
    this.state.cytoscape.map(
      cy => cy.destroy()
    );
  }

  render() {
    // we need to redraw the chart on each render
    // when we use it in tabs or collapsible panel
    this.redraw();

    return D.div(
      {},
      D.div(
        {
          ref: Graph.CYTOSCAPE_CONTAINER_REF,
          style: {
            height: this.props.height,
            width: '100%',

            // need to be relative if we want to put other plugins inside,
            // e.g cytoscape-navigator plugin
            position: 'relative',
          },
        }
      ),
      this.state.cytoscape.map(
        _ => this.props.children
      ).getOrElse(null)
    );
  }

  private setLayout = (layout: Cy.LayoutOptions): void => {
    this.setState({layout: layout});
  }

  private runLayout = () => {
    this.state.cytoscape.map(
      cy => this.getElementsToLayout(cy).makeLayout(this.state.layout).run()
    );
  }

  private redraw() {
    this.state.cytoscape.map(
      cy => {
        cy.resize();
        cy.fit();
      }
    );
  }

  /**
   * When doing graph layout we need to exclude some edges from layout algorithm.
   * For example edges from child to it's parent.
   *
   * @see https://github.com/cytoscape/cytoscape.js-cose-bilkent/issues/25
   */
  private getElementsToLayout(cy: Cy.Instance): Cy.CollectionElements {
    return cy.filter((i, e: any) => {
      if (e.isNode()) {
        return true;
      } else {
        // filter out edges from child to it's parent and vice-verse
        return !(
          e.source().parent().id() === e.target().id() ||
            e.target().parent().id() === e.source().id()
        );
      }
    });
  }

  private replaceCytoscapeData(cytoscape: Cy.Instance, elements: Cy.ElementDefinition[]) {
    cytoscape.remove('*');
    cytoscape.add(elements);

    if (elements.length !== 0) {
      this.runLayout();
      cytoscape.one(
        'layoutstop', () => cytoscape.trigger(DATA_LOADED_EVENT)
      );
    }
  }

  private createCytoscapeInstance(props: Props) {
    const cy = cytoscape(
      this.composeCytoscapeConfig(props)
    );

    // attach event handlers
    const onClick = props.onClick ? props.onClick : identity;
    cy.on('tap', 'node', onClick);
    cy.on('tap', 'edge', onClick);

    return cy;
  }

  private composeCytoscapeConfig(props: Props): Cy.CytoscapeOptions {
    const opts = {
      container: this.refs.cytoscape,
      userZoomingEnabled: false,
    };
    const style = {
      style: this.compileStyles(props.graphStyle),
    };
    return assign(opts, this.props, style);
  }

  private static styleTemplateFunction: (template: CompiledTemplate, x: string) =>
    (obj: Cy.CollectionFirstElement) => string =
    function(template: CompiledTemplate, x: string) {
      return function(obj: Cy.CollectionFirstElement): string {
        return template(obj.data());
      };
    };

  private compileStyles(styles: Cy.Stylesheet[]): Cy.Stylesheet[] {
    return _.map(
      styles, (stylesheet: Cy.Stylesheet) => {
        const style = this.isCssStylesheet(stylesheet) ? stylesheet.css : stylesheet.style;
        return {
          selector: this.compileStyleSelector(stylesheet.selector),
          style: this.compileHandlebarsForStyleValues(style),
        };
      }
    );
  }

  /**
   *
   * a) to match on the resource IRI:
   *    node[resource = iri(<http://example.com>)]
   * b) to match on the resource Literal:
   *    node[resource = literal(Alice)]
   *    node[resource = literal(2, iri(<http://www.w3.org/2001/XMLSchema#integer>))]
   * c) to match on the outgoing edge of the RDF resource:
   *    node[proprety(<http://example.com/property>) *= iri(<http://example.com>)]
   */
  private compileStyleSelector(selector: string): string {
    const cytoscapeSelector = selector
      .replace(/property\(<(.*?)>\)/g, (_, iri) => this.escapeJsRegexChars(`-><${iri}>`))
      .replace(
          /literal\((.*?),\s*iri\(<(.*?)>\)\)/g,
        (_, literal, iri) => `'"${literal}"^^<${iri}>'`
      )
      .replace(/iri\(<(.*?)>\)/g, (_, iri) => `'<${iri}>'`)
      .replace(
          /literal\((.*?)\)/g,
        (_, literal) => `'"${literal}"^^${vocabularies.xsd._string}'`
      );
    return cytoscapeSelector;
  }

  private compileHandlebarsForStyleValues(style: Cy.Css.ElementCss): Cy.Css.ElementCss {
    return _.mapValues(
      style, value => {
        if (this.HANDLEBARS_REGEX.test(value)) {
          return Graph.styleTemplateFunction(
            TemplateScope.default.compileWithoutRemote(value), value
          );
        } else {
          return value;
        }
      }
    );
  }

  private isCssStylesheet(stylesheet: Cy.Stylesheet): stylesheet is Cy.CssStylesheet {
    return _.has(stylesheet, 'css');
  }

  /**
   * Cytoscape stylesheets meta-characters to escape.
   *
   * @see http://js.cytoscape.org/#selectors/notes-amp-caveats
   * @see https://github.com/cytoscape/cytoscape.js/blob/master/src/selector.js#L81
   */
  private static STYLE_METACHARS =
    '[\\!\\"\\#\\$\\%\\&\\\'\\(\\)\\*\\+\\,\\.\\/\\:\\;\\<\\=\\>\\?\\@\\[\\]\\^\\`\\{\\|\\}\\~]';

  private static STYLE_METACHARS_REGEX =
    new RegExp( '(' + Graph.STYLE_METACHARS + ')', 'g' );

  /**
   * Escape Cytoscape style meta-characters.
   */
  private escapeJsRegexChars(str: string): string {
    return str.replace(Graph.STYLE_METACHARS_REGEX, '\\$&');
  }
}

export type component = Graph;
export const component = Graph;
export const factory = createFactory(component);
export default component;
