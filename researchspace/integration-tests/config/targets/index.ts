/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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
