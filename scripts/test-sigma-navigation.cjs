/**
 * Copyright (c) 2026 ResearchSpace contributors.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Run with: node scripts/test-sigma-navigation.cjs
 * Uses the installed React 17 test renderer and TypeScript compiler. Sigma's
 * WebGL renderer and the FA2 supervisor are test doubles; graph data, components,
 * search/camera hooks, filter reducers and the Force supervisor use real code.
 * Import shims are limited to this standalone test process.
 */
const fs = require('fs'),
  path = require('path'),
  Module = require('module'),
  assert = require('assert');
const { EventEmitter } = require('events');
const root = path.resolve(__dirname, '..'),
  req = Module.createRequire(path.join(root, 'package.json'));
const React = req('react'),
  { create, act } = req('@wojtekmaj/enzyme-adapter-react-17/node_modules/react-test-renderer');
const ts = req('typescript'),
  Kefir = req('kefir');
const context = React.createContext(null),
  frames = new Map(),
  timers = new Map(),
  requests = new Map(),
  requestContexts = new Map(),
  requestQueries = new Map(),
  requestCalls = [],
  workers = new Set();
let nextFrame = 0,
  nextTimer = 0,
  mounts = 0,
  unmounts = 0,
  sigma;
global.window = {
  setTimeout: (callback) => {
    timers.set(++nextTimer, callback);
    return nextTimer;
  },
  clearTimeout: (id) => timers.delete(id),
  addEventListener() {},
  removeEventListener() {},
  requestAnimationFrame: (f) => {
    frames.set(++nextFrame, f);
    return nextFrame;
  },
  cancelAnimationFrame: (id) => frames.delete(id),
};
global.document = { addEventListener() {}, removeEventListener() {} };
const core = {
  useSigma: () => React.useContext(context),
  useSetSettings: () => {
    const s = React.useContext(context);
    return React.useCallback((settings) => Object.assign(s.settings, settings), [s]);
  },
  ControlsContainer: ({ children }) => React.createElement('div', null, children),
  SigmaContainer: ({ graph, children }) => {
    const [s] = React.useState(() => {
      const camera = Object.assign(new EventEmitter(), {
        animatedReset() {
          this.resets++;
        },
        resets: 0,
        animatedZoom() {},
        animatedUnzoom() {},
        animate() {
          this.focuses++;
        },
        focuses: 0,
      });
      const captor = new EventEmitter(),
        container = {
          ownerDocument: { hidden: false, defaultView: {}, addEventListener() {}, removeEventListener() {} },
          getClientRects: () => [{}],
        };
      return Object.assign(new EventEmitter(), {
        settings: {},
        graph,
        camera,
        bbox: null,
        getGraph: () => graph,
        getContainer: () => container,
        getCamera: () => camera,
        getMouseCaptor: () => captor,
        getTouchCaptor: () => captor,
        getSettings() {
          return this.settings;
        },
        getCustomBBox() {
          return this.bbox;
        },
        setCustomBBox(v) {
          this.bbox = v;
        },
        getBBox: () => ({ x: [0, 1], y: [0, 1] }),
        getNodeDisplayData: (n) => graph.getNodeAttributes(n),
        scheduleRefresh() {},
      });
    });
    React.useEffect(() => {
      mounts++;
      sigma = s;
      return () => {
        unmounts++;
      };
    }, [s]);
    return React.createElement(context.Provider, { value: s }, children);
  },
};
const original = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@react-sigma/core') return core;
  if (parent?.filename.includes('/@react-sigma/core/lib/') && /\/use(Sigma|SetSettings)$/.test(request)) {
    return request.endsWith('/useSigma') ? { useSigma: core.useSigma } : { useSetSettings: core.useSetSettings };
  }
  if (request === 'platform/api/components') return { Component: React.Component };
  if (request === 'platform/api/events')
    return {
      EventMaker: (t) => t,
      BuiltInEvents: { ComponentLoaded: 'loaded' },
      trigger() {},
      listen: () => Kefir.never(),
    };
  if (request === 'platform/components/ui/notification') return { ErrorNotification: () => null, addNotification() {} };
  if (request === 'platform/components/ui/spinner') return { Spinner: () => null };
  if (request === 'platform/components/semantic/graph/GraphInternals')
    return {
      getGraphDataWithLabels: ({ query }, { context: queryContext }) => {
        const key = queryContext?.bindings?.subject?.toString() || query;
        requestContexts.set(key, queryContext);
        requestQueries.set(key, query);
        requestCalls.push({ key, query, context: queryContext });
        return Kefir.stream((emitter) => {
          requests.set(key, emitter);
          return () => requests.delete(key);
        });
      },
    };
  if (request === 'platform/api/async') request = path.join(root, 'src/main/web/api/async/Cancellation.ts');
  if (request === 'sigma/rendering/webgl/programs/node.image') return () => class {};
  if (request === './programs/edge.arrow') return class {};
  if (request === './ControlPanel') return { Panel: ({ children }) => React.createElement('div', null, children) };
  if (request === 'graphology-layout-forceatlas2/worker')
    return class {
      start() {
        workers.add(this);
      }
      kill() {
        workers.delete(this);
      }
    };
  if (request.endsWith('.css')) return {};
  if (request.startsWith('platform/')) request = path.join(root, 'src/main/web', request.slice('platform/'.length));
  return original.call(this, request, parent, isMain);
};
for (const ext of ['.ts', '.tsx'])
  require.extensions[ext] = (m, f) =>
    m._compile(
      ts.transpileModule(fs.readFileSync(f, 'utf8'), {
        fileName: f,
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2016,
          jsx: ts.JsxEmit.React,
          esModuleInterop: true,
        },
      }).outputText,
      f
    );
