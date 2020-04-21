/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @author Philip Polkovnikov
 */

import {register, find} from './registry';
import {name as fxName, createDriver as createDriverFx} from './firefox';
import {name as cName, createDriver as createDriverC} from './chrome';
import {name as bscName, createDriver as createDriverBsc} from './bs-chrome';

register(fxName, createDriverFx);
register(cName, createDriverC);
register(bscName, createDriverBsc);

export const getTarget = find;
