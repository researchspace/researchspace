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

import * as React from 'react';
import { Component, ReactElement, createFactory } from 'react';
import * as classNames from 'classnames';
import { List } from 'immutable';

import {
  Ast,
  FacetRelationConjunct,
  FacetRelationDisjunct,
} from 'platform/components/semantic/search/data/facet/Model';
import {
  ResourceDisjunct,
  DateRangeDisjunct,
  NumericRangeDisjunct,
  EntityDisjunctKinds,
  TemporalDisjunctKinds,
  NumericRangeDisjunctKind,
  LiteralDisjunctKind,
  LiteralDisjunct,
} from 'platform/components/semantic/search/data/search/Model';
import { Category, Relation } from 'platform/components/semantic/search/data/profiles/Model';
import { DateConverter, NumericConverter } from '../slider/FacetSlider';

import * as styles from './FacetBreadcrumbs.scss';

export interface FacetBreadcrumbsProps {
  ast: Ast;
  actions: {
    selectCategory: (category: Category) => void;
    selectRelation: (relation: Relation) => void;
    removeConjunct: (relation: FacetRelationConjunct) => void;
  };
}

export class FacetBreadcrumbsComponent extends Component<FacetBreadcrumbsProps, {}> {
  render() {
    const { conjuncts } = this.props.ast;

    if (conjuncts.length === 0) {
      return null;
    }

    return (
      <div className={styles.breadcrumbs}>
        <div className={styles.container}>{conjuncts.map(this.breadcrumb)}</div>
      </div>
    );
  }

  private breadcrumb = (conjunct: FacetRelationConjunct) => {
    const disjuncts = List(
      conjunct.disjuncts.map((disjunct) => {
        const elem = this.disjunct(disjunct);
        return List.of(elem, <span className={styles.or}>or</span>);
      })
    )
      .flatten()
      .butLast();
    const { relation } = conjunct;

    return (
      <div className={styles.conjunct}>
        <div className={classNames(styles.values, 'btn')} onClick={() => this.selectRelation(relation)}>
          <span className={styles.relation}>{relation.label}</span>
          {disjuncts}
        </div>
        <button
          className={classNames(styles.cancelButton, 'btn')}
          onClick={() => this.props.actions.removeConjunct(conjunct)}
        >
          <i />
        </button>
      </div>
    );
  };

  private selectRelation = (relation: Relation) => {
    const { selectCategory, selectRelation } = this.props.actions;
    selectCategory(relation.hasRange);
    selectRelation(relation);
  };

  private disjunct = (disjunct: FacetRelationDisjunct): ReactElement<any> => {
    let value: string | ReactElement<any> = 'unknown facet term';

    if (disjunct.kind === EntityDisjunctKinds.Resource) {
      value = this.resourceDisjunctValue(disjunct as ResourceDisjunct);
    } else if (disjunct.kind === TemporalDisjunctKinds.DateRange) {
      value = this.dateRangeDisjunctValue(disjunct as DateRangeDisjunct);
    } else if (disjunct.kind === NumericRangeDisjunctKind) {
      value = this.numericRangeDisjunctValue(disjunct as NumericRangeDisjunct);
    } else if (disjunct.kind === LiteralDisjunctKind) {
      value = this.literalDisjunctValue(disjunct as LiteralDisjunct);
    }

    return <span className={styles.disjunct}>{value}</span>;
  };

  private resourceDisjunctValue(disjunct: ResourceDisjunct) {
    return disjunct.value.label;
  }

  private dateRangeDisjunctValue(disjunct: DateRangeDisjunct) {
    const { toStringFn } = new DateConverter();
    const begin = toStringFn(disjunct.value.begin.year());
    const end = toStringFn(disjunct.value.end.year());

    return (
      <span>
        {begin}
        <span className={styles.or}>to</span>
        {end}
      </span>
    );
  }

  private numericRangeDisjunctValue(disjunct: NumericRangeDisjunct) {
    const { toStringFn } = new NumericConverter();
    const begin = toStringFn(disjunct.value.begin);
    const end = toStringFn(disjunct.value.end);

    return (
      <span>
        {begin}
        <span className={styles.or}>to</span>
        {end}
      </span>
    );
  }

  private literalDisjunctValue(disjunct: LiteralDisjunct) {
    return disjunct.value.literal.value;
  }
}

export const FacetBreadcrumbs = createFactory(FacetBreadcrumbsComponent);
export default FacetBreadcrumbs;
