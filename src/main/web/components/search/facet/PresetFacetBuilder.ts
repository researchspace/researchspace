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
  SemanticFacetConfig,
  PresetFacetValueConfig,
  PresetLiteralFacetValue,
  PresetResourceFacetValue,
  PresetDateRangeFacetValue,
  PresetNumericRangeFacetValue,
} from 'platform/components/semantic/search/config/SearchConfig';
import * as Model from 'platform/components/semantic/search/data/search/Model';
import * as FacetModel from 'platform/components/semantic/search/data/facet/Model';

// ============================================================================
// Disjunct Creators
// ============================================================================

function parseIri(iri: string): Rdf.Iri {
  return iri.startsWith('<') && iri.endsWith('>') ? Rdf.fullIri(iri) : Rdf.iri(iri);
}

function createLiteralDisjunct(
  preset: PresetLiteralFacetValue,
  disjunctIndex: Model.DisjunctIndex
): FacetModel.FacetRelationDisjunct | undefined {
  if (!preset.value) {
    return undefined;
  }

  const literalNode = preset.language
    ? Rdf.langLiteral(preset.value, preset.language)
    : Rdf.literal(preset.value, preset.datatype ? parseIri(preset.datatype) : undefined);

  return {
    kind: Model.LiteralDisjunctKind,
    disjunctIndex,
    value: { literal: literalNode },
  };
}

function createDateRangeDisjunct(
  preset: PresetDateRangeFacetValue,
  disjunctIndex: Model.DisjunctIndex
): FacetModel.FacetRelationDisjunct | undefined {
  if (!preset.dateRange) {
    return undefined;
  }

  const begin = moment(preset.dateRange.begin);
  const end = moment(preset.dateRange.end);

  if (!begin.isValid() || !end.isValid()) {
    return undefined;
  }

  return {
    kind: Model.TemporalDisjunctKinds.DateRange,
    disjunctIndex,
    value: { begin, end },
  } as FacetModel.FacetRelationDisjunct;
}

function createNumericRangeDisjunct(
  preset: PresetNumericRangeFacetValue,
  disjunctIndex: Model.DisjunctIndex
): FacetModel.FacetRelationDisjunct | undefined {
  if (!preset.numericRange) {
    return undefined;
  }

  const { begin, end } = preset.numericRange;

  if (!_.isFinite(begin) || !_.isFinite(end)) {
    return undefined;
  }

  return {
    kind: Model.NumericRangeDisjunctKind,
    disjunctIndex,
    value: { begin, end },
  } as FacetModel.FacetRelationDisjunct;
}

function createResourceDisjunct(
  valueIri: Rdf.Iri,
  label: string,
  disjunctIndex: Model.DisjunctIndex
): FacetModel.FacetRelationDisjunct {
  const tuple: SparqlClient.Binding = {
    value: valueIri,
    label: Rdf.literal(label),
  };

  return {
    kind: Model.EntityDisjunctKinds.Resource,
    disjunctIndex,
    value: {
      iri: valueIri,
      label,
      tuple,
    },
  };
}

// ============================================================================
// AST Building
// ============================================================================

/**
 * Tracks a resource preset that needs its label fetched from the label service.
 */
interface ResourceNeedingLabel {
  conjunctIndex: number;
  disjunctIndex: number;
  iri: Rdf.Iri;
}

/**
 * Result of building the preset AST, including metadata about resources
 * that need their labels fetched.
 */
interface PresetBuildResult {
  ast: FacetModel.Ast;
  resourcesNeedingLabels: ResourceNeedingLabel[];
}

/**
 * Creates a disjunct from a preset configuration.
 */
function createDisjunctFromPreset(
  preset: PresetFacetValueConfig,
  disjunctIndex: Model.DisjunctIndex
): { disjunct?: FacetModel.FacetRelationDisjunct; needsLabel?: Rdf.Iri } {
  switch (preset.kind) {
    case 'literal':
      return { disjunct: createLiteralDisjunct(preset, disjunctIndex) };

    case 'date-range':
      return { disjunct: createDateRangeDisjunct(preset, disjunctIndex) };

    case 'numeric-range':
      return { disjunct: createNumericRangeDisjunct(preset, disjunctIndex) };

    case 'resource':
    case undefined: {
      const resourcePreset = preset as PresetResourceFacetValue;
      if (resourcePreset.value) {
        const valueIri = parseIri(resourcePreset.value);
        // Use explicit label if provided, otherwise use IRI as placeholder
        const label = preset.label || valueIri.value;
        const disjunct = createResourceDisjunct(valueIri, label, disjunctIndex);
        // Mark for label fetching if no explicit label was provided
        const needsLabel = preset.label ? undefined : valueIri;
        return { disjunct, needsLabel };
      }
      break;
    }
  }

  return {};
}

/**
 * Builds conjuncts from preset configurations.
 */
function buildConjuncts(
  presets: ReadonlyArray<PresetFacetValueConfig>,
  relations: Model.Relations
): PresetBuildResult | undefined {
  const conjuncts: FacetModel.Conjuncts = [];
  const resourcesNeedingLabels: ResourceNeedingLabel[] = [];

  for (const preset of presets) {
    const relationIri = parseIri(preset.relation);
    const relation = relations.find((rel) => rel.iri.equals(relationIri));

    if (!relation) {
      continue;
    }

    let conjunct = conjuncts.find((c) => c.relation.iri.equals(relation.iri));
    let conjunctIndex: number;

    if (!conjunct) {
      conjunctIndex = conjuncts.length;
      conjunct = {
        kind: Model.ConjunctKinds.Relation,
        conjunctIndex: [conjunctIndex],
        relation,
        range: relation.hasRange,
        disjuncts: [],
      };
      conjuncts.push(conjunct);
    } else {
      conjunctIndex = conjunct.conjunctIndex[0];
    }

    const currentDisjunctIndex = conjunct.disjuncts.length;
    const disjunctIndex: Model.DisjunctIndex = [conjunctIndex, currentDisjunctIndex];

    const { disjunct, needsLabel } = createDisjunctFromPreset(preset, disjunctIndex);

    if (!disjunct) {
      continue;
    }

    conjunct.disjuncts.push(disjunct);

    if (needsLabel) {
      resourcesNeedingLabels.push({
        conjunctIndex,
        disjunctIndex: currentDisjunctIndex,
        iri: needsLabel,
      });
    }
  }

  if (conjuncts.length === 0) {
    return undefined;
  }

  return {
    ast: { conjuncts },
    resourcesNeedingLabels,
  };
}

