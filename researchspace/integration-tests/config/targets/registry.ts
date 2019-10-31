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
