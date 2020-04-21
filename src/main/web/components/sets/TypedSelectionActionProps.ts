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

import { ReactElement } from 'react';
import { TitleProps } from 'platform/components/ui/selection/SelectionActionProps';

/**
 * Description of image action behaviour
 */
export interface ActionProps {
  /**
   * Dialog body renderer
   */
  renderDialog?: (selection: string[]) => ReactElement<any>;

  /**
   * Full dialog renderer
   */
  renderRawDialog?: (selection: string[]) => ReactElement<any>;

  /**
   * Get disabled state from selection
   */
  isDisabled: (selection: string[]) => boolean;
}

/**
 * Description of image action look
 */
export interface MenuTitleProps {
  /**
   * Menu item title
   */
  menuTitle: string;

  /**
   * Type of the dialog for the action.
   */
  dialogType?: 'lightbox' | 'modal';

  /**
   * Size of the modal dialog.
   */
  dialogSize?: 'large' | 'small';
}
export type AllTitleProps = TitleProps & MenuTitleProps;

/**
 * Allowed type settings
 */
export interface TypeProps {
  /**
   * Selection items are allowed to have these types
   */
  types?: string[];

  /**
   * Query that is used to check if selection is active. For the default value see TypedSelectionActionComponent. If `undefined` is explicitly specified then no check is performed.
   */
  checkQuery?: string;

  repositories?: string[];
}