const coreDir = path.join(root, 'node_modules/@react-sigma/core/lib');
core.useCamera = req(path.join(coreDir, 'hooks/useCamera.js')).useCamera;
core.useRegisterEvents = req(path.join(coreDir, 'hooks/useRegisterEvents.js')).useRegisterEvents;
const SigmaGraph = require(path.join(root, 'src/main/web/components/semantic/sigma-graph/SigmaGraph.tsx')).default;
const nodeQuery = 'CONSTRUCT { ?subject <http://example.org/label> ?subjectLabel } WHERE { ?subject <http://example.org/label> ?subjectLabel }';
let tree;
act(() => {
  tree = create(
    React.createElement(SigmaGraph, {
      id: 'nav',
      query: 'initial',
      nodeQuery,
      controls: true,
      edgeFilter: true,
      searchBox: true,
      layoutRunDuration: 0,
    })
  );
});
act(() => {
  requests.get('initial').emit([
    { group: 'nodes', data: { id: '<a>', label: 'Alice' } },
    { group: 'nodes', data: { id: '<b>', label: 'Bob' } },
    { group: 'nodes', data: { id: '<c>', label: 'Carol' } },
    { group: 'edges', data: { id: 'ab', source: '<a>', target: '<b>', label: 'knows' } },
    { group: 'edges', data: { id: 'bc', source: '<b>', target: '<c>', label: 'member' } },
  ]);
});
assert.equal(mounts, 1);
const button = (title) => tree.root.findAllByType('button').find((b) => b.props.title === title);
act(() =>
  tree.root
    .findAllByType('button')
    .find((b) => b.props['aria-label'] === 'Choose graph layout')
    .props.onClick()
);
const positions = () =>
  sigma.graph.nodes().map((n) => [n, sigma.graph.getNodeAttribute(n, 'x'), sigma.graph.getNodeAttribute(n, 'y')]);
const input = () => tree.root.findAllByType('input').find((n) => n.props.type === 'text');
const filter = () =>
  tree.root.findAllByType('input').find((n) => n.props.type === 'checkbox' && n.props.value === 'knows');
