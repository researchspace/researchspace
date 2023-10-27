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

const h = require('history');
import * as React from 'react';
import * as _ from 'lodash';
import * as Kefir from 'kefir';
import * as uri from 'urijs';
import * as Maybe from 'data.maybe';

import { Rdf } from 'platform/api/rdf';
import { SparqlUtil } from 'platform/api/sparql';
import { getPrefixedUri, getFullIri } from 'platform/api/services/namespace';
import { ConfigHolder } from 'platform/api/services/config-holder';
import { getOverlaySystem } from 'platform/components/ui/overlay';
import { NavigationConfirmationDialog } from './components/NavigationConfirmationDialog';
import { init as initPersistentHistory, persistRecentPages } from './PersistentHistory';
import { getCurrentResource, __unsafe__setCurrentResource } from './CurrentResource';
export { getCurrentResource, __unsafe__setCurrentResource };

export type EventType = 'NAVIGATED' | 'BEFORE_NAVIGATE';
export type Listener = NavigatedListener | BeforeNavigateListener;

export interface NavigatedListener {
  eventType: 'NAVIGATED';
  callback: (e: Event) => void;
}

export interface BeforeNavigateListener {
  eventType: 'BEFORE_NAVIGATE';
  callback: (e: Event, performNavigation: (navigate: boolean) => void) => void;
}

/**
 * Location change event.
 */
export interface Event {
  url: uri.URI;

  /**
   * REFRESH should be used when one want to refresh current page with actual page reload
   */
  action: 'PUSH' | 'REPLACE' | 'POP' | 'REFRESH' | 'BEFORE_NAVIGATE';
}
const listeners: Map<string, Listener> = new Map();
let currentLocation: uri.URI;

const history = h.createBrowserHistory();
history.listen((location, action) =>
  init(location).onValue((mUrl) => mUrl.map((url) => notifyAll({ url: url, action: action })))
);

/**
 * Listen to browser Location changes.
 * @return a callback to unsubscribe.
 */
export function listen(cb: Listener) {
  const id = _.uniqueId();
  listeners.set(id, cb);
  return () => {
    listeners.delete(id);
  };
}

/**
 * Show confirmation dialog before navigating from the current page.
 */
export function navigationConfirmation(message: string): () => void {
  return listen({
    eventType: 'BEFORE_NAVIGATE',
    callback: (event: Event, navigate: (b: boolean) => void) => {
      showNavigationConfirmationDialog(message, navigate);
    },
  });
}

export function getCurrentRepository(): string {
  return currentLocation.search(true)['repository'] || 'default';
}

/**
 * Returns current browser Location URL.
 */
export function getCurrentUrl(): uri.URI {
  return currentLocation;
}

/**
 * Workaround for ThinkingFrames navigation.
 * When in ThinkingFrame all navigation requests
 * are redirected to frame component.
 */
let inFrame = false;
let inFrameNavigationHandler: (iri: Rdf.Iri, props?: {}) => boolean;
export function setFrameNavigation(enable: boolean, handler?: typeof inFrameNavigationHandler) {
  inFrame = enable;
  inFrameNavigationHandler = handler;
}

/**
 * Navigate to specified resource, it is possible to provide
 * additional query parameters with 'props' map.
 */
export function navigateToResource(
  iri: Rdf.Iri,
  props?: {},
  repository?: string,
  fragment?: string
): Kefir.Property<void> {
  if (inFrame && inFrameNavigationHandler(iri, props)) {
    return Kefir.constant(null);
  } else {
    return constructUrlForResource(iri, props, repository, fragment).flatMap(navigateToUrl).toProperty();
  }
}

/**
 * This function opens a link in a new window, it is synchronous, so we can't create pretty
 * URL with namespace.
 * We can't have async call here, because by default browsers prevent opening of
 * new windows/tab not from the action triggered by the user
 */
export function openResourceInNewWindow(iri: Rdf.Iri, props?: {}, repository?: string): void {
  window.open(construcUrlForResourceSync(iri, props, repository).toString(), '_blank');
}

export function openExternalLink(url: uri.URI, target = '_blank') {
  return confirmAll(url)
    .filter((c) => c)
    .map(() => {
      window.open(url.toString(), target);
    });
}

const START_PAGE = uri('/');

/**
 * Navigate to platform internal URL, e.g '/sparql'. In case of navigation to root we redirect to
 * start page.
 */
