/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from 'chai';

import {
  decodeComponentState,
  encodeComponentState,
  parseAppStateUrl,
  parseStatesParam,
  serializeStates,
  withStatesParam,
} from 'platform/components/semantic/app-state/AppStateUrlCodec';
import { parseSharedStateVars } from 'platform/components/semantic/app-state/SharedStateUtils';

describe('AppStateUrlCodec', () => {
  const state = { zoom: 12.5, extent: [1, 2, 3, 4], label: 'Città & "quotes" = ok?', nested: { a: [true, null] } };

  it('round-trips a component state', () => {
    expect(decodeComponentState(encodeComponentState(state))).to.deep.equal(state);
  });

  it('decodes states altered by copy and paste', () => {
    const encoded = encodeComponentState({ label: 'ÿÿÿ>>>???' });
    const withSpaces = encoded.replace(/\+/g, ' ');
    const urlSafe = encoded.replace(/\+/g, '-').replace(/\//g, '_');
    const unpadded = encoded.replace(/=+$/, '');
    expect(decodeComponentState(withSpaces)).to.deep.equal({ label: 'ÿÿÿ>>>???' });
    expect(decodeComponentState(urlSafe)).to.deep.equal({ label: 'ÿÿÿ>>>???' });
    expect(decodeComponentState(unpadded)).to.deep.equal({ label: 'ÿÿÿ>>>???' });
  });

  it('rejects values that are not encoded JSON objects', () => {
    expect(decodeComponentState('')).to.equal(undefined);
    expect(decodeComponentState('not base64!')).to.equal(undefined);
    expect(decodeComponentState(btoa(encodeURIComponent('[1,2]')))).to.equal(undefined);
    // the legacy unencoded format is not supported
    expect(decodeComponentState('{zoom:3}')).to.equal(undefined);
  });

  it('serializes and parses the states of several components', () => {
    const states = { map: state, table: { currentPage: 2 }, empty: {} };
    const serialized = serializeStates(states);
    expect(serialized.split('&')).to.have.length(2);
    expect(parseStatesParam(serialized)).to.deep.equal({ map: state, table: { currentPage: 2 } });
  });

  it('skips parts that cannot be decoded', () => {
    const value = `table=${encodeComponentState({ currentPage: 1 })}&broken=xxx&noValue`;
    expect(parseStatesParam(value)).to.deep.equal({ table: { currentPage: 1 } });
    expect(parseStatesParam(null)).to.deep.equal({});
  });

  it('parses the states and the state id of a URL', () => {
    const url = withStatesParam('/resource/:test?uri=x&stateId=0b6c9a4e', { map: { zoom: 3 } });
    const parsed = parseAppStateUrl(url);
    expect(parsed.url.pathname).to.equal('/resource/:test');
    expect(parsed.url.searchParams.get('uri')).to.equal('x');
    expect(parsed.states).to.deep.equal({ map: { zoom: 3 } });
    expect(parsed.stateId).to.equal('0b6c9a4e');
    expect(parseAppStateUrl('/resource/:test').states).to.equal(undefined);
  });

  it('removes the states parameter when there is no state', () => {
    const url = withStatesParam('/resource/:test?states=a%3Db&x=1', { map: {} });
    expect(new URL(url).searchParams.has('states')).to.equal(false);
    expect(new URL(url).searchParams.get('x')).to.equal('1');
  });

  it('parses shared-state-vars', () => {
    expect(parseSharedStateVars('a, b,,a ')).to.deep.equal(['a', 'b']);
    expect(parseSharedStateVars(['x', 'y'])).to.deep.equal(['x', 'y']);
    expect(parseSharedStateVars(undefined)).to.deep.equal([]);
  });
});
