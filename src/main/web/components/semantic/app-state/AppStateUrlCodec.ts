/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as Kefir from 'kefir';
import * as _ from 'lodash';

import { get, post } from 'platform/api/http';
import { requestAsProperty } from 'platform/api/async';

import { ComponentState, ComponentStates } from './AppStateEvents';

/**
 * URL parameter with the encoded states of all components (url storage mode).
 * Format: `states=<componentId>=<base64>&<componentId>=<base64>`, where the whole
 * value is percent-encoded once more as a query parameter value.
 */
export const STATES_PARAM = 'states';

/**
 * URL parameter with the id of a state saved in the backend (backend storage mode).
 */
export const STATE_ID_PARAM = 'stateId';

const APP_STATE_ENDPOINT = '/rest/app-state';

/**
 * Encodes the state of one component as `base64(encodeURIComponent(JSON))`.
 */
export function encodeComponentState(state: ComponentState): string {
  return btoa(encodeURIComponent(JSON.stringify(state)));
}

/**
 * Decodes the state of one component. Tolerates the changes that happen when a URL
 * is copied around: `+` turned into a space, URL-safe base64 alphabet, missing padding.
 *
 * @returns the state, or `undefined` if the value is not an encoded JSON object.
 */
export function decodeComponentState(encoded: string): ComponentState | undefined {
  if (!encoded) {
    return undefined;
  }
  const normalized = encoded.trim().replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '==='.slice((normalized.length + 3) % 4);
  try {
    const state = JSON.parse(decodeURIComponent(atob(padded)));
    return _.isPlainObject(state) ? state : undefined;
  } catch (e) {
    return undefined;
  }
}

/**
 * Serializes the states of all components for the `states` URL parameter.
 * Components with an empty state are left out.
 */
export function serializeStates(states: ComponentStates): string {
  return Object.keys(states)
    .filter((componentId) => states[componentId] && Object.keys(states[componentId]).length > 0)
    .map((componentId) => `${componentId}=${encodeComponentState(states[componentId])}`)
    .join('&');
}

/**
 * Parses the (already URL-decoded) value of the `states` URL parameter.
 * Parts that cannot be decoded are skipped.
 */
export function parseStatesParam(value: string): ComponentStates {
  const states: ComponentStates = {};
  if (!value) {
    return states;
  }
  value.split('&').forEach((part) => {
    const separator = part.indexOf('=');
    if (separator <= 0) {
      return;
    }
    const componentId = part.substring(0, separator);
    const state = decodeComponentState(part.substring(separator + 1));
    if (state) {
      states[componentId] = state;
    } else {
      console.warn(`app-state: cannot decode the state of component "${componentId}"`);
    }
  });
  return states;
}

export interface ParsedAppStateUrl {
  url: URL;
  /**
   * States encoded in the `states` parameter, if any.
   */
  states?: ComponentStates;
  /**
   * Id of a backend state from the `stateId` parameter, if any.
   */
  stateId?: string;
}

/**
 * Parses a URL (absolute, or relative to the current page) that may carry app states.
 *
 * @returns `undefined` if the URL is invalid.
 */
export function parseAppStateUrl(url: string, base: string = window.location.href): ParsedAppStateUrl | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url, base);
  } catch (e) {
    return undefined;
  }
  const statesParam = parsed.searchParams.get(STATES_PARAM);
  const stateId = parsed.searchParams.get(STATE_ID_PARAM);
  return {
    url: parsed,
    states: statesParam ? parseStatesParam(statesParam) : undefined,
    stateId: stateId || undefined,
  };
}

/**
 * Returns `url` with the given states in the `states` parameter (or without it when
 * there is no state). Other parameters are kept.
 */
export function withStatesParam(url: string, states: ComponentStates): string {
  const result = new URL(url, window.location.href);
  const serialized = serializeStates(states);
  if (serialized) {
    result.searchParams.set(STATES_PARAM, serialized);
  } else {
    result.searchParams.delete(STATES_PARAM);
  }
  return result.toString();
}

export interface StoredAppState {
  id: string;
  createdAt: string;
  createdBy: string;
  pageUrl: string;
  states: ComponentStates;
}

/**
 * Loads a state saved in the backend.
 */
export function fetchBackendState(stateId: string): Kefir.Property<StoredAppState> {
  const request = get(`${APP_STATE_ENDPOINT}/load/${encodeURIComponent(stateId)}`).accept('application/json');
  return requestAsProperty(request).map((response) => {
    const stored = response.body as StoredAppState;
    // states saved by earlier versions are a JSON string
    const states = typeof stored.states === 'string' ? JSON.parse(stored.states) : stored.states;
    return { ...stored, states: states || {} };
  });
}

/**
 * Saves the given states in the backend.
 *
 * @returns the id of the saved state.
 */
export function saveBackendState(pageUrl: string, states: ComponentStates): Kefir.Property<string> {
  const request = post(`${APP_STATE_ENDPOINT}/save`)
    .type('application/json')
    .accept('application/json')
    .send({ pageUrl, states });
  return requestAsProperty(request).map((response) => response.body.stateId as string);
}
