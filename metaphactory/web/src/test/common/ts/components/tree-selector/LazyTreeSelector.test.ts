/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import { createElement, DOM as D } from 'react';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { shallow } from 'enzyme';
import { assign } from 'lodash';

import {
  SingleFullSubtree, LazyTreeSelector, LazyTreeSelectorProps,
} from 'platform/components/semantic/lazy-tree';

import { Node, FOREST } from './Forests';

type Input = { new(props: LazyTreeSelectorProps<Node>): LazyTreeSelector<Node>; };
const Input = LazyTreeSelector;

describe('LazyTreeSelector', () => {
  const baseProps: LazyTreeSelectorProps<Node> = {
    selectionMode: SingleFullSubtree<Node>(),
    forest: FOREST,
    isLeaf: node => node.children === undefined,
    childrenOf: node => ({children: node.children}),
    requestMore: () => { /* nothing */ },
    renderItem: node => D.div({className: 'tree-node'}, node.key),
  };

  it('renders tree', () => {
    const treeInput = shallow(createElement(Input, baseProps));
    const bacteria = treeInput.findWhere(child => child.key() === 'Bacteria');
    expect(bacteria).to.has.lengthOf(1);
    expect(bacteria.text().indexOf('Bacteria') >= 0);
  });

  it('requests children on node expand', () => {
    const bacteriaNode = FOREST.getFirst('Bacteria');
    const forestWithoutBacteriaChildren = FOREST.updateNode(
      FOREST.getOffsetPath(bacteriaNode),
      node => ({key: node.key, children: undefined, hasMoreChildren: true}));

    const onRequestCallback = sinon.spy();
    const props = assign({}, baseProps, {
      forest: forestWithoutBacteriaChildren,
      requestMore: onRequestCallback,
    }) as LazyTreeSelectorProps<Node>;

    const treeInput = shallow(createElement(Input, props));
    treeInput.findWhere(child =>
      child.props().className === 'LazyTreeSelector--expandToggle' &&
      child.parents().someWhere(parent => parent.key() === 'Bacteria')
    ).simulate('click');
    expect(onRequestCallback.called).to.be.true;
  });
});
