/**
 * ResearchSpace
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

import { ExtensionPoint } from 'platform/api/module-loader';

import { RepositoryType } from 'platform/api/services/repository';

// Important! This module is an extension point definition or an implementation, so it
// should limit it's imports to only base platform APIs and type definitions.
// Otherwise every module imported here will be bundled as part of main "app" bundle.
//
// This happens due to the fact that extension point is directly referenced by the
// implementation which in turn is directly referenced by .mp-extensions.
// And .mp-extension is loaded eagerly because otherwise extension point won't be
// aware about implementation existence.

export interface RdfUploadTabs {
  [key: string]: (props: RdfUploadProps) => RdfUploadTab | undefined;
}

export interface RdfUploadProps {
  repositoryType: RepositoryType;
  targetGraph: Data.Maybe<string>;
}

export interface RdfUploadTab {
  title: string;
  content: JSX.Element;
}

export const RdfUploadExtension = new ExtensionPoint<RdfUploadTabs>();
