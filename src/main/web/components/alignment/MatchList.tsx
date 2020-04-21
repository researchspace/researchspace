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

import * as React from 'react';
import { ReactElement } from 'react';
import { Button } from 'react-bootstrap';
import * as _ from 'lodash';
import * as classnames from 'classnames';

import { Component } from 'platform/api/components';

import { Node } from 'platform/components/semantic/lazy-tree';

import { AlignmentNode, AlignKind } from './AlignmentNodeModel';
import { MatchEntry } from './Serialization';

import * as styles from './MatchList.scss';

export interface MatchListProps {
  className?: string;
  matches: Immutable.Map<string, Immutable.Map<string, MatchEntry>>;
  savedMatches: Immutable.Map<string, Immutable.Map<string, MatchEntry>>;
  onScrollToEntry: (entry: MatchEntry) => void;
}

export class MatchList extends Component<MatchListProps, {}> {
  render() {
    const { className, matches } = this.props;
    const entries = computeMatchEntries(matches);
    return (
      <ul className={classnames(styles.component, className)}>{entries.map((entry) => this.renderMatch(entry))}</ul>
    );
  }

  private renderMatch(entry: MatchEntry): ReactElement<any> {
    const targetBase = entry.targetBase;
    const sourceNode = entry.targetAligned.aligned || entry.targetAligned.base;
    const key = `<${AlignmentNode.keyOf(targetBase)}>${entry.kind}${sourceNode.iri.toString()}`;

    const relationSign = entry.kind === AlignKind.ExactMatch ? '=' : '≤';

    const hasBeenSaved = this.props.savedMatches.hasIn([
      entry.targetBase.base.iri.value,
      entry.targetAligned.aligned.iri.value,
    ]);
    return (
      <li key={key} className={styles.entry}>
        <span>{getLabel(sourceNode)}</span>
        <span> {relationSign} </span>
        <span>{getLabel(targetBase.base)}</span>
        {hasBeenSaved ? null : <span className={styles.unsaved}>unsaved</span>}
        <Button
          className={styles.scrollTo}
          bsSize="xs"
          title="Scroll to aligned terms"
          onClick={() => this.scrollToItem(entry)}
        >
          <span className="fa fa-arrow-right" aria-hidden="true"></span>
        </Button>
      </li>
    );
  }

  private scrollToItem(entry: MatchEntry) {
    this.props.onScrollToEntry(entry);
  }
}

const MATCH_COMPARATOR = [
  (entry: MatchEntry) => getLabel(entry.targetBase.base),
  (entry: MatchEntry) => entry.kind,
  (entry: MatchEntry) => getLabel(entry.targetAligned.aligned || entry.targetAligned.base),
];

function computeMatchEntries(grouped: Immutable.Map<string, Immutable.Map<string, MatchEntry>>): MatchEntry[] {
  const result: MatchEntry[] = [];
  grouped.forEach((group) =>
    group.forEach((entry) => {
      result.push(entry);
    })
  );
  return _.orderBy(result, MATCH_COMPARATOR);
}

function getLabel(node: Node) {
  return node.label ? node.label.value : node.iri.value;
}
