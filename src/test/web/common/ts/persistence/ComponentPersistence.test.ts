/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { expect } from 'chai';
import { Component, createElement, Props } from 'react';
import * as D from 'react-dom-factories';
import { cloneDeepWith } from 'lodash';

import { SemanticContext } from 'platform/api/components';
import { ComponentClassMetadata } from 'platform/api/module-loader';
import { DeserializedComponent, componentToGraph, graphToComponent } from 'platform/api/persistence';
import { Rdf } from 'platform/api/rdf';
import { TemplateScope } from 'platform/api/services/template';

interface TestProps extends Props<TestComponent> {
  array: number[];
  map?: { [key: string]: boolean };
  callback?: () => void;
}

class TestComponent extends Component<TestProps, {}> {}

function addComponentTag(componentClass: ComponentClassMetadata, tag: string) {
  componentClass.__htmlTag = tag;
}

addComponentTag(TestComponent as ComponentClassMetadata, 'mp-test');

describe('ComponentPersistence', () => {
  it('converts simple platform component to a graph and back', () => {
    const props: TestProps = {
      array: [1, 2, 3],
      map: {
        foo: true,
        'other:bar': false,
      },
      callback: () => {
        throw new Error("Shouldn't be called");
      },
    };
    const component = createElement(
      TestComponent,
      props,
      createElement(TestComponent, { array: [4, 5] }),
      createElement(TestComponent, { array: [6, 7] }, createElement(TestComponent, { array: [6] })),
      D.div({
        className: 'testDiv',
        style: { marginTop: 5 },
      })
    );
    const outerContext: SemanticContext = {
      semanticContext: {
        repository: 'assets',
      },
    };
    const { pointer, graph } = componentToGraph({
      component,
      componentRoot: Rdf.iri(''),
      semanticContext: outerContext.semanticContext,
    });
    const { component: result, context } = graphToComponent(pointer, graph);
    const expected: DeserializedComponent = {
      type: 'mp-test',
      props: {
        array: [1, 2, 3],
        map: {
          foo: true,
          'other:bar': false,
        },
        markupTemplateScope: null,
      },
      children: [
        {
          type: 'mp-test',
          props: {
            array: [4, 5],
            markupTemplateScope: null,
          },
          children: [],
        },
        {
          type: 'mp-test',
          props: {
            array: [6, 7],
            markupTemplateScope: null,
          },
          children: [
            {
              type: 'mp-test',
              props: {
                array: [6],
                markupTemplateScope: null,
              },
              children: [],
            },
          ],
        },
        {
          type: 'div',
          props: {
            className: 'testDiv',
            style: { marginTop: 5 },
          },
          children: [],
        },
      ],
    };

    const resultWithoutTemplateScopes = excludeTemplateScopes(result);
    expect(resultWithoutTemplateScopes).to.be.deep.equals(expected);
    expect(context).to.be.deep.equals(outerContext);
  });
});

function excludeTemplateScopes(component: DeserializedComponent): DeserializedComponent {
  return cloneDeepWith(component, (value) => {
    if (typeof value === 'object' && value instanceof TemplateScope) {
      return null;
    }
  });
}