for (const layout of ['circlepack', 'random', 'noverlap', 'force', 'forceAtlas2', 'circular']) {
  act(() => tree.root.findByType('select').props.onChange({ target: { value: layout } }));
  act(() =>
    button(['force', 'forceAtlas2'].includes(layout) ? 'Start or restart layout' : 'Apply layout').props.onClick()
  );
  const before = positions(),
    graph = sigma.graph,
    frameIds = [...frames.keys()],
    workerIds = [...workers];
  act(() => input().props.onChange({ target: { value: 'Al' } }));
  act(() => input().props.onChange({ target: { value: 'Alice' } }));
  assert.equal(sigma.graph.getNodeAttribute('<a>', 'highlighted'), true);
  act(() => filter().props.onChange({ target: { value: 'knows', checked: false } }));
  assert.equal(sigma.settings.edgeReducer('ab', sigma.graph.getEdgeAttributes('ab')).hidden, true);
  sigma.bbox = { x: [0, 100], y: [0, 100] };
  const resets = sigma.camera.resets;
  act(() => button('See whole graph').props.onClick());
  assert.equal(sigma.camera.resets, resets + 1);
  assert.equal(sigma.bbox, null);
  assert.equal(tree.root.findByType('select').props.value, layout);
  assert.equal(input().props.value, 'Alice');
  assert.equal(filter().props.checked, false);
  assert.deepEqual(positions(), before);
  assert.equal(sigma.graph, graph);
  assert.deepEqual([...frames.keys()], frameIds);
  assert.deepEqual([...workers], workerIds);
  assert.equal(mounts, 1);
  assert.equal(unmounts, 0);
  act(() => filter().props.onChange({ target: { value: 'knows', checked: true } }));
  console.log(`PASS ${layout}: real search/filter/camera controls preserve layout, positions and supervisor`);
}
act(() => tree.root.findByType('select').props.onChange({ target: { value: 'forceAtlas2' } }));
act(() => button('Start or restart layout').props.onClick());
act(() => button('Stop layout').props.onClick());
act(() => input().props.onChange({ target: { value: 'Bo' } }));
act(() => input().props.onChange({ target: { value: 'Bob' } }));
act(() => filter().props.onChange({ target: { value: 'knows', checked: false } }));
act(() => button('See whole graph').props.onClick());
assert.equal(workers.size, 0);
assert.equal(frames.size, 0);
console.log('PASS search/filter/camera controls preserve explicit Stop');
act(() => {
  sigma.emit('clickNode', { node: '<a>' });
});
assert(requests.has('<a>'));
assert.equal(requestQueries.get('<a>'), nodeQuery);
assert.equal(requestContexts.get('<a>').bindings.subject.value, 'a');
const callsBeforeRepeatedClicks = requestCalls.length;
act(() => {
  sigma.emit('clickNode', { node: '<a>' });
  sigma.emit('clickNode', { node: '<a>' });
  sigma.emit('clickNode', { node: '<b>' });
});
assert.equal(requestCalls.length, callsBeforeRepeatedClicks + 1);
assert(requests.has('<a>') && requests.has('<b>'));
assert.equal(requestQueries.get('<b>'), nodeQuery);
assert.equal(requestContexts.get('<b>').bindings.subject.value, 'b');
act(() => { requests.get('<b>').end(); });
console.log('PASS node queries retain their template, bind distinct subjects and deduplicate repeated clicks');
act(() => button('See whole graph').props.onClick());
assert(requests.has('<a>'));
act(() => {
  requests.get('<a>').emit([{ group: 'nodes', data: { id: '<new>', label: 'New neighbour' } }]);
});
assert(sigma.graph.hasNode('<new>'));
assert.equal(tree.root.findByType('select').props.value, 'forceAtlas2');
act(() => button('See whole graph').props.onClick());
assert(sigma.graph.hasNode('<new>'));
assert.equal(mounts, 1);
console.log('PASS whole-graph navigation preserves pending queries and expanded nodes');

