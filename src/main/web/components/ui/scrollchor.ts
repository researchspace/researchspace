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

import { createFactory } from 'react';
import { default as ReactScrollchor } from 'react-scrollchor';

/**
 * This is just a small wrapper around react-scrollchor
 * @example
 *  <mp-anchor to="#section123">Click to scroll</mp-anchor>
 *  <div style="padding-top:2000px;">Lorem ipsum dolor sit amet</div>
 *  <section id="section123"></section>
 *
 * @example
 *  <mp-anchor
 *      to="#section456"
 *      animate='{"offset": 20, "duration": 6000}'
 *      className="nav-link">
 *  Click to scroll</mp-anchor>
 *  <div style="padding-top:2000px;">Lorem ipsum dolor sit amet</div>
 *  <section id="section456"></section>
 */
export const component = ReactScrollchor;
export const factory = createFactory(component);
export default component;
