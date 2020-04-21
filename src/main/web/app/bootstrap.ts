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

// this module is initialized immediately after initialization of 3-rd party libraries
// and just before the main application module
import '@webcomponents/custom-elements';
import 'core-js';

// native Custom Elements support only ES6 classes
// see https://github.com/webcomponents/webcomponentsjs#custom-elements-es5-adapterjs
import '@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js';

import { ReactErrorCatcher, ModuleRegistry } from 'platform/api/module-loader';

export function initModuleRegistry() {
  ReactErrorCatcher.initReactErrorCatcher();
  ModuleRegistry.init();
}
