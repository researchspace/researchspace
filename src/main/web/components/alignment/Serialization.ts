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

import * as Immutable from 'immutable';
import * as Maybe from 'data.maybe';

import { Rdf, vocabularies } from 'platform/api/rdf';
const { rdfs, rdf } = vocabularies;
import { rso } from 'platform/data/vocabularies';

import { KeyedForest } from 'platform/components/semantic/lazy-tree';

import { AlignmentNode, AlignmentState, AlignmentMatch, AlignKind, AlignmentMetadata } from './AlignmentNodeModel';

export interface MatchEntry {
  kind: AlignKind.ExactMatch | AlignKind.NarrowerMatch;
  targetBase: AlignmentNode;
  targetAligned: AlignmentNode;
}

/**
 * Groups match entries by target key then source key, e.g.:
 * ```
 * targetKey -> sourceKey -> MatchEntry
 * ```
 */
export function groupMatches(
  forest: KeyedForest<AlignmentNode>
): Immutable.Map<string, Immutable.Map<string, MatchEntry>> {
  return Immutable.Map<string, Immutable.Map<string, MatchEntry>>().withMutations((matchesByTarget) => {
    forest.nodes.forEach((nodes, key) => {
      nodes.forEach((targetAligned) => {
        const kind = targetAligned.alignKind;
        if (targetAligned.aligned && (kind === AlignKind.ExactMatch || kind === AlignKind.NarrowerMatch)) {
          const targetBase = AlignmentNode.getMatchTarget(targetAligned, forest);
          const targetKey = targetBase.base.iri.value;
          matchesByTarget.update(targetKey, (matchesBySource) => {
            const existing = matchesBySource || Immutable.Map<string, MatchEntry>();
            const sourceKey = targetAligned.aligned.iri.value;
            if (existing.has(sourceKey)) {
              return existing;
            }
            return existing.set(sourceKey, { kind, targetAligned, targetBase });
          });
        }
      });
    });
  });
}

export function exportAlignment(forest: KeyedForest<AlignmentNode>, metadata: AlignmentMetadata): AlignmentState {
  const matches = groupMatches(forest)
    .map((values) =>
      values
        .map(
          ({ kind, targetAligned }): AlignmentMatch => ({
            kind,
            iri: targetAligned.aligned.iri,
            excluded: targetAligned.excludeFromAlignment,
          })
        )
        .toArray()
    )
    .toMap();
  return { matches, metadata };
}

export function serializeAlignment(state: AlignmentState): Rdf.Graph {
  const iri = state.metadata.iri.getOrElse(Rdf.BASE_IRI);
  const triples: Rdf.Triple[] = [];
  state.matches.forEach((matches, targetIri) => {
    const target = Rdf.iri(targetIri);
    for (const match of matches) {
      const matchPointer = Rdf.bnode();
      const matchPredicate = match.kind === AlignKind.ExactMatch ? rso.PX_exact_match : rso.PX_narrow_match;
      triples.push(Rdf.triple(match.iri, matchPredicate, matchPointer));
      triples.push(Rdf.triple(matchPointer, rso.PX_match_target, target));
      match.excluded.forEach((excludedChild) => {
        triples.push(Rdf.triple(matchPointer, rso.PX_match_excludes, Rdf.iri(excludedChild)));
      });
    }
  });
  triples.push(
    Rdf.triple(iri, rdf.type, rso.Alignment),
    Rdf.triple(iri, rdfs.label, Rdf.literal(state.metadata.label)),
    Rdf.triple(iri, rdfs.comment, Rdf.literal(state.metadata.description)),
    Rdf.triple(iri, rso.PX_source_terminology, state.metadata.source),
    Rdf.triple(iri, rso.PX_target_terminology, state.metadata.target)
  );
  return Rdf.graph(triples);
}

export function deserializeAlignment(graph: Rdf.Graph): AlignmentState {
  const allMatches = Immutable.Map<string, Array<AlignmentMatch>>().asMutable();
  const metadata: AlignmentMetadata = {} as any;

  graph.triples.forEach(({ s, p, o }) => {
    const isMatch = p.equals(rso.PX_exact_match) || p.equals(rso.PX_narrow_match);
    if (s.isIri() && isMatch) {
      const match = Rdf.pg(o, graph);
      const kind = p.equals(rso.PX_exact_match) ? AlignKind.ExactMatch : AlignKind.NarrowerMatch;
      const targets = Rdf.getValuesFromPropertyPath([rso.PX_match_target], match);
      if (targets.length !== 1) {
        console.warn(`Skipping alignment match source ${s} with multiple target nodes.`);
        return;
      }
      const excluded = Immutable.Set(
        Rdf.getValuesFromPropertyPath([rso.PX_match_excludes], match)
          .filter((node) => node.isIri())
          .map((node) => node.value)
      );
      allMatches.update(targets[0].value, (matches) => {
        const result = matches || [];
        result.push({ kind, iri: s, excluded });
        return result;
      });
    } else if (p.equals(rdfs.label) && s.isIri()) {
      metadata.iri = Maybe.Just(s);
      metadata.label = o.value;
    } else if (p.equals(rdfs.comment)) {
      metadata.description = o.value;
    } else if (p.equals(rso.PX_source_terminology) && o.isIri()) {
      metadata.source = o;
    } else if (p.equals(rso.PX_target_terminology) && o.isIri()) {
      metadata.target = o;
    }
  });

  return { matches: allMatches.asImmutable(), metadata };
}