const editSearch = (value) => act(() => input().props.onChange({ target: { value } }));
const flushSearchUpdates = () =>
  act(() => {
    for (const [id, callback] of [...timers]) {
      timers.delete(id);
      callback();
    }
  });
const pressSearchKey = (key, isComposing = false) => {
  let prevented = 0,
    stopped = 0;
  act(() =>
    input().props.onKeyDown({
      key,
      keyCode: isComposing ? 229 : 0,
      nativeEvent: { isComposing },
      currentTarget: { value: input().props.value },
      preventDefault() {
        prevented++;
      },
      stopPropagation() {
        stopped++;
      },
    })
  );
  return { prevented, stopped };
};
flushSearchUpdates();
const navigationState = { graph: sigma.graph, workers: [...workers], mounts, resets: sigma.camera.resets };
for (const value of ['', '   ', 'Alice', '', 'Bob', 'No matching node', '']) {
  editSearch(value);
  assert.deepEqual(pressSearchKey('Enter'), { prevented: 1, stopped: 1 });
}
assert.equal(sigma.graph, navigationState.graph);
assert.deepEqual([...workers], navigationState.workers);
assert.equal(mounts, navigationState.mounts);
assert.equal(sigma.camera.resets, navigationState.resets);
assert.equal(tree.root.findByType('select').props.value, 'forceAtlas2');
console.log('PASS empty/whitespace/unmatched Enter and repeated edits do not submit, remount or reset the layout');

editSearch('Alice');
assert.equal(sigma.graph.getNodeAttribute('<a>', 'highlighted'), true);
editSearch('Bob');
assert.equal(sigma.graph.getNodeAttribute('<a>', 'highlighted'), false);
assert.equal(sigma.graph.getNodeAttribute('<b>', 'highlighted'), true);
pressSearchKey('Escape');
assert.equal(input().props.value, '');
assert.equal(sigma.graph.getNodeAttribute('<b>', 'highlighted'), false);
assert.deepEqual(pressSearchKey('Enter', true), { prevented: 0, stopped: 0 });
editSearch('Bob');
act(() => {
  sigma.emit('clickStage', {});
});
assert.equal(input().props.value, '');
assert.equal(sigma.graph.getNodeAttribute('<b>', 'highlighted'), false);
console.log('PASS selection changes, Escape, stage click and IME composition');

editSearch('Carol');
act(() => {
  sigma.graph.dropNode('<c>');
});
editSearch('');
pressSearchKey('Enter');
flushSearchUpdates();
assert.equal(input().props.value, '');
console.log('PASS editing/clearing search after the selected node is removed (original crash)');

act(() => {
  sigma.graph.addNode('<stale>', { label: 'Stale result', x: 0, y: 0 });
});
editSearch('Stale');
assert(tree.root.findAllByType('option').some((o) => o.props.value === 'Stale result'));
act(() => {
  sigma.graph.dropNode('<stale>');
});
editSearch('Stale result');
assert.equal(tree.root.findAllByType('option').filter((o) => o.props.value === 'Stale result').length, 0);
for (const [id, label] of [
  ['number', 42],
  ['object', { value: 'Label' }],
  ['missing', undefined],
  ['null', null],
]) {
  act(() => {
    sigma.graph.addNode(id, { label, x: 0, y: 0 });
  });
}
editSearch('Al');
assert(tree.root.findAllByType('option').some((o) => o.props.value === 'Alice'));
flushSearchUpdates();
console.log('PASS stale suggestions and non-string/missing labels are safe');

