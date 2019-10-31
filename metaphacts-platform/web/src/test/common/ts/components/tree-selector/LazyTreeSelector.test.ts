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

import { ReactElement, createElement } from 'react';
import * as D from 'react-dom-factories';
import { expect, assert } from 'chai';
import * as sinon from 'sinon';
import { assign } from 'lodash';

import { mount } from 'platform-tests/configuredEnzyme';

import {
  SingleFullSubtree, LazyTreeSelector, LazyTreeSelectorProps,
} from 'platform/components/semantic/lazy-tree';

import { Node, FOREST } from './Forests';

function whileMounted(element: ReactElement<any>, callback: (wrapper: any) => void) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const wrapper = mount(element, {attachTo: root});
  callback(wrapper);
  wrapper.unmount();
  root.remove();
}

describe('LazyTreeSelector', () => {
  const baseProps: LazyTreeSelectorProps<Node> = {
    style: {width: '800px', height: '800px'},
    selectionMode: SingleFullSubtree<Node>(),
    forest: FOREST,
    isLeaf: node => node.children === undefined,
    childrenOf: node => ({children: node.children, hasMoreItems: node.hasMoreChildren}),
    requestMore: () => { /* nothing */ },
    renderItem: node => D.div({className: 'tree-node'}, node.key),
    isExpanded: node => node.isExpanded,
    onExpandedOrCollapsed: (node, expanded) => {/* ignore for test */},
  };

  it('renders tree', () => {
    whileMounted(createElement(LazyTreeSelector, baseProps), treeInput => {
      const bacteria = treeInput.findWhere(child => child.text().indexOf('Bacteria') >= 0);
      assert(bacteria.length > 0);
    });
  });

  it('requests children on node expand', () => {
    const bacteriaNode = FOREST.getFirst('Bacteria');
    const forestWithoutBacteriaChildren = FOREST.updateNode(
      FOREST.getKeyPath(bacteriaNode),
      node => ({key: node.key, children: undefined, hasMoreChildren: true}));

    const onRequestCallback = sinon.spy();
    const props = assign({}, baseProps, {
      forest: forestWithoutBacteriaChildren,
      requestMore: onRequestCallback,
    }) as LazyTreeSelectorProps<Node>;

    const root = document.createElement('div');
    document.body.appendChild(root);

    whileMounted(createElement(LazyTreeSelector, props), treeInput => {
      const expandButton = treeInput.findWhere(child =>
        child.props().className === 'LazyTreeSelector--expandToggle' &&
        child.parents().someWhere(parent => parent.text() === 'Bacteria')
      );
      expandButton.simulate('click');
      assert(onRequestCallback.called);
    });
  });
});
