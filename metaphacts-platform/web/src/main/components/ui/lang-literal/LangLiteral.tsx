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

import * as React from 'react';
import * as maybe from 'data.maybe';
import * as _ from 'lodash';
import * as SparqlJs from 'sparqljs';

import { Component, ComponentContext } from 'platform/api/components';
import { getPreferredUserLanguage } from 'platform/api/services/language';
import { Cancellation } from 'platform/api/async';
import { TemplateItem } from 'platform/components/ui/template';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { Rdf } from 'platform/api/rdf';
import { Spinner } from 'platform/components/ui/spinner';
import { getCurrentResource } from 'platform/api/navigation';

interface LiteralProps {
  subject?: string
  path?: string;
  property: string;
  template?: string;
  noResultTemplate?: string;
  /**
   * Additional class names for component root element
   */
  className?: string;
  /**
   * Additional styles for label element
   */
  style?: React.CSSProperties;
}

interface State {
  isLoading?: boolean;
  isNoResult?: boolean;
  readonly data?: Data.Maybe<R>;
}

const VALUE_VARIABLE = 'value';
const NODE_VARIABLE = 'node';
const PREF_LANG_VARIABLE = 'preferredLanguage';

interface T {
  preferredLanguage: Rdf.Node;
  others: Rdf.Node[]
}

interface R {
  results: T[]
}

export class LangLiteral extends Component<LiteralProps, State> {
  private cancellation = new Cancellation();

  constructor(props: LiteralProps, context: ComponentContext) {
    super(props, context);
    this.state = {
      isLoading: true,
      isNoResult: false,
      data: maybe.Nothing<R>(),
    };
  }

  componentDidMount() {
    const query = this.prepareQuery();

    const queryParsed = SparqlClient.setBindings(
      SparqlUtil.parseQuerySync(query) as SparqlJs.SelectQuery,
      {'__subject__': this.props.subject ? Rdf.iri(this.props.subject) : getCurrentResource()}
    );

    this.cancellation.derive().map(
      SparqlClient.select(queryParsed, {context: this.context.semanticContext}).onValue(
        res => {
          if (SparqlUtil.isSelectResultEmpty(res)) {
            this.setState({isLoading: false, isNoResult: true});
            return;
          }
          const f = {};
          _.forEach(res.results.bindings, binding => {
            const node = binding[NODE_VARIABLE].value;
            if (!f[node]) {
              f[node] = {};
              f[node].others = [];
            }
            if (!_.includes(f[node].others, binding[VALUE_VARIABLE])) {
              f[node].others.push(binding[VALUE_VARIABLE]);
            }
            if (binding[VALUE_VARIABLE].equals(binding[PREF_LANG_VARIABLE])) {
              _.remove(f[node].others, binding[PREF_LANG_VARIABLE]);
            }

            if (binding[PREF_LANG_VARIABLE]) {
              f[node].preferredLanguage = binding[PREF_LANG_VARIABLE];
            }
          });

          const data = {
            results: _.values<T>(f)
          };

          this.setState({data: maybe.Just(data), isLoading: false, isNoResult: false});
        },
      ),
    );
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  private prepareQuery() {
    const {path, property} = this.props;

    if (!property) {
      throw new Error('At least attribute \'property\' must be specified');
    }

    const preferredLang = getPreferredUserLanguage();
    const filter = `FILTER(LANGMATCHES(LANG(?${VALUE_VARIABLE}),'${preferredLang}'))`;
    const prefLangPart = `OPTIONAL{
                    ?${NODE_VARIABLE} <${property}> ?${VALUE_VARIABLE} .
                    ${filter}
                    BIND(?${VALUE_VARIABLE} as ?${PREF_LANG_VARIABLE})
                }`;

    if (path) {
      return `SELECT DISTINCT
                ?${NODE_VARIABLE} ?${VALUE_VARIABLE} ?${PREF_LANG_VARIABLE}
            WHERE{
                ?__subject__ ${path} ?${NODE_VARIABLE} .
                ?${NODE_VARIABLE} <${property}> ?${VALUE_VARIABLE} .
                ${prefLangPart}
            }`;
    }

    return `SELECT DISTINCT
                ?${NODE_VARIABLE} ?${VALUE_VARIABLE} ?${PREF_LANG_VARIABLE}
            WHERE{
                ?__subject__ <${property}> ?${VALUE_VARIABLE} .
                BIND( ?__subject__ as ?${NODE_VARIABLE} )
                ${prefLangPart}
            }`;
  }

  private getTemplateString(template: string): string {
    if (template) { return template; }

    const prefLang = getPreferredUserLanguage();

    const label = `<mp-label iri="${this.props.property}"></mp-label>`;
    const others = `
      <mp-popover title="Other languages">
        <mp-popover-trigger placement="right" trigger='["hover","click","focus"]'>
          <i class="fa fa-language hidden-print" style="margin-left: 10px;" aria-hidden="true"></i>
        </mp-popover-trigger>
        <mp-popover-content style="background: white;">
          {{#each others}}
            <div>{{value}} {{#if lang}}({{lang}}){{/if}}</div><hr>
          {{/each}}
        </mp-popover-content>
      </mp-popover>
    `;

    return `
    <div>
      {{#each results}}
        {{#if preferredLanguage}}
          {{preferredLanguage.value}}
          {{#if preferredLanguage.lang}}
            ({{preferredLanguage.lang}})
          {{/if}}
        {{else}}
          Property ${label} is not available in your preferred language (${prefLang})
        {{/if}}
        {{#if others.length}}
          ${others}
        {{/if}}
        <br>
      {{/each}}
    </div>
    `;
  }

  private renderResult = (templateString?: string) => (options: R) => {
    const {style, className} = this.props;
    const source = this.getTemplateString(templateString);
    return <TemplateItem template={{source, options}} componentProps={{style, className}} />;
  }

  render() {
    const {template, noResultTemplate} = this.props;
    const {data, isLoading, isNoResult} = this.state;

    if (isNoResult) {
      return <TemplateItem template={{source: noResultTemplate}} />;
    }

    if (isLoading) {
      return <Spinner />;
    }

    return <div>{data.map(this.renderResult(template)).getOrElse(null)}</div>;
  }

}

export default LangLiteral;