export function navigateToUrl(url: uri.URI): Kefir.Property<void> {
  return confirmAll(url)
    .filter((c) => c)
    .map(() => {
      if (url.equals(START_PAGE)) {
        // Because home page configuration value can be full or prefixed IRI we
        // need to apply the same heuristic that we use in HomePageFilter.java#guessStartPage
        const homePage = SparqlUtil.resolveIris([ConfigHolder.getGlobalConfig().homePage.value])[0];
        navigateToResource(homePage).onValue(() => {
          /**/
        });
      } else {
        let newUrl = url.toString();
        history.push(newUrl);
        persistRecentPages(newUrl);
      }
    });
}

/**
 * Refresh current Location with actual page reload.
 */
export function refresh(): void {
  notifyAll({ url: currentLocation, action: 'REFRESH' });
}

/**
 * Construct URL for resource page with optional additional query parameters.
 * If possible, shortcuts full IRI to prefixed IRI.
 */
export function constructUrlForResource(
  iri: Rdf.Iri,
  props: {} = {},
  repository = 'default',
  fragment = ''
): Kefir.Property<uri.URI> {
  return getPrefixedUri(iri).map((mUri) => {
    const baseQuery = repository === 'default' ? {} : { repository: repository };
    const resourceUrl = ConfigHolder.getEnvironmentConfig().resourceUrlMapping.value;
    if (mUri.isJust) {
      const url = uri(`${resourceUrl}${mUri.get()}`);
      url.setQuery({ ...baseQuery, ...props });
      url.fragment(fragment);
      return url;
    } else {
      return construcUrlForResourceSync(iri, props, repository, fragment);
    }
  });
}

export function construcUrlForResourceSync(iri: Rdf.Iri, props: {} = {}, repository = 'default', fragment = '') {
  const baseQuery = repository === 'default' ? {} : { repository: repository };
  const resourceUrl = ConfigHolder.getEnvironmentConfig().resourceUrlMapping.value;
  const url = uri(`${resourceUrl}`);
  url.setQuery({ ...baseQuery, ...props, uri: iri.value });
  url.fragment(fragment);
  return url;
}

/**
 * Initialize Navigation with current browser Location.
 */
export function init(location = history.location): Kefir.Property<Data.Maybe<uri.URI>> {
  currentLocation = uri({
    path: location.pathname,
    query: location.search,
    fragment: location.hash,
  });
  return resolveResourceIri(currentLocation).map((maybeIri) =>
    maybeIri.map(__unsafe__setCurrentResource).map((_) => currentLocation)
  );
}

function showNavigationConfirmationDialog(message: string, navigate: (b: boolean) => void) {
  const dialogRef = 'navigation-confirmation';
  const onHide = () => getOverlaySystem().hide(dialogRef);
  getOverlaySystem().show(
    dialogRef,
    React.createElement(NavigationConfirmationDialog, {
      onHide: onHide,
      message: message,
      onConfirm: (b) => {
        onHide();
        navigate(b);
      },
    })
  );
}

/**
 * Notify all subscribed listeners.
 */
export function notifyAll(event: Event) {
  listeners.forEach((listener) => {
    if (isNavigationListener(listener)) {
      listener.callback(event);
    }
  });
}

function confirmAll(url: uri.URI): Kefir.Property<boolean> {
  const responsess: Array<Kefir.Property<boolean>> = [];
  listeners.forEach((listener) => {
    if (isBeforeNavigationListener(listener)) {
      responsess.push(
        Kefir.fromCallback<boolean>((cb) => listener.callback({ action: 'BEFORE_NAVIGATE', url: url }, cb)).toProperty()
      );
    } else {
      responsess.push(Kefir.constant(true));
    }
  });
  return Kefir.combine(responsess).map(_.every).toProperty();
}

function isNavigationListener(listener: Listener): listener is NavigatedListener {
  return listener.eventType === 'NAVIGATED';
}

function isBeforeNavigationListener(listener: Listener): listener is BeforeNavigateListener {
  return listener.eventType === 'BEFORE_NAVIGATE';
}

export function resolveResourceIri(url: uri.URI): Kefir.Property<Data.Maybe<Rdf.Iri>> {
  if (url.hasSearch('uri')) {
    const iriStr = url.search(true)['uri'];
    return Kefir.constant(Maybe.Just(Rdf.iri(iriStr)));
  } else {
    // treat everything after /resource context path as a prefixed IRI
    // this allows us to have resolvable IRIs even for nested context paths
    // e.g with Default namespace = http://localhost:10214/resource/
    // request to http://localhost:10214/resource/person/Bob URL will be properly resolved
    // to <http://localhost:10214/resource/person/Bob> resource
    const prefixedIriStr = url.path().substring('/resource/'.length);
    return getFullIri(prefixedIriStr);
  }
}


initPersistentHistory(init, notifyAll);
