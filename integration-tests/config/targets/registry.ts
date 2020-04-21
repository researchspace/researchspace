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

import {WebDriver} from 'selenium-webdriver';

interface CreateDriver {
  (): WebDriver
}

interface CreateDriverFns {
  [arg: string]: CreateDriver;
}

const createDriverFns: CreateDriverFns = {};

export function register(name: string, createDriver: CreateDriver) {
  if (createDriverFns.hasOwnProperty(name)) {
    throw new Error(`Target with that name already exists: ${name}`);
  }
  createDriverFns[name] = createDriver;
}

export function find(name: string) {
  if (!createDriverFns.hasOwnProperty(name)) {
    throw new Error(`No such target: ${name}`);
  }
  return createDriverFns[name];
}
