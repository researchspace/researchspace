/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */

import { Component, ReactElement } from 'react';
import * as D from 'react-dom-factories';
import * as _ from 'lodash';
import * as nlp from 'nlp_compromise';
import * as classNames from 'classnames';

import * as Model from 'platform/components/semantic/search/data/search/Model';
import { disjunctToString } from 'platform/components/semantic/search/data/search/ModelUtils';
import * as styles from './SearchSummary.scss';

interface Props {
  search: Model.Search;
}

interface ChunkText {
  className: string;
  text: string;
}

interface DisjunctText extends ChunkText {}

interface ConjunctText {
  chunks: Array<ChunkText>;
  disjuncts: Array<DisjunctText>;
}

/**
 * Human readable, search query representation component.
 */
export class SearchSummary extends Component<Props, {}> {
  private static VOCABULARY = {
    EMPTY: 'What do you want to find?',
    SUMMARY_PREFIX: 'Find:',
    UNKNOWN_CLAUSE: 'unknow search clause type',
    RELATION_PLACEHOLDER: '... related to ...',
    PLACEHOLDER: '...',
  };

  render() {
    return D.div(
      { className: 'search-summary' },
      D.span(
        { className: styles.start },
        this.props.search ? SearchSummary.VOCABULARY.SUMMARY_PREFIX : SearchSummary.VOCABULARY.EMPTY
      ),
      this.props.search ? this.htmlSummary(this.props.search) : null
    );
  }

  /**
   * Converts search AST into human readable query representation.
   * E.g. 'Find Actors has met The Portland Vase Disc' etc.
   */
  public static summaryToString(search): string {
    const textAst = new SearchSummary(null).searchSummary(search);
    return _(textAst)
      .map((statement) => [statement.text, ' '])
      .flatten()
      .dropRight(1)
      .reduce((acc, x) => acc + x, '');
  }

  private htmlSummary(search: Model.Search): Array<ReactElement<any>> {
    return this.searchSummary(search).map((statement) =>
      D.span({ className: classNames(styles.word, statement.className) }, statement.text)
    );
  }

  private searchSummary(search: Model.Search): Array<ChunkText> {
    return this.searchText(search);
  }

  private searchText(search: Model.Search): Array<ChunkText> {
    return [this.domainText(search.domain)].concat(this.clausesText(search.conjuncts));
  }

  private domainText = (domain: Model.Category): ChunkText => {
    const domainText = nlp.noun(domain.label).pluralize();
    return {
      className: styles.domain,
      text: domainText,
    };
  };

  private clausesText = (clauses: Model.Conjuncts): Array<ChunkText> => {
    return _.dropRight(_(clauses).map(this.clauseText).reduce(this.reduceClauses, []), 1);
  };

  private reduceClauses = (list: Array<ChunkText>, clause: ConjunctText): Array<ChunkText> => {
    const disjuncts = _(clause.disjuncts)
      .map((term) => [term, this.orSeparator()])
      .flatten<ChunkText>()
      .dropRight(1)
      .value();
    return list.concat(clause.chunks, disjuncts, [this.andSeparator()]);
  };

  private clauseText = (clause: Model.Conjunct): ConjunctText => {
    return Model.matchConjunct({
      Relation: this.relationConjunctText,
      Text: this.textConjunctText,
    })(clause);
  };

  private textConjunctText = (conjunct: Model.Conjunct): ConjunctText => ({
    chunks: [],
    disjuncts: this.disjunctsText(conjunct.disjuncts),
  });

  private relationConjunctText = (conjunct: Model.RelationConjunct): ConjunctText => {
    const relationText = conjunct.relation.label;
    return {
      chunks: [
        {
          className: styles.relation,
          text: relationText,
        },
      ],
      disjuncts: this.disjunctsText(conjunct.disjuncts),
    };
  };

  private disjunctsText = (disjunct: Model.Disjuncts): Array<DisjunctText> => _.map(disjunct, this.disjunctText);

  private disjunctText = (disjunct: Model.Disjunct): DisjunctText => {
    if (disjunct.kind === Model.EntityDisjunctKinds.Search) {
      return {
        className: styles[disjunct.kind],
        text: disjunct.value.domain.label + ' where ' + SearchSummary.summaryToString(disjunct.value),
      };
    } else {
      return {
        className: styles[disjunct.kind],
        text: disjunctToString(disjunct),
      };
    }
  };

  private orSeparator = (): ChunkText => ({
    className: styles.separator,
    text: 'or',
  });

  private andSeparator = (): ChunkText => ({
    className: styles.separator,
    text: 'and',
  });
}
export default SearchSummary;
