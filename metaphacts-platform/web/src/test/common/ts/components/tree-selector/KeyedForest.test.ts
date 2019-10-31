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

import { expect } from 'chai';
import { List } from 'immutable';

import { KeyedForest } from 'platform/components/semantic/lazy-tree';

import { Node, node, cloneSubtree } from './Forests';

describe('KeyedForest', () => {
  const bar1 = node('bar',
    node('baz'),
    node('bazz'));
  const bar2 = node('bar',
    node('foo'));

  const roots: ReadonlyArray<Node> = [
    node('first',
      bar1,
      node('quax'),
      node('frob',
        node('frob.1',
          node('child1'),
          node('child2')),
        node('frob.2'),
        node('frob.3'))),
    node('second'),
    node('third',
      bar2),
  ];

  const forest = KeyedForest.create(item => item.key, {key: 'root', children: roots});

  it('builds key mappings with duplicate keys', () => {
    const bars = forest.nodes.get('bar').toArray();
    expect(bars.length).to.be.equal(2);
    expect(bars).to.include(bar1);
    expect(bars).to.include(bar2);
  });

  it('builds parent mappings', () => {
    const parent = forest.getFirst('frob');
    const child = forest.getFirst('frob.3');
    expect(forest.getParent(child)).to.be.equal(parent);
  });

  it('reconcile after node updates', () => {
    const changedSubChild = node('frob.1',
      // swap children of frob.1
      cloneSubtree(forest, 'child2'),
      cloneSubtree(forest, 'child1')
    );

    const updated = forest.updateNode(['third'], item =>
      node('frob',
        changedSubChild,
        cloneSubtree(forest, 'frob.2'),
        cloneSubtree(forest, 'frob.3')
      ));

    it('updates mappings', () => {
      const nodes = updated.nodes.get('frob.1').toArray();
      expect(nodes.length).to.be.equal(1);
      expect(nodes).to.include(changedSubChild);
    });
  });
});
