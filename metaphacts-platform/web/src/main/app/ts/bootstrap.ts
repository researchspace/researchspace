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
