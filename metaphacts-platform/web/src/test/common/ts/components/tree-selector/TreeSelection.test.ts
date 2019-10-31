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

import { TreeSelection } from 'platform/components/semantic/lazy-tree';

import { FOREST, toUnorderedJSON } from './Forests';

describe('TreeSelection', () => {
  const empty = TreeSelection.empty(FOREST);

  it('selects and unselects one item', () => {
    const flowers = FOREST.getFirst('Flowers');
    const selection = TreeSelection.selectTerminal(empty, FOREST.getNodePath(flowers));

    expect(toUnorderedJSON(selection)).to.deep.equal({
      'Eucaryota': {
        'Plants': {
          'Seed plants': {
            'Flowers': null,
          },
        },
      },
    });

    const clearedSelection = TreeSelection.unselect(selection, flowers.key);
    expect(toUnorderedJSON(clearedSelection)).to.deep.equal({});
  });

  const getInsectsWormsAndFish = () => {
    const worms = TreeSelection.selectTerminal(empty,
      FOREST.getNodePath(FOREST.getFirst('Worms')));
    const insectsAndWorms = TreeSelection.selectTerminal(worms,
      FOREST.getNodePath(FOREST.getFirst('Insects')));
    const insectsWormsAndFish = TreeSelection.selectTerminal(insectsAndWorms,
      FOREST.getNodePath(FOREST.getFirst('Fish')));
    return insectsWormsAndFish;
  };

  it('selects multiple items', () => {
    expect(toUnorderedJSON(getInsectsWormsAndFish())).to.deep.equal({
      'Eucaryota': {
        'Animals': {
          'Invertebrates': {
            'Insects': null,
            'Worms': null,
          },
          'Vertibrates': {
            'Fish': null,
          },
        },
      },
    });
  });

  it('selects partially selected parent', () => {
    const insectsWormsAndVertibrates = TreeSelection.selectTerminal(
      getInsectsWormsAndFish(),
      FOREST.getNodePath(FOREST.getFirst('Vertibrates')));
    expect(toUnorderedJSON(insectsWormsAndVertibrates)).to.deep.equal({
      'Eucaryota': {
        'Animals': {
          'Invertebrates': {
            'Insects': null,
            'Worms': null,
          },
          'Vertibrates': null,
        },
      },
    });
  });

  it('unselects parent with multiple leafs', () => {
    const vertibrates = TreeSelection.unselect(getInsectsWormsAndFish(), 'Invertebrates');
    expect(toUnorderedJSON(vertibrates)).to.deep.equal({
      'Eucaryota': {
        'Animals': {
          'Vertibrates': {
            'Fish': null,
          },
        },
      },
    });
  });

  it('keep selection if trying to select child of a leaf', () => {
    const animals = TreeSelection.selectTerminal(empty,
      FOREST.getNodePath(FOREST.getFirst('Animals')));
    const mammals = TreeSelection.selectTerminal(animals,
      FOREST.getNodePath(FOREST.getFirst('Mammals')));
    expect(toUnorderedJSON(animals)).to.deep.equal(toUnorderedJSON(mammals));
  });

  it('unselects all nodes with same key', () => {
    const birds = FOREST.nodes.get('Birds').reduce(
      (selection, node) => TreeSelection.selectTerminal(
        selection, FOREST.getNodePath(node)),
      empty);

    expect(toUnorderedJSON(birds)).to.deep.equal({
      'Eucaryota': {
        'Animals': {
          'Vertibrates': {
            'Reptiles': {
              'Birds': null,
            },
            'Birds': null,
          },
        },
      },
    });

    const cleared = TreeSelection.unselect(birds, 'Birds');
    expect(toUnorderedJSON(cleared)).to.deep.equal({});
  });
});
