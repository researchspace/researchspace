/*
 * Copyright (C) 2015-2017, © Trustees of the British Museum
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

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */

import * as React from 'react';
import * as ReactSelect from 'react-select';
import * as _ from 'lodash';
import * as Maybe from 'data.maybe';
import { FormGroup, ControlLabel } from 'react-bootstrap';

import { Rdf } from 'platform/api/rdf';
import { TemplateItem } from 'platform/components/ui/template';

import { RESULT_VARIABLES } from 'platform/components/semantic/search/config/SearchConfig';
import {
  ResultContext, ResultContextTypes,
} from 'platform/components/semantic/search/web-components/SemanticSearchApi';
import SearchProfileStore from 'platform/components/semantic/search/data/profiles/SearchProfileStore';
import * as Model from 'platform/components/semantic/search/data/search/Model';
import * as styles from './SemanticSearchContextualizedResult.scss';

interface Props extends React.Props<SemanticSearchContextualizedResult> {
  ranges: string [];
  tupleTemplate?: string;
}

interface State {
  relation?: Data.Maybe<Model.Relation>
  relations?: Array<Model.Relation>
}

/**
 * Propagates `__contextRelation__` SPARQL variable to search result query.
 * In case of virtual FRs one cane use `FILTER(?__contextRelationPattern__)` placeholder that
 * will be replaced with the corresponding FR pattern.
 */
class SemanticSearchContextualizedResult extends React.Component<Props, State> {
  static contextTypes = ResultContextTypes;
  static childContextTypes = ResultContextTypes;
  context: ResultContext;

  static defaultProps = {
    tupleTemplate:
      `
        <span title="{{label}}" style="display: flex; align-items: center; height: 40px;">
          {{label}}
          {{#ifCond hasRange.thumbnail.length '>' 0}}
          <img style="margin-left: auto; width: 30px; margin-right: 10px"
               src="{{hasRange.thumbnail}}"/>
          {{else}}
            <span style="margin-left: 10px">  [{{hasRange.label}}]</span>
          {{/ifCond}}
        </span>
    `,
  };

  constructor(props: Props, context: ResultContext) {
    super(props, context);
    const initialState =
      context.searchProfileStore.map(
        profileStore => this.initialState(profileStore, props.ranges.map(Rdf.iri))
      ).getOrElse({
        relation: Maybe.Nothing<Model.Relation>(),
        relations: [],
      });

    this.state = initialState;
  }

  getChildContext() {
    return _.assign({}, this.context, {
      bindings: this.getBindings(),
    });
  }

  private getBindings = () => {
    return this.state.relation.map(
      relation => ({[RESULT_VARIABLES.CONTEXT_RELATION_VAR]: relation.iri})
    ).getOrElse({} as any);
  }

  render() {
    return <div className={styles.holder}>
      <FormGroup className={styles.selectorGroup}>
        <ControlLabel>Visualization Context</ControlLabel>
        {this.context.searchProfileStore.map(this.contextSelector).getOrElse(<span />)}
      </FormGroup>
      {React.Children.only(this.props.children)}
    </div>;
  }

  private initialState = (
    profileStore: SearchProfileStore, ranges: Array<Rdf.Iri>
  ): State => {
    const relations =
      _.uniq(
        _.flatten(
          ranges.map(range => this.getAvailableRelations(profileStore, range))
        )
      );
    return {
      relations: relations,
      relation: _.isEmpty(relations) ? Maybe.Nothing<Model.Relation>() : Maybe.Just(_.head(relations)),
    };
  }

  private getAvailableRelations = (
    profileStore: SearchProfileStore, range: Rdf.Iri
  ): Array<Model.Relation> => {
    const rangeCategory = Maybe.fromNullable(
      profileStore.categories.get(range)
    );
    return profileStore.relationsFor({
      domain: this.context.domain,
      range: rangeCategory,
    }).valueSeq().toJS();
  }

  private contextSelector = (profileStore: SearchProfileStore) => {
    const relationsOptions =
      _.map(this.state.relations, relation => ({value: relation, label: relation.label}));
    return <ReactSelect
      className={styles.contextSelector}
      options={relationsOptions}
      clearable={false}
      value={this.state.relation.getOrElse(undefined)}
      optionRenderer={this.customSuggestionRenderer(this.props.tupleTemplate)}
      valueRenderer={this.customValueRenderer(this.props.tupleTemplate)}
      onChange={this.selectRelation}
      placeholder='Select Context'
    />;
  }

  private selectRelation = (option: {value: Model.Relation}) =>
    this.setState({relation: Maybe.Just(option.value)});

  private customValueRenderer = (template: string) => (option: any) => {
    return React.createElement(TemplateItem, {
      template: {
        source: template,
        options: option,
      },
    });
  }

  private customSuggestionRenderer = (template: string) => (option: any) => {
    return React.createElement(TemplateItem, {
      template: {
        source: template,
        options: option.value,
      },
    });
  }
}

export default SemanticSearchContextualizedResult;
