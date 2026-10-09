/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
import { assert } from 'chai';
import * as sinon from 'sinon';
import { MultiDirectedGraph } from 'graphology';
import { GraphLayoutRunner, ContinuousLayout } from 'platform/components/semantic/sigma-graph/GraphLayoutRunner';

describe('Sigma GraphLayoutRunner', () => {
  let graph: MultiDirectedGraph;
  let clock: sinon.SinonFakeTimers;
  let runners: GraphLayoutRunner[];
  let created: Array<{ layout: ContinuousLayout; start: sinon.SinonSpy; kill: sinon.SinonSpy; order: number }>;
  const makeRunner = (duration = 10000, limit = 500) => {
    const runner = new GraphLayoutRunner(
      graph,
      () => {
        /* UI projection */
      },
      { layoutRunDuration: duration, maxForceNodes: limit },
      (layout, currentGraph) => {
        const supervisor = { layout, start: sinon.spy(), kill: sinon.spy(), order: currentGraph.order };
        created.push(supervisor);
        return supervisor;
      }
    );
    runners.push(runner);
    return runner;
  };
  beforeEach(() => {
    graph = new MultiDirectedGraph();
    graph.addNode('a', { x: 0, y: 0 });
    graph.addNode('b', { x: 1, y: 1 });
    created = [];
    runners = [];
    clock = sinon.useFakeTimers();
  });
  afterEach(() => {
    runners.forEach((runner) => runner.dispose());
    clock.restore();
  });

  it('starts on the first command and stops immediately', () => {
    const runner = makeRunner();
    runner.apply('force');
    assert.equal(created.length, 1);
    assert.isTrue(created[0].start.calledOnce);
    assert.equal(runner.getSnapshot().runningLayout, 'force');
    runner.stop();
    assert.isTrue(created[0].kill.calledOnce);
    assert.isUndefined(runner.getSnapshot().activeLayout);
  });
  it('does not resume after explicit Stop, even with an older drag token', () => {
    const runner = makeRunner();
    runner.apply('force');
    const drag = runner.pause();
    runner.stop();
    runner.resume(drag);
    runner.mutate(() => graph.addNode('c', { x: 2, y: 2 }));
    assert.equal(created.length, 1);
    assert.isUndefined(runner.getSnapshot().runningLayout);
  });
  it('does not let an old pause resume a newer layout', () => {
    const runner = makeRunner();
    runner.apply('force');
    const old = runner.pause();
    runner.apply('forceAtlas2');
    runner.resume(old);
    assert.equal(created.length, 2);
    assert.equal(runner.getSnapshot().runningLayout, 'forceAtlas2');
  });
  it('resumes only after every nested pause has finished', () => {
    const runner = makeRunner();
    runner.apply('force');
    const drag = runner.pause();
    const mutation = runner.pause();
    runner.resume(mutation);
    assert.equal(created.length, 1);
    runner.resume(drag);
    assert.equal(created.length, 2);
    runner.resume(drag);
    assert.equal(created.length, 2);
  });
  it('destroys the supervisor before mutations and infers from the new graph', () => {
    const runner = makeRunner();
    runner.apply('forceAtlas2');
    runner.mutate(() => {
      assert.isTrue(created[0].kill.calledOnce);
      graph.addNode('c', { x: 2, y: 2 });
    });
    assert.equal(created[1].order, 3);
    assert.equal(runner.getSnapshot().runningLayout, 'forceAtlas2');
  });
  it('uses the currently applied layout when a delayed result is merged', () => {
    const runner = makeRunner();
    runner.apply('circular');
    const completedQuery = () => runner.mutate(() => graph.addNode('c', { x: 2, y: 2 }));
    runner.apply('forceAtlas2');
    completedQuery();
    assert.equal(runner.getSnapshot().appliedLayout, 'forceAtlas2');
    assert.equal(created[1].layout, 'forceAtlas2');
  });
  it('retains the active-time budget across pauses', () => {
    const runner = makeRunner(100);
    runner.apply('force');
    clock.tick(40);
    const drag = runner.pause();
    clock.tick(1000);
    runner.resume(drag);
    clock.tick(59);
    assert.equal(runner.getSnapshot().runningLayout, 'force');
    clock.tick(1);
    assert.isUndefined(runner.getSnapshot().activeLayout);
    assert.isTrue(created[1].kill.calledOnce);
  });
  it('renews the run on a node click without replacing its supervisor', () => {
    const runner = makeRunner(100);
    runner.apply('forceAtlas2');
    clock.tick(80);
    runner.explore();
    assert.equal(created.length, 1);
    assert.isFalse(created[0].kill.called);
    clock.tick(99);
    assert.equal(runner.getSnapshot().runningLayout, 'forceAtlas2');
    clock.tick(1);
    assert.isTrue(created[0].kill.calledOnce);
  });
  it('restarts the applied continuous layout on the next deliberate node click', () => {
    const runner = makeRunner();
    runner.apply('forceAtlas2');
    runner.stop();
    runner.explore();
    assert.equal(created.length, 2);
    assert.equal(runner.getSnapshot().runningLayout, 'forceAtlas2');
  });
  it('gives a delayed expansion a fresh run after the previous run expired', () => {
    const runner = makeRunner(100);
    runner.apply('forceAtlas2');
    const exploration = runner.explore();
    clock.tick(200);
    assert.isUndefined(runner.getSnapshot().runningLayout);
    runner.mutate(() => graph.addNode('c', { x: 2, y: 2 }), exploration);
    assert.equal(created[1].order, 3);
    assert.equal(runner.getSnapshot().runningLayout, 'forceAtlas2');
    assert.isUndefined(runner.getSnapshot().message);
    clock.tick(99);
    assert.equal(runner.getSnapshot().runningLayout, 'forceAtlas2');
    clock.tick(1);
    assert.isUndefined(runner.getSnapshot().runningLayout);
  });
  it('honours explicit Stop when an earlier expansion finishes', () => {
    const runner = makeRunner(100);
    runner.apply('forceAtlas2');
    const exploration = runner.explore();
    runner.stop();
    runner.mutate(() => graph.addNode('c', { x: 2, y: 2 }), exploration);
    assert.equal(graph.order, 3);
    assert.equal(created.length, 1);
    assert.isUndefined(runner.getSnapshot().activeLayout);
  });
  it('does not renew a different layout from an older exploration', () => {
    const runner = makeRunner(100);
    runner.apply('forceAtlas2');
    const exploration = runner.explore();
    runner.apply('force');
    clock.tick(80);
    runner.mutate(() => graph.addNode('c', { x: 2, y: 2 }), exploration);
    assert.equal(runner.getSnapshot().runningLayout, 'force');
    clock.tick(20);
    assert.isUndefined(runner.getSnapshot().runningLayout);
  });
  it('starts only one supervisor after a synchronous group expansion', () => {
    const runner = makeRunner();
    runner.apply('forceAtlas2');
    runner.stop();
    runner.explore(() => {
      assert.equal(created.length, 1);
      graph.addNode('c', { x: 2, y: 2 });
    });
    assert.equal(created.length, 2);
    assert.equal(created[1].order, 3);
  });
  it('leaves static layouts static during exploration', () => {
    const runner = makeRunner();
    runner.apply('circular');
    const exploration = runner.explore();
    runner.mutate(() => graph.addNode('c', { x: 2, y: 2 }), exploration);
    assert.equal(created.length, 0);
    assert.equal(runner.getSnapshot().appliedLayout, 'circular');
    assert.isUndefined(runner.getSnapshot().activeLayout);
  });
  it('defers exploration of a hidden graph until it becomes visible', () => {
    const runner = makeRunner(100);
    runner.apply('forceAtlas2');
    runner.stop();
    runner.setVisible(false);
    runner.explore(() => graph.addNode('c', { x: 2, y: 2 }));
    clock.tick(1000);
    assert.equal(created.length, 1);
    runner.setVisible(true);
    assert.equal(created[1].order, 3);
    clock.tick(99);
    assert.equal(runner.getSnapshot().runningLayout, 'forceAtlas2');
  });
  it('waits for an active drag before running an expansion with a fresh budget', () => {
    const runner = makeRunner(100);
    runner.apply('forceAtlas2');
    const exploration = runner.explore();
    clock.tick(80);
    const drag = runner.pause();
    runner.mutate(() => graph.addNode('c', { x: 2, y: 2 }), exploration);
    assert.equal(created.length, 1);
    runner.resume(drag);
    clock.tick(99);
    assert.equal(runner.getSnapshot().runningLayout, 'forceAtlas2');
  });
  it('preserves restored positions until exploration resumes the configured layout', () => {
    const runner = makeRunner();
    runner.apply('forceAtlas2', true);
    assert.equal(created.length, 0);
    assert.deepEqual(graph.getNodeAttributes('b'), { x: 1, y: 1 });
    assert.equal(runner.getSnapshot().appliedLayout, 'forceAtlas2');
    runner.explore();
    assert.equal(created.length, 1);
    assert.equal(runner.getSnapshot().runningLayout, 'forceAtlas2');
  });
  it('does not start hidden graphs and respects Stop while hidden', () => {
    const runner = makeRunner();
    runner.setVisible(false);
    runner.apply('force');
    assert.equal(created.length, 0);
    runner.setVisible(true);
    assert.equal(created.length, 1);
    runner.setVisible(false);
    runner.stop();
    runner.setVisible(true);
    assert.equal(created.length, 1);
  });
  it('switches oversized Force graphs to ForceAtlas2', () => {
    const runner = makeRunner(10000, 1);
    runner.apply('force');
    assert.equal(created[0].layout, 'forceAtlas2');
    assert.equal(runner.getSnapshot().appliedLayout, 'forceAtlas2');
  });
  it('keeps graph instances independent', () => {
    const first = makeRunner();
    const second = makeRunner();
    first.apply('force');
    second.apply('forceAtlas2');
    first.stop();
    assert.isFalse(created[1].kill.called);
    assert.equal(second.getSnapshot().runningLayout, 'forceAtlas2');
  });
  it('starts no supervisor for empty graphs or after disposal', () => {
    graph.clear();
    const runner = makeRunner();
    runner.apply('forceAtlas2');
    runner.dispose();
    graph.addNode('a', { x: 0, y: 0 });
    runner.apply('force');
    runner.explore(() => assert.fail('Cannot mutate a disposed graph'));
    assert.equal(created.length, 0);
  });
  it('kills supervisors and timers on disposal', () => {
    const runner = makeRunner(100);
    runner.apply('force');
    const supervisor = created[0];
    runner.dispose();
    clock.tick(1000);
    assert.isTrue(supervisor.kill.calledOnce);
    assert.equal(created.length, 1);
  });
});
