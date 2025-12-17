/**
 * ResearchSpace
 * Copyright (C) 2024, © Kartography Community Interest Company
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

import * as Kefir from 'kefir';
import * as moment from 'moment';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient, QueryContext } from 'platform/api/sparql';
import * as LabelsService from 'platform/api/services/resource-label';

import {
  PresetFacetValueConfig,
  SemanticSearchConfig,
  PresetFacetValue,
} from 'platform/components/semantic/search/config/SearchConfig';
import * as Model from 'platform/components/semantic/search/data/search/Model';
import * as FacetModel from 'platform/components/semantic/search/data/facet/Model';
import { tryGetRelationPatterns } from 'platform/components/semantic/search/data/search/SparqlQueryGenerator';

type ValidatedResourcePreset = {
  kind: typeof Model.EntityDisjunctKinds.Resource;
  relation: Model.Relation;
  value: Rdf.Iri;
  label?: string;
};

type ValidatedLiteralPreset = {
  kind: typeof Model.LiteralDisjunctKind;
  relation: Model.Relation;
  value: Rdf.Literal;
};

type ValidatedDateRangePreset = {
  kind: typeof Model.TemporalDisjunctKinds.DateRange;
  relation: Model.Relation;
  begin: moment.Moment;
  end: moment.Moment;
};

type ValidatedNumericRangePreset = {
  kind: typeof Model.NumericRangeDisjunctKind;
  relation: Model.Relation;
  begin: number;
  end: number;
};

type ValidatedPreset =
  | ValidatedResourcePreset
  | ValidatedLiteralPreset
  | ValidatedDateRangePreset
  | ValidatedNumericRangePreset;

// ============================================================================
// Helpers
// ============================================================================

function parseIri(iri: string): Rdf.Iri {
  return iri.startsWith('<') && iri.endsWith('>') ? Rdf.fullIri(iri) : Rdf.iri(iri);
}

function inferDisjunctKind(
  config: SemanticSearchConfig,
  relation: Model.Relation
): FacetModel.FacetRelationDisjunct['kind'] {
  const relationPatterns = tryGetRelationPatterns(config, relation).filter((p) =>
    _.some(['resource', 'hierarchy', 'literal', 'date-range', 'numeric-range'], (kind) => kind === p.kind)
  );

  const patternConfig = relationPatterns.length >= 1 ? relationPatterns[0] : undefined;
  const kind = patternConfig?.kind || 'resource';

  switch (kind) {
    case 'resource':
    case 'hierarchy':
      return Model.EntityDisjunctKinds.Resource;
    case 'literal':
      return Model.LiteralDisjunctKind;
    case 'date-range':
      return Model.TemporalDisjunctKinds.DateRange;
    case 'numeric-range':
      return Model.NumericRangeDisjunctKind;
    default:
      return Model.EntityDisjunctKinds.Resource;
  }
}

// ============================================================================
// Parsing & Validation
// ============================================================================

function parseResourceValue(value: PresetFacetValue): Rdf.Iri | undefined {
  let valueStr: string | undefined;
  if (typeof value === 'string') {
    valueStr = value;
  } else if (typeof value === 'object' && 'value' in value && typeof value.value === 'string') {
    valueStr = value.value;
  }

  return valueStr ? parseIri(valueStr) : undefined;
}

function parseLiteralValue(value: PresetFacetValue): Rdf.Literal | undefined {
  if (typeof value === 'string') {
    return Rdf.literal(value);
  } else if (typeof value === 'object' && 'value' in value && typeof value.value === 'string') {
    return value.language
      ? Rdf.langLiteral(value.value, value.language)
      : Rdf.literal(value.value, value.datatype ? parseIri(value.datatype) : undefined);
  } else if (typeof value === 'number') {
    return Rdf.literal(value.toString());
  }
  return undefined;
}

function parseDateRangeValue(
  value: PresetFacetValue
): { begin: moment.Moment; end: moment.Moment } | undefined {
  if (typeof value === 'object' && 'begin' in value && 'end' in value) {
    const begin = moment(value.begin);
    const end = moment(value.end);
    if (begin.isValid() && end.isValid()) {
      return { begin, end };
    }
  }
  return undefined;
}

function parseNumericRangeValue(
  value: PresetFacetValue
): { begin: number; end: number } | undefined {
  if (typeof value === 'object' && 'begin' in value && 'end' in value) {
    const begin = typeof value.begin === 'number' ? value.begin : parseFloat(value.begin);
    const end = typeof value.end === 'number' ? value.end : parseFloat(value.end);
    if (_.isFinite(begin) && _.isFinite(end)) {
      return { begin, end };
    }
  }
  return undefined;
}

function resolveItem(
  item: PresetFacetValue | { value: PresetFacetValue; label?: string }
): { value: PresetFacetValue; label?: string } {
  if (typeof item === 'object' && item !== null && 'label' in item) {
    return { value: (item as any).value, label: (item as any).label };
  }
  return { value: item as PresetFacetValue, label: undefined };
}

type ValidatedGroup = {
  relation: Model.Relation;
  presets: ValidatedPreset[];
};

function validateAndParsePresets(
  presets: ReadonlyArray<PresetFacetValueConfig>,
  relations: Model.Relations,
  config: SemanticSearchConfig
): ValidatedGroup[] {
  const result: ValidatedGroup[] = [];

  for (const preset of presets) {
    const relationIri = parseIri(preset.relation);
    const relation = relations.find((rel) => rel.iri.equals(relationIri));

    if (!relation) {
      throw new Error(`Preset facet relation '${preset.relation}' not found in search profile.`);
    }

    const kind = inferDisjunctKind(config, relation);
    const groupPresets: ValidatedPreset[] = [];

    for (const item of preset.values) {
      const { value, label } = resolveItem(item);

      if (kind === Model.EntityDisjunctKinds.Resource) {
        const parsed = parseResourceValue(value);
        if (!parsed) {
          throw new Error(
            `Invalid value '${JSON.stringify(value)}' for resource relation '${preset.relation}'. Expected IRI string or object with 'value' property.`
          );
        }
        groupPresets.push({
          kind,
          relation,
          value: parsed,
          label: label,
        });
      } else if (kind === Model.LiteralDisjunctKind) {
        const parsed = parseLiteralValue(value);
        if (!parsed) {
          throw new Error(
            `Invalid value '${JSON.stringify(value)}' for literal relation '${preset.relation}'. Expected string, number, or object with 'value' property.`
          );
        }
        groupPresets.push({
          kind,
          relation,
          value: parsed,
        });
      } else if (kind === Model.TemporalDisjunctKinds.DateRange) {
        const parsed = parseDateRangeValue(value);
        if (!parsed) {
          throw new Error(
            `Invalid value '${JSON.stringify(value)}' for date-range relation '${preset.relation}'. Expected object with 'begin' and 'end' properties.`
          );
        }
        groupPresets.push({
          kind,
          relation,
          ...parsed,
        });
      } else if (kind === Model.NumericRangeDisjunctKind) {
        const parsed = parseNumericRangeValue(value);
        if (!parsed) {
          throw new Error(
            `Invalid value '${JSON.stringify(value)}' for numeric-range relation '${preset.relation}'. Expected object with numeric 'begin' and 'end' properties.`
          );
        }
        groupPresets.push({
          kind,
          relation,
          ...parsed,
        });
      }
    }
    if (groupPresets.length > 0) {
      result.push({
        relation,
        presets: groupPresets,
      });
    }
  }

  return result;
}

function collectRequiredLabels(validatedGroups: ValidatedGroup[]): Rdf.Iri[] {
  return _.flatMap(validatedGroups, (group) =>
    group.presets
      .filter(
        (p): p is ValidatedResourcePreset =>
          p.kind === Model.EntityDisjunctKinds.Resource && !p.label
      )
      .map((p) => p.value)
  );
}

// ============================================================================
// AST Construction
// ============================================================================

function createDisjunct(
  preset: ValidatedPreset,
  disjunctIndex: Model.DisjunctIndex,
  labelMap?: Map<Rdf.Iri, string>
): FacetModel.FacetRelationDisjunct {
  switch (preset.kind) {
    case Model.EntityDisjunctKinds.Resource: {
      const resolvedLabel =
        preset.label ||
        (labelMap ? labelMap.get(preset.value) : undefined) ||
        preset.value.value;

      const tuple: SparqlClient.Binding = {
        value: preset.value,
        label: Rdf.literal(resolvedLabel),
      };

      return {
        kind: Model.EntityDisjunctKinds.Resource,
        disjunctIndex,
        value: {
          iri: preset.value,
          label: resolvedLabel,
          tuple,
        },
      };
    }
    case Model.LiteralDisjunctKind: {
      return {
        kind: Model.LiteralDisjunctKind,
        disjunctIndex,
        value: { literal: preset.value },
      };
    }
    case Model.TemporalDisjunctKinds.DateRange: {
      return {
        kind: Model.TemporalDisjunctKinds.DateRange,
        disjunctIndex,
        value: { begin: preset.begin, end: preset.end },
      };
    }
    case Model.NumericRangeDisjunctKind: {
      return {
        kind: Model.NumericRangeDisjunctKind,
        disjunctIndex,
        value: { begin: preset.begin, end: preset.end },
      };
    }
  }
}

function buildAst(
  validatedGroups: ValidatedGroup[],
  labelMap?: any
): FacetModel.Ast | undefined {
  if (validatedGroups.length === 0) {
    return undefined;
  }

  const conjuncts: FacetModel.Conjuncts = [];

  for (let i = 0; i < validatedGroups.length; i++) {
    const { relation, presets } = validatedGroups[i];
    const conjunctIndex = [i];
    const disjuncts: FacetModel.FacetRelationDisjunct[] = [];

    for (let j = 0; j < presets.length; j++) {
      const disjunctIndex = [i, j];
      disjuncts.push(createDisjunct(presets[j], disjunctIndex, labelMap));
    }

    if (disjuncts.length > 0) {
      conjuncts.push({
        kind: Model.ConjunctKinds.Relation,
        conjunctIndex,
        relation,
        range: relation.hasRange,
        disjuncts,
      });
    }
  }

  if (conjuncts.length === 0) {
    return undefined;
  }

  return { conjuncts };
}

/**
 * Builds a facet AST from preset configurations with async label resolution.
 * 
 * For resource presets without explicit labels, labels are fetched from the
 * label service.
 */
export function buildPresetFacetAstWithLabels(
  presets: ReadonlyArray<PresetFacetValueConfig>,
  relations: Model.Relations | undefined,
  config: SemanticSearchConfig,
  queryContext?: QueryContext
): Kefir.Property<FacetModel.Ast | undefined> {
  if (!presets || presets.length === 0 || !relations) {
    return Kefir.constant(undefined);
  }

  const validatedPresets = validateAndParsePresets(presets, relations, config);
  const requiredLabels = collectRequiredLabels(validatedPresets);

  if (requiredLabels.length === 0 || !queryContext) {
    const ast = buildAst(validatedPresets);
    return Kefir.constant(ast);
  }

  return LabelsService.getLabels(requiredLabels, { context: queryContext })
    .map((labelMap) => buildAst(validatedPresets, labelMap));
}
