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

import { groupBy, keyBy, flatten, orderBy } from 'lodash';
import { hcl, HCLColor } from 'd3-color';

import {
  RadarPlotProps, SectorDescription, SubSectorDescription, ItemDescription, RingDescription,
  ClusterDescription,
} from './Config';
import { Vector } from './Geometry';

export interface PlotLayout {
  readonly sectors: ReadonlyArray<SectorDescription>;
  readonly orderedSubsectors: ReadonlyArray<SubSectorDescription>;
  readonly subsectorsBySector: {
    readonly [sector: string]: ReadonlyArray<SubSectorDescription>;
  };
  readonly items: ReadonlyArray<ItemDescription>;
  readonly itemsBySubsector: {
    readonly [subsector: string]: ReadonlyArray<ItemDescription>;
  };
  readonly sectorLayouts: SectorLayouts;
  readonly sectorColors: { readonly [sector: string]: string };
  readonly rings: ReadonlyArray<RingDescription>;
  readonly ringIndices: { readonly [ring: string]: number };
  readonly clusters: ReadonlyArray<ClusterDescription>;
  readonly clustersByIri: {
    readonly [cluser: string]: ClusterDescription;
  };
  readonly clusterColors: { readonly [cluster: string]: string };
  /**
   * item -> {x, y} where
   *   x in [0..1] is angle on sector axis within subsector
   *   y in [0..1] on ring axis
   */
  readonly normalizedPositions: { readonly [item: string]: Vector };
}

export interface SectorLayouts {
  readonly [sectorOrSubsector: string]: SectorLayout;
}

export interface SectorLayout {
  parentSector: string | number;
  startIndex: number;
  endIndex: number;
}

export function computeLayout(props: RadarPlotProps): PlotLayout {
  const {sectors, subsectors, rings, clusters, items} = props;
  const subsectorsBySector = groupBy(subsectors, sub => sub.sector);

  const orderedSubsectors = flatten(sectors.map(sector => subsectorsBySector[sector.iri]));
  const itemsBySubsector = groupBy(items, item => item.subsector);

  const sectorLayouts: { [sector: string]: SectorLayout } = {};
  let nextSubsectorIndex = 0;
  for (const sector of sectors) {
    const startIndex = nextSubsectorIndex;
    const subsectors = subsectorsBySector[sector.iri];
    for (const subsector of subsectorsBySector[sector.iri]) {
      sectorLayouts[subsector.iri] = {
        parentSector: sector.iri,
        startIndex: nextSubsectorIndex,
        endIndex: nextSubsectorIndex + 1,
      };
      nextSubsectorIndex++;
    }
    if (subsectors.length === 0) {
      nextSubsectorIndex++;
    }
    sectorLayouts[sector.iri] = {
      parentSector: undefined,
      startIndex,
      endIndex: nextSubsectorIndex,
    };
  }

  const sectorColors: { [sector: string]: string } = {};
  sectors.forEach((sector, i) => {
    const parentColor = sector.color
      ? hcl(sector.color) : defaultSectorColor(i, sectors.length);
    sectorColors[sector.iri] = parentColor.toString();

    const subsectors = subsectorsBySector[sector.iri] || [];
    subsectors.forEach((subsector, j) => {
      const subColor = subsector.color
        ? subsector.color
        : defaultSubsectorColor(parentColor, j, subsectors.length).toString();
      sectorColors[subsector.iri] = subColor;
    });
  });

  const ringIndices: { [ring: string]: number } = {};
  rings.forEach((ring, ringIndex) => ringIndices[ring.iri] = ringIndex);

  const clusterColors: { [cluster: string]: string } = {};
  clusters.forEach((cluster, clusterIndex) => {
    clusterColors[cluster.iri] = cluster.color ||
      defaultClusterColor(clusterIndex, clusters.length).toString();
  });

  for (const item of items) {
    const sectorLayout = sectorLayouts[item.subsector];
    if (!sectorLayout || !sectorLayout.parentSector) {
      throw new Error(`Unknown subsector <${item.subsector}> for item <${item.iri}>`);
    }
    if (!(item.ring in ringIndices)) {
      throw new Error(`Unknown ring <${item.ring}> for item <${item.iri}>`);
    }
  }

  return {
    sectors,
    orderedSubsectors,
    subsectorsBySector,
    items,
    itemsBySubsector,
    sectorLayouts,
    sectorColors,
    rings,
    ringIndices,
    clusters,
    clustersByIri: keyBy(clusters, cluster => cluster.iri),
    clusterColors,
    normalizedPositions: computeItemsLayout(orderedSubsectors, itemsBySubsector, rings),
  };
}