/**
 * Updates the AST with fetched labels.
 */
function updateAstWithLabels(
  ast: FacetModel.Ast,
  resourcesNeedingLabels: ResourceNeedingLabel[],
  labelMap: any
): FacetModel.Ast {
  for (const { conjunctIndex, disjunctIndex, iri } of resourcesNeedingLabels) {
    const label = labelMap.get(iri) || iri.value;
    const conjunct = ast.conjuncts[conjunctIndex];
    const oldDisjunct = conjunct.disjuncts[disjunctIndex];
    const oldResource = oldDisjunct.value as Model.Resource;

    // Create updated tuple with new label
    const updatedTuple = { ...oldResource.tuple, label: Rdf.literal(label) };

    // Create new resource with updated label
    const updatedResource: Model.Resource = {
      iri: oldResource.iri,
      label,
      tuple: updatedTuple,
    };

    // Replace the disjunct with updated resource
    conjunct.disjuncts[disjunctIndex] = {
      kind: Model.EntityDisjunctKinds.Resource,
      disjunctIndex: oldDisjunct.disjunctIndex,
      value: updatedResource,
    };
  }
  return ast;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Collects preset configurations from the facet config.
 */
export function collectPresetConfigs(props: SemanticFacetConfig): PresetFacetValueConfig[] {
  const presets: PresetFacetValueConfig[] = [];

  if (Array.isArray(props.presetFacets)) {
    presets.push(...props.presetFacets);
  }

  return presets;
}

/**
 * Builds a facet AST from preset configurations (synchronous version).
 * 
 * For resource presets without explicit labels, the IRI value is used as a 
 * placeholder label. Use `augmentPresetLabels` to fetch proper labels from 
 * the label service.
 * 
 * This function is exported primarily for testing purposes.
 */
export function buildPresetFacetAst(
  presets: ReadonlyArray<PresetFacetValueConfig>,
  relations?: Model.Relations
): FacetModel.Ast | undefined {
  if (!presets || presets.length === 0 || !relations) {
    return undefined;
  }

  const result = buildConjuncts(presets, relations);
  return result?.ast;
}

/**
 * Builds a facet AST from preset configurations with async label resolution.
 * 
 * For resource presets without explicit labels, labels are fetched from the
 * label service. This provides a better user experience by showing human-readable
 * labels instead of IRIs.
 * 
 * @param presets - The preset configurations
 * @param relations - Available relations from the search profile
 * @param queryContext - Query context for label service calls
 * @returns A Kefir property that resolves to the AST with proper labels
 */
export function buildPresetFacetAstWithLabels(
  presets: ReadonlyArray<PresetFacetValueConfig>,
  relations: Model.Relations | undefined,
  queryContext?: QueryContext
): Kefir.Property<FacetModel.Ast | undefined> {
  if (!presets || presets.length === 0 || !relations) {
    return Kefir.constant(undefined);
  }

  const result = buildConjuncts(presets, relations);

  if (!result) {
    return Kefir.constant(undefined);
  }

  const { ast, resourcesNeedingLabels } = result;

  // If no labels need fetching or no context provided, return immediately
  if (resourcesNeedingLabels.length === 0 || !queryContext) {
    return Kefir.constant(ast);
  }

  // Fetch labels for resources without explicit labels
  const iris = resourcesNeedingLabels.map((r) => r.iri);

  return LabelsService.getLabels(iris, { context: queryContext })
    .map((labelMap) => updateAstWithLabels(ast, resourcesNeedingLabels, labelMap));
}

/**
 * Augments an existing AST with labels from the label service.
 * 
 * This is useful when you have an AST with placeholder labels and want to
 * update them with proper labels asynchronously.
 * 
 * @param ast - The AST to augment
 * @param queryContext - Query context for label service calls
 * @returns A Kefir property that resolves to the augmented AST
 */
export function augmentPresetLabels(
  ast: FacetModel.Ast,
  queryContext: QueryContext
): Kefir.Property<FacetModel.Ast> {
  const resourcesNeedingLabels: ResourceNeedingLabel[] = [];

  // Find all resource disjuncts where label equals IRI (placeholder)
  ast.conjuncts.forEach((conjunct, index) => {
    conjunct.disjuncts.forEach((disjunct, disjunctIndex) => {
      if (disjunct.kind === Model.EntityDisjunctKinds.Resource) {
        const resource = disjunct.value as Model.Resource;
        // Check if label is just the IRI value (placeholder)
        if (resource.label === resource.iri.value) {
          resourcesNeedingLabels.push({
            conjunctIndex: index,
            disjunctIndex,
            iri: resource.iri,
          });
        }
      }
    });
  });

  if (resourcesNeedingLabels.length === 0) {
    return Kefir.constant(ast);
  }

  const iris = resourcesNeedingLabels.map((r) => r.iri);

  return LabelsService.getLabels(iris, { context: queryContext })
    .map((labelMap) => updateAstWithLabels(ast, resourcesNeedingLabels, labelMap));
}

