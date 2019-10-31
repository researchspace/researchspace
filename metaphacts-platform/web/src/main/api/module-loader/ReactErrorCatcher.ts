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

import * as React from 'react';
import * as _ from 'lodash';

import { ErrorNotification } from 'platform/components/ui/notification';

const ERROR = '__unsafeError';
const WRAPPED_BY_CATCHER = '__wrappedByErrorCatcher';
const METHODS_TO_WRAP = [
  'componentWillMount',
  'componentDidMount',
  'componentWillReceiveProps',
  'componentWillUpdate',
  'componentDidUpdate',
  'componentWillUnmount',
];

/**
 * Wrap component prototype functions to catch unexpected errors.
 */
function wrap(component) {
  return function(method) {
    const isMethodNotDefined =
      _.isUndefined(component.prototype) ||
      !(component.prototype.hasOwnProperty(method) && component.prototype[method]);
    if (isMethodNotDefined) {
      return;
    }

    const unsafe = component.prototype[method];
    const safe = function () {
      try {
        unsafe.apply(this, arguments);
      } catch (e) {
        console.error(e);
        this.setState({[ERROR]: e});
      }
    };
    safe[WRAPPED_BY_CATCHER] = true;
    component.prototype[method] = safe;
  };
}

/**
 * Wrap react component creation functions to catch unexpected errors.
 */
function wrapComponent<F extends Function>(original: F): F {
  return function(comp) {
    if (_.isUndefined(comp.prototype) ||
      comp instanceof ErrorNotification ||
      comp[WRAPPED_BY_CATCHER] // prevent multiple wrapping
    ) {
      return original.apply(this, arguments);
    }
    comp[WRAPPED_BY_CATCHER] = true;

    if (!comp.prototype.componentDidCatch) {
      comp.prototype.componentDidCatch = defaultComponentDidCatch;
    }

    const unsafeRender = comp.prototype.render;
    // Default unstable_handleError (without override) set state item
    // that leads to error message rendering
    if (!comp.prototype.unstable_handleError) {
      comp.prototype.unstable_handleError = function (e) {
        this.setState({[ERROR]: e});
      };
    }
    comp.prototype.render = function() {
      const error = getError(this);
      if (error !== undefined) {
        return React.createElement(ErrorNotification, {errorMessage: error});
      } else {
        try {
          return unsafeRender.apply(this);
        } catch (e) {
          console.error(e);
          return React.createElement(ErrorNotification, {errorMessage: e});
        }
      }
    };
    _.forEach(METHODS_TO_WRAP, wrap(comp));

    if (comp.prototype.getChildContext) {
      const unsafeGetChildContext = comp.prototype.getChildContext;
      comp.prototype.getChildContext = function() {
        // prevent stack overflow on error
        if (getError(this) !== undefined) { return undefined; }
        try {
          return unsafeGetChildContext.apply(this);
        } catch (e) {
          console.error(e);
          this.setState({[ERROR]: e});
          return undefined;
        }
      };
    }

    return original.apply(this, arguments);
  } as any;
}

function defaultComponentDidCatch(
  this: React.Component<any, any>,
  error: any,
  info: { componentStack: string }
) {
  console.error(error);
  console.error(info.componentStack);
  this.setState({[ERROR]: error});
}

function getError(componentInstance: any) {
  return componentInstance.state ? componentInstance.state[ERROR] : undefined;
}

/**
 * Wrapped versions of React.createElement and React.createFactory
 * Components created by them handle exceptions in React lifetime methods (enumerated in METHODS_TO_WRAP)
 * and display messages about exceptions if any instead of component render result
 * Also user can override unstable_handleError in order to get other desired behavior
 */
export const safeReactCreateElement = wrapComponent(React.createElement);
export const safeReactCreateFactory = wrapComponent(React.createFactory);

/**
 * Changes react functions like createElement and createFactory in a way that
 * all errors thrown from the components will not be propagated up the tree and
 * will not crash the main app. Instead error message will be shown in place of
 * failed component.
 */
export function initReactErrorCatcher() {
  /**/
}