const originalForEachNode = sigma.graph.forEachNode;
let searchScans = 0;
sigma.graph.forEachNode = function (...args) {
  searchScans++;
  return originalForEachNode.apply(this, args);
};
editSearch('Neighbour');
const scansBefore = searchScans;
act(() => {
  for (let i = 0; i < 20; i++) sigma.graph.addNode('batch-' + i, { label: 'Neighbour ' + i, x: i, y: i });
});
assert.equal(timers.size, 1);
flushSearchUpdates();
assert.equal(searchScans, scansBefore + 1);
assert.equal(
  tree.root.findAllByType('option').filter((o) => String(o.props.value).startsWith('Neighbour ')).length,
  20
);
const scansAfterExpansion = searchScans;
act(() => {
  sigma.graph.setNodeAttribute('<a>', 'x', 5);
  sigma.graph.mergeNodeAttributes('<b>', { x: 7, y: 9 });
  sigma.graph.updateEachNodeAttributes((_id, attributes) => ({ ...attributes, x: 10 }));
});
assert.equal(timers.size, 0);
assert.equal(searchScans, scansAfterExpansion);
sigma.graph.forEachNode = originalForEachNode;
console.log('PASS batched graph additions refresh suggestions once; layout coordinate updates do not scan the graph');

editSearch('Alice');
act(() => {
  sigma.graph.clear();
});
editSearch('');
pressSearchKey('Enter');
// Leave a refresh pending to verify that unmount cancels it.
assert.equal(timers.size, 1);
console.log('PASS clearing the graph while a search result is selected');
act(() => tree.unmount());
assert.equal(frames.size, 0);
assert.equal(workers.size, 0);
assert.equal(unmounts, 1);
assert.equal(requests.size, 0);
assert.equal(timers.size, 0);
assert.equal(sigma.graph.listenerCount('nodeAdded'), 0);
assert.equal(sigma.graph.listenerCount('nodeDropped'), 0);
assert.equal(sigma.graph.listenerCount('cleared'), 0);
assert.equal(sigma.listenerCount('clickStage'), 0);
console.log('PASS clean unmount after navigation');

// Exercise group expansion through the real click handler and layout controller.
for (const behaviour of ['replace', 'expand']) {
  act(() => {
    tree = create(React.createElement(SigmaGraph, {
      id: 'group-' + behaviour, query: 'group-query', controls: true,
      grouping: { enabled: true, threshold: 2, behaviour },
      layout: 'forceAtlas2', layoutRunDuration: 0,
    }));
  });
  act(() => { requests.get('group-query').emit([
    ...['a', 'b', 'c'].map(id => ({ group: 'nodes', data: { id: '<' + id + '>', label: id } })),
    ...[
      ['pb', '<b>', 'p'], ['pb2', '<b>', 'p'], ['pc', '<c>', 'p'],
      ['qb', '<b>', 'q'], ['qc', '<c>', 'q'],
    ].map(([id, target, predicate]) => ({
      group: 'edges', data: { id, source: '<a>', target, resource: predicate, label: id },
    })),
  ]); });
  const groupedNodes = sigma.graph.filterNodes((_node, attrs) => attrs.grouped);
  assert.equal(groupedNodes.length, 2);
  act(() => tree.root.findAllByType('button')
    .find(b => b.props['aria-label'] === 'Choose graph layout').props.onClick());
  act(() => button('Stop layout').props.onClick());
  assert.equal(workers.size, 0);
  for (const node of groupedNodes) {
    act(() => { sigma.emit('clickNode', { node }); });
    assert.equal(workers.size, 1, 'expansion restarts exactly one supervisor');
  }
  if (behaviour === 'replace') {
    assert.deepEqual(sigma.graph.edges().sort(), ['pb', 'pb2', 'pc', 'qb', 'qc']);
    assert.equal(sigma.graph.getEdgeAttribute('pb2', 'predicate'), 'p');
    assert.equal(sigma.graph.getEdgeAttribute('qb', 'predicate'), 'q');
  } else {
    assert.equal(sigma.graph.inEdges('<b>').length, 3);
    assert.equal(sigma.graph.inEdges('<c>').length, 2);
    assert(groupedNodes.every(node => sigma.graph.hasNode(node)));
  }
  act(() => tree.unmount());
  assert.equal(workers.size, 0);
  assert.equal(requests.size, 0);
  assert.equal(timers.size, 0);
  console.log(`PASS ${behaviour}: grouped-node clicks preserve parallel edges and restart the selected layout`);
}
