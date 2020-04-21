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

import { Rdf } from 'platform/api/rdf';
import { SparqlUtil } from 'platform/api/sparql';
import { TemplateScope, parseTemplate, ContextCapturer } from 'platform/api/services/template';

const MOCKED_REMOTE_TEMPLATES: { [iri: string]: string } = {
  'test:elephant': 'elephant and {{> test:lion}}',
  'test:mouse': 'mouse and {{> test:lion}}',
  'test:lion': 'lion!',
  'test:node': '{{name}}({{#each items}}{{> test:node}};{{/each}})',
};

describe('TemplateService', () => {
  SparqlUtil.init({ test: 'test:' });
  mockFetchRemoteTemplate();

  it('resolves registered partials and helpers', () => {
    const scope = TemplateScope.create({
      partials: {
        foo: '<div>{{#> bar this}}{{apple}}{{/bar}}</div>',
        bar: '<p>{{#bold}}~{{> @partial-block}}~{{/bold}}</p>',
      },
      helpers: {
        bold: function (options) {
          return `<b>${options.fn(this)}</b>`;
        },
      },
    });

    return scope.compile('{{> foo this}}').then((template) => {
      const rendered = template({ apple: 'berry' });
      expect(rendered).to.be.equal('<div><p><b>~berry~</b></p></div>');
    });
  });

  it('resolves remote templates', () => {
    const scope = TemplateScope.create({
      partials: { eagle: 'eagle and {{> test:elephant}}' },
    });
    return scope.compile('Remote: {{> eagle}}').then((template) => {
      const rendered = template({});
      expect(rendered).to.be.equal('Remote: eagle and elephant and lion!');
    });
  });

  it('resolves remote diamond-dependent templates', () => {
    const scope = TemplateScope.create();
    const source = 'Diamond: {{> test:elephant}}, {{> test:mouse}}';
    return scope.compile(source).then((template) => {
      const rendered = template({});
      expect(rendered).to.be.equal('Diamond: elephant and lion!, mouse and lion!');
    });
  });

  it('resolves remote recursive templates', () => {
    const scope = TemplateScope.create();
    return scope.compile('{{> test:node}}').then((template) => {
      const rendered = template({
        name: 'abc',
        items: [
          { name: 'def' },
          {
            name: 'ghi',
            items: [{ name: 'jkl' }, { name: 'mno' }],
          },
        ],
      });
      expect(rendered).to.be.equal('abc(def();ghi(jkl();mno(););)');
    });
  });

  it('allows to override remote template with a local ones', () => {
    const scope = TemplateScope.create({
      partials: { 'test:lion': 'simba!' },
    });
    return scope.compile('Override: {{> test:elephant}}').then((template) => {
      const rendered = template({});
      expect(rendered).to.be.equal('Override: elephant and simba!');
    });
  });

  it('error when remote template is not found', () => {
    const scope = TemplateScope.create();
    return scope.compile('Error: {{> test:error}}').then(
      () => Promise.reject(new Error('Expected to throw an error')),
      () => Promise.resolve()
    );
  });

  it('uses separate caches for different scopes', () => {
    const firstScope = TemplateScope.create({
      partials: { foo: 'FIRST' },
    });
    const secondScope = TemplateScope.create({
      partials: { foo: 'SECOND' },
    });
    return Promise.all([firstScope.compile('{{> foo}}'), secondScope.compile('{{> foo}}')]).then(
      ([firstTemplate, secondTemplate]) => {
        const firstRendered = firstTemplate({});
        const secondRendered = secondTemplate({});
        expect(firstRendered).to.be.equal('FIRST');
        expect(secondRendered).to.be.equal('SECOND');
      }
    );
  });

  it('renders nothing when template is undefined or null', () => {
    const scope = TemplateScope.create();
    return Promise.all([scope.compile(undefined), scope.compile(null)]).then(([undefinedTemplate, nullTemplate]) => {
      const context = { foo: 42 };
      expect(undefinedTemplate()).to.be.equal('');
      expect(undefinedTemplate(context)).to.be.equal('');
      expect(nullTemplate()).to.be.equal('');
      expect(nullTemplate(context)).to.be.equal('');
    });
  });

  describe('data context', () => {
    it('captures and restores data context', () => {
      const scope = TemplateScope.create({
        partials: { foo: 'x={{x}} y={{y}} z={{z}}' },
      });

      const template = '{{{{capture}}}}{{> foo x=2 y=20}}{{{{/capture}}}}';

      return scope
        .compile(template)
        .then((firstTemplate) => {
          const capturer = new ContextCapturer();
          const firstUnescaped = firstTemplate({ x: 1, y: 10, z: 100 }, { capturer });
          return scope.compile(firstUnescaped).then((secondTemplate) => ({
            secondTemplate,
            parentContext: capturer.getResult(),
          }));
        })
        .then(({ secondTemplate, parentContext }) => {
          const secondUnescaped = secondTemplate({ y: 30 }, { parentContext });
          expect(secondUnescaped).to.be.equal('x=2 y=20 z=100');
        });
    });

    it('restores correct data context inside nested {{#each}} blocks', () => {
      const scope = TemplateScope.builder()
        .registerPartial('foo', '[x={{x}} y={{y}} xindex={{xindex}} yindex={{yindex}}]\n')
        .build();

      const template =
        '{{#each xs}}{{#each ../ys}}{{{{capture}}}}' +
        // we cannot directly refer to parent context (../something) because it isn't exposed
        // to helper functions in contrast with data-references (@../key),
        // so 'xval' cannot be restored here
        '{{> foo x=(lookup @root.xs @../index) y=this xindex=@../index yindex=@index}}' +
        '{{{{/capture}}}}{{/each}}{{/each}}';

      return scope
        .compile(template)
        .then((firstTemplate) => {
          const capturer = new ContextCapturer();
          const firstUnescaped = firstTemplate({ xs: [1, 2], ys: [10, 20] }, { capturer });
          return scope.compile(firstUnescaped).then((secondTemplate) => ({
            secondTemplate,
            parentContext: capturer.getResult(),
          }));
        })
        .then(({ secondTemplate, parentContext }) => {
          const secondUnescaped = secondTemplate({}, { parentContext });
          expect(secondUnescaped).to.be.equal(
            [
              '[x=1 y=10 xindex=0 yindex=0]\n',
              '[x=1 y=20 xindex=0 yindex=1]\n',
              '[x=2 y=10 xindex=1 yindex=0]\n',
              '[x=2 y=20 xindex=1 yindex=1]\n',
            ].join('')
          );
        });
    });
  });
});

function mockFetchRemoteTemplate() {
  beforeEach(function () {
    this.originalFetchRemoteTemplate = TemplateScope._fetchRemoteTemplate;
    TemplateScope._fetchRemoteTemplate = (iri: Rdf.Iri) => {
      const template = MOCKED_REMOTE_TEMPLATES[iri.value];
      if (template === undefined) {
        return Promise.reject(new Error(`Invalid mocked remote template iri ${iri}`));
      }
      return Promise.resolve(parseTemplate(template));
    };
  });
  afterEach(function () {
    TemplateScope._fetchRemoteTemplate = this.originalFetchRemoteTemplate;
  });
}
