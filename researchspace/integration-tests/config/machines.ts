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

import {Options} from '../tests/options';
import {WebDriver} from 'selenium-webdriver';
import * as chrome from './targets/chrome';
import {createDriver as firefox} from './targets/firefox';
import {browserStack, windows, osx} from './targets/browser-stack';
  
export interface TargetDescription {
  options: Options,
  targets: {name: string, createDriver: () => WebDriver} []
}

interface TargetDescriptionMap {
  [arg: string]: TargetDescription;
}

const targets: TargetDescriptionMap = {};

targets['local'] = {
  options: {
    dataset: 'bm',
    loginUrl: 'http://localhost:10214/login',
    searchUrl: 'http://localhost:10214/resource/rsp:Search',
    username: process.env.RS_DEVELOP_USERNAME || 'admin',
    password: process.env.RS_DEVELOP_PASSWORD || 'admin'
  },
  targets: [chrome]
};

targets['development-local'] = {
  options: {
    dataset: 'bm',
    searchUrl: 'https://development.researchspace.org/resource/Start',
    noLogin: true
  },
  targets: [chrome]
};

targets['jenkins'] = {
  options: {
    dataset: 'bm',
    loginUrl: 'https://development.researchspace.org/login',
    searchUrl: 'https://development.researchspace.org/resource/Start',
    username: process.env.RS_DEVELOP_USERNAME || 'admin',
    password: process.env.RS_DEVELOP_PASSWORD || 'admin'
  },
  targets: [
    windows('Firefox'),
    windows('Chrome'),
    windows('Edge'),
    osx('Firefox'),
    osx('Chrome')
//    osx('Safari')
  ].map(browserStack)
};

export function getTargets(machine: string): TargetDescription {
  return targets[machine];
}
