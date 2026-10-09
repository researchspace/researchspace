/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { assert } from 'chai';
import { MultiDirectedGraph } from 'graphology';
import {
  getGraphStorageKey,
  saveStateIntoLocalStorage,
  getStateFromLocalStorage,
  clearStateFromLocalStorage,
} from 'platform/components/semantic/sigma-graph/Common';

describe('Sigma graph persistence', () => {
  let first: string;
  let second: string;
  let graph: MultiDirectedGraph;
  beforeEach(() => {
    const id = 'sigma-test-' + Math.random();
    first = getGraphStorageKey(id + '-first', 'query', { repository: 'default' });
    second = getGraphStorageKey(id + '-second', 'query', { repository: 'default' });
    graph = new MultiDirectedGraph();
    graph.addNode('a', { x: 3, y: 7 });
  });
  afterEach(() => {
    clearStateFromLocalStorage(first);
    clearStateFromLocalStorage(second);
  });
  it('stores instances separately, including their positions', () => {
    saveStateIntoLocalStorage(graph, first);
    graph.setNodeAttribute('a', 'x', 99);
    saveStateIntoLocalStorage(graph, second);
    assert.equal(getStateFromLocalStorage(first).getNodeAttribute('a', 'x'), 3);
    assert.equal(getStateFromLocalStorage(second).getNodeAttribute('a', 'x'), 99);
  });
  it('resets only the selected instance', () => {
    saveStateIntoLocalStorage(graph, first);
    saveStateIntoLocalStorage(graph, second);
    clearStateFromLocalStorage(first);
    assert.isNull(getStateFromLocalStorage(first));
    assert.isNotNull(getStateFromLocalStorage(second));
  });
  it('does not delete another graph when no saved state matches', () => {
    saveStateIntoLocalStorage(graph, first);
    assert.isNull(getStateFromLocalStorage(second));
    assert.isNotNull(getStateFromLocalStorage(first));
  });
  it('scopes state by query and repository as well as component id', () => {
    assert.notEqual(
      getGraphStorageKey('same', 'a', { repository: 'one' }),
      getGraphStorageKey('same', 'b', { repository: 'one' })
    );
    assert.notEqual(
      getGraphStorageKey('same', 'a', { repository: 'one' }),
      getGraphStorageKey('same', 'a', { repository: 'two' })
    );
  });
  it('clears a corrupt entry without removing another instance', () => {
    localStorage.setItem(first, 'invalid graph');
    saveStateIntoLocalStorage(graph, second);
    assert.isNull(getStateFromLocalStorage(first));
    assert.isNotNull(getStateFromLocalStorage(second));
  });
  it('reloads older grouped snapshots instead of restoring relationships already lost by grouping', () => {
    const fresh = getGraphStorageKey('grouped', 'query', {}, { enabled: true, threshold: 3 });
    const previous = getGraphStorageKey('grouped', 'query', {});
    assert.notEqual(fresh, previous);
    saveStateIntoLocalStorage(graph, previous);
    try {
      assert.isNull(getStateFromLocalStorage(fresh));
      assert.isNotNull(getStateFromLocalStorage(previous), 'leave the old snapshot untouched');
    } finally {
      clearStateFromLocalStorage(previous);
    }
  });
  it('isolates grouping configurations while retaining existing non-grouped storage keys', () => {
    const key = (grouping?) => getGraphStorageKey('grouped', 'query', {}, grouping);
    assert.equal(key(), key({ enabled: false }));
    assert.equal(key({ enabled: true }), key({ enabled: true, threshold: 3 }));
    assert.notEqual(key({ enabled: true, threshold: 3 }), key({ enabled: true, threshold: 5 }));
    assert.notEqual(key({ enabled: true, behaviour: 'expand' }), key({ enabled: true, behaviour: 'replace' }));
  });
});
