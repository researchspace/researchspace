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

import { ReactElement, Props, createElement } from 'react';
import * as maybe from 'data.maybe';
import * as _ from 'lodash';

import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Component, ComponentProps, ComponentContext } from 'platform/api/components';
import { ErrorNotification } from 'platform/components/ui/notification';

import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';

export interface SemanticQueryConfig {
  /**
   * SPARQL SELECT query string.
   */
  query: string;

  /**
   * <semantic-link uri='http://help.researchspace.org/resource/FrontendTemplating'>Template</semantic-link>, that gets a <a target='_blank' href='https://www.w3.org/TR/sparql11-results-json/#select-results'>bindings</a> object injected as template context i.e. the result binding to iterate over. [each helper](http://handlebarsjs.com/builtin_helpers.html#iteration) can be used to iterate over the bindings.
   * The template will only be rendered if and only if the result is not empty, so that one does not need to have additional if expressions around the component in order to hide it, for example, a list header if actually no result are to be displayed.
   * **Example:** `My Result: {{#each bindings}}{{bindingName.value}}{{/each}}` .
   * **Default:** If no template is provided, all tuples for the first projection variable will we rendered as a comma-separated list.
   */
  template?: string;

  /**
   * <semantic-link uri='http://help.researchspace.org/resource/FrontendTemplating'>Template</semantic-link> which is applied when query returns no results.
   */
  noResultTemplate?: string;

  /**
   * CSS classes for component holder element.
   */
  className?: string;

  /**
   * CSS styles for component holder element.
   */
  style?: string;
}

export type SemanticQueryProps = SemanticQueryConfig & Props<SemanticQuery> & ComponentProps;

interface SemanticQueryState {
  result?: Data.Maybe<SparqlClient.SparqlSelectResult>;
  isLoading?: boolean;
  error?: any;
}

/**
 * Component to render SPARQL Select results in a fully customizable way
 * using handlebars.js templates.
 *
 * 'data-query' specifies the plain SPARQL Select query string.
 *
 * 'data-template' specifies the handlebars template string. The template will
 * need to iterate over the bindings using each helper to access individual RDF nodes:
 * {{#each}}
 * 	{{binding1.value}} {{binding1.value}}
 * {{/each}}
 * If no template is provided, a default template will be used to iterate over the bindings,
 * rendering the first binding node as semantic-link (if IRI) or plain text value.
 *
 *
 * @example
 *  // with default template
 *  <semantic-query
 *   	data-query='
 *   		SELECT ?person ?name WHERE {}
 *   		VALUES(?person ?name){(foaf:Joe "Joe")(foaf:Mike "Mike")}
 *     '>
 *  </semantic-query>
 *
 * @example
 * 	// with custom template
 *  <semantic-query
 *   	data-query='
 *   		SELECT ?person ?name WHERE {}
 *   		VALUES(?person ?name){(foaf:Joe "Joe")(foaf:Mike "Mike")}
 *     '>
 *    	data-template='
 *    		<ul>
 *    			{{#each bindings}}
 *    				<li><semantic-link data-uri="{{person.value}}">{{name.value}}</semantic-link></li>
 *    		 	{{/each}}
 *    		</ul>
 *    	'>
 *  </semantic-query>
 */
export class SemanticQuery extends Component<SemanticQueryProps, SemanticQueryState> {
  context: ComponentContext;
  constructor(props: SemanticQueryConfig, context: ComponentContext) {
    super(props, context);
    this.state = {
      result: maybe.Nothing<SparqlClient.SparqlSelectResult>(),
      isLoading: true,
    };
  }

  public componentDidMount() {
    this.executeQuery(this.props, this.context);
  }

  public shouldComponentUpdate(nextProps: SemanticQueryProps, nextState: SemanticQueryState) {
    return nextState.isLoading !== this.state.isLoading || !_.isEqual(nextProps, this.props);
  }

  public componentWillReceiveProps(nextProps: SemanticQueryProps, context: ComponentContext) {
    if (nextProps.query !== this.props.query) {
      this.executeQuery(nextProps, context);
    }
  }

  public render() {
    if (this.state.isLoading) {
      return createElement(Spinner);
    } else if (this.state.error) {
      return createElement(ErrorNotification, { errorMessage: this.state.error });
    } else {
      return this.state.result.map(this.renderResult(this.props.template)).getOrElse(null);
    }
  }

  /**
   * Returns a ReactElement by compiling the (optional) handlebars.js templateString
   * (or using a defaultTemplate otherwise). The bindings from the SparqlSelectResult
   * will be passed into the template as context.
   */
  private renderResult = (templateString?: string) => (res: SparqlClient.SparqlSelectResult): ReactElement<any> => {
    if (SparqlUtil.isSelectResultEmpty(res)) {
      return createElement(TemplateItem, { template: { source: this.getNoResultTemplateString() } });
    }

    const firstBindingVar = res.head.vars[0];
    return createElement(TemplateItem, {
      template: {
        source: this.getTemplateString(templateString, firstBindingVar),
        options: res.results,
      },
      componentProps: {
        style: this.props.style,
        className: this.props.className,
      },
    });
  };

  /**
   * Returns a default handlbars.js template string to render the first binding
   * of a SPARQL Select result into a (default) list if no custom template
   * is specified by the user.
   *
   * @param res SparqlSelectResult to extract the first binding variable from
   * @returns {string}
   */
  private getTemplateString = (template: string, bindingVar: string): string => {
    if (template) {
      return template;
    }

    // try to get default "<template>" element with id template from the local scope
    const localScope = this.props.markupTemplateScope;
    const partial = localScope ? localScope.getPartial('template') : undefined;
    if (partial) {
      return partial.source;
    }

    return (
      '<div>{{#each bindings}}' +
      '{{#if (isIri ' +
      bindingVar +
      ')}}' +
      '<semantic-link uri="{{' +
      bindingVar +
      '.value}}"></semantic-link>' +
      '{{else}}' +
      '{{' +
      bindingVar +
      '.value}}' +
      '{{/if}}' +
      '{{#if @last}}{{else}},&nbsp;{{/if}}' +
      '{{/each}}</div>'
    );
  };

  private getNoResultTemplateString = (): string => {
    if (this.props.noResultTemplate) {
      return this.props.noResultTemplate;
    }

    // try to get default noResultTemplate "<template>" element with id template from the local scope
    const localScope = this.props.markupTemplateScope;
    const partial = localScope ? localScope.getPartial('noResultTemplate') : undefined;
    if (partial) {
      return partial.source;
    } else {
      return '';
    }
  }

  /**
   * Executes the SPARQL Select query and pushes results to state on value.
   */
  private executeQuery = (props: SemanticQueryProps, ctx: ComponentContext): void => {
    this.setState({ isLoading: true, error: undefined });
    const context = ctx.semanticContext;
    SparqlClient.select(props.query, { context })
      .onValue((result) =>
        this.setState({
          result: maybe.Just(result),
          isLoading: false,
        })
      )
      .onError((error) =>
        this.setState({
          error,
          isLoading: false,
        })
      );
  };
}
export default SemanticQuery;
