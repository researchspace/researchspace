/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { SparqlClient } from 'platform/api/sparql';

export interface TreeNode {
  readonly key: string;
  readonly data: SparqlClient.Binding;
  readonly children: ReadonlyArray<TreeNode>;
}

export interface RelatedNodeCriteria {
  label: string;           // Display name in dropdown
  icon?: string;          // Optional icon class (e.g., "fa fa-file")
  query: string;          // SPARQL query with $__nodeIri__ placeholder
  description?: string;   // Optional tooltip description
}

export interface ProviderPropsAdvanced {
  tupleTemplate: string;
  onNodeClick?: (node: TreeNode) => void;
  onNodeExpand?: (node: TreeNode) => Promise<ReadonlyArray<TreeNode>>;
  nodeData: ReadonlyArray<TreeNode>;
  nodeKey?: string;
  collapsed: boolean;
  keysOpened: ReadonlyArray<string>;
  loadingNodes: Set<string>;
  hasChildrenBinding: string;
  loadingTemplate: string;
  highlightedNodes?: Set<string>;
  preloadedChildren?: Map<string, ReadonlyArray<TreeNode>>;
  relatedNodeCriteria?: RelatedNodeCriteria[];
  onFindRelatedNodes?: (node: TreeNode, criterion: RelatedNodeCriteria) => void;
}