function defaultSectorColor(sectorIndex: number, sectorCount: number) {
  // constant offset for tweaking default palette
  const offset = 0.2;
  const range = 1;
  const hue = (offset + range * (sectorIndex + 0.5) / sectorCount) % 1;
  return hcl(360 * hue, 40, 65);
}

function defaultSubsectorColor(parentColor: HCLColor, childIndex: number, childCount: number) {
  const {h, c, l} = parentColor;
  const intensity = 1 - (childIndex + 1) / childCount;
  return hcl(h, c, l * (1 + 0.5 * intensity));
}

function defaultClusterColor(clusterIndex: number, clusterCount: number) {
  const offset = 0.4;
  const range = 1;
  const hue = (offset + range * (clusterIndex + 0.5) / clusterCount) % 1;
  return hcl(360 * hue, 20, 65);
}

function computeItemsLayout(
  orderedSubsectors: ReadonlyArray<SubSectorDescription>,
  itemsBySubsector: { [subsector: string]: ItemDescription[] },
  rings: ReadonlyArray<RingDescription>,
) {
  const layout: { [item: string]: Vector } = {};

  const random = new LcgRandom(0);
  for (const subsector of orderedSubsectors) {
    const sectorItems = itemsBySubsector[subsector.iri] || [];
    rings.forEach((ring, ringIndex) => {
      const cellItems = sectorItems.filter(item => item.ring === ring.iri);
      const {minDistance, maxDistance} = computeItemsRange(cellItems);
      const orderedItems = orderBy(cellItems, item => item.distance);
      random.shuffle(orderedItems).forEach((item, index) => {
        layout[item.iri] = {
          x: cellItems.length <= 1 ? 0.5 : (index / (cellItems.length - 1)),
          y: (item.distance - minDistance) / (maxDistance - minDistance),
        };
      });
    });
  }

  return layout;
}

class LcgRandom {
  private a = 1664525;
  private c = 1013904223;
  readonly range = Math.pow(2, 32);
  constructor(private seed: number) {}
  /** Range: [0..2^32) */
  nextInteger(excludedMax: number) {
    // seed in [0..range)
    this.seed = (this.seed * this.a + this.c) % this.range;
    // normalized in [0..1)
    const normalized = this.seed / this.range;
    // result in [0..excludedMax)
    return Math.floor(normalized * excludedMax);
  }
  shuffle<T>(items: ReadonlyArray<T>): T[] {
    const result: T[] = [...items];
    for (let i = 0; i < items.length; i++) {
      const left = items.length - i;
      const chosen = i + this.nextInteger(left);
      const [item] = result.splice(chosen, 1);
      result.splice(i, 0, item);
    }
    return result;
  }
}

function computeItemsRange(
  items: ReadonlyArray<ItemDescription>
): { minDistance: number; maxDistance: number; } {
  let minDistance = Infinity;
  let maxDistance = -Infinity;
  for (const item of items) {
    minDistance = Math.min(minDistance, item.distance);
    maxDistance = Math.max(maxDistance, item.distance);
  }
  if (minDistance === maxDistance) {
    // account for case when visualizing a single item
    minDistance -= 1;
    maxDistance += 1;
  }
  return {minDistance, maxDistance};
}
