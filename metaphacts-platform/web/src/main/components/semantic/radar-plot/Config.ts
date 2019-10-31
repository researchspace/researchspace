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

export interface RadarPlotProps {
  sectors: ReadonlyArray<SectorDescription>;
  subsectors: ReadonlyArray<SubSectorDescription>;
  /** All rings have equal size 100% */
  rings: ReadonlyArray<RingDescription>;
  clusters?: ReadonlyArray<ClusterDescription>;
  items: ReadonlyArray<ItemDescription>;
  showClusters?: boolean;
  templates?: RadarTemplates;
  /**
   * Expected output bindings:
   *  - `iri`
   *  - `subsector`
   *  - `cluster` (optional)
   *  - `label`
   *  - `distance`
   *  - `color` (optional)
   */
  query: string;

  sectorLabelStyle?: string;
  subsectorLabelStyle?: string;
  ringLabelStyle?: string;
  itemLabelStyle?: string;

  itemRadius?: number;
  popoverWidth?: number | string;

  // TODO: use AutoSizer from react-virtualized
  width: number;
  height: number;
}

export interface SectorDescription {
  readonly iri: string;
  readonly label: string;
  readonly color?: string;
}

export interface SubSectorDescription extends SectorDescription {
  readonly sector: string;
}

export interface RingDescription {
  readonly iri: string;
  readonly label: string;
  readonly color?: string;
}

export interface ClusterDescription {
  readonly iri: string;
  readonly label: string;
  readonly color?: string;
}

export interface ItemDescription {
  readonly iri: string;
  readonly subsector: string;
  readonly ring: string;
  readonly cluster?: string;
  readonly label: string;
  readonly distance: number;
  readonly color?: string;
}

/**
 * Template parameters:
 *  - `iri`
 *  - `label`
 */
export interface RadarTemplates {
  readonly sector?: string;
  readonly subsector?: string;
  readonly ring?: string;
  readonly point?: string;
}
