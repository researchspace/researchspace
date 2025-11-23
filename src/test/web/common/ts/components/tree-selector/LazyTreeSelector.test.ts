import { createElement } from 'react';
import * as D from 'react-dom-factories';
import { render, screen } from '@testing-library/react';
import { expect, assert } from 'chai';
import * as sinon from 'sinon';
import { assign } from 'lodash';

import { SingleFullSubtree, LazyTreeSelector, LazyTreeSelectorProps } from 'platform/components/semantic/lazy-tree';

import { Node, FOREST } from './Forests';

describe('LazyTreeSelector', () => {
  const baseProps: LazyTreeSelectorProps<Node> = {
    style: { width: '800px', height: '800px' },
    selectionMode: SingleFullSubtree<Node>(),
    forest: FOREST,
    isLeaf: (node) => node.children === undefined,
    childrenOf: (node) => ({ children: node.children, hasMoreItems: node.hasMoreChildren }),
    requestMore: () => {
      /* nothing */
    },
    renderItem: (node) => D.div({ className: 'tree-node' }, node.key),
    isExpanded: (node) => node.isExpanded,
    onExpandedOrCollapsed: (node, expanded) => {
      /* ignore for test */
    },
  };

  it('renders tree', () => {
    render(createElement(LazyTreeSelector, baseProps));
    const bacteria = screen.getByText('Bacteria');
    assert(bacteria);
  });
});
