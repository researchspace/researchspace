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

import * as React from 'react';
import { ReactElement } from 'react';

import { SemanticContext } from 'platform/api/components';

import { OverlaySystem as OverlaySystemComponent } from './OverlaySystem';

const OVERLAY_SYSTEM_REF = 'overlaySystem';
let _system: OverlaySystemComponent;

export interface OverlaySystem {
  show(key: string, dialog: ReactElement<any>, context?: SemanticContext): void;
  hide(key: string): void;
  hideAll(): void;
}

export function renderOverlaySystem() {
  return React.createElement(OverlaySystemComponent, { key: OVERLAY_SYSTEM_REF, ref: OVERLAY_SYSTEM_REF });
}

export function registerOverlaySystem(_this: React.Component<any, any>) {
  _system = _this.refs[OVERLAY_SYSTEM_REF] as OverlaySystemComponent;
}

export function getOverlaySystem(): OverlaySystem {
  return _system;
}

export * from './OverlayDialog';
