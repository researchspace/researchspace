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

export interface MenuProps {
  /**
   * Identifiers of selected items
   */
  selection: string[];

  /**
   * Function that closes the menu
   */
  closeMenu: () => void;
}

/**
 * Description of action behaviour
 */
export interface ActionProps {
  /**
   * Callback for action click
   */
  onAction: (selection: string[]) => void;

  /**
   * Is menu item disabled?
   */
  disabled: boolean;
}

/**
 * Description of action look
 */
export interface TitleProps {
  /**
   * Menu item title
   */
  title: string;
}
