/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from 'chai';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';
import { encodeComponentState } from 'platform/components/semantic/app-state/AppStateUrlCodec';
import {
  Story,
  STORY_TYPE,
  SLIDE_TYPE,
  emptyStory,
  newSlideIri,
  parseStory,
  storyToGraph,
} from 'platform/components/story/StoryModel';
import {
  buildSlidePageUrl,
  collectComponentIds,
  isSamePage,
  resolveSlideTarget,
} from 'platform/components/story/StoryNavigation';
import { sanitizeStoryHtml } from 'platform/components/story/StoryHtml';

const CRM = 'http://www.cidoc-crm.org/cidoc-crm/';

function objects(graph: Rdf.Graph, subject: string, predicate: string): string[] {
  return graph.triples
    .filter((t) => t.s.value === subject && t.p.value === predicate)
    .map((t) => t.o.value)
    .toArray();
}

describe('Story', () => {
  const story: Story = {
    iri: 'http://www.researchspace.org/instances/stories/s1',
    title: 'Florence in 1835',
    description: 'A walk through the city',
    creator: 'http://www.researchspace.org/resource/user/admin',
    created: '2026-10-07T10:00:00.000Z',
    slides: [
      { iri: 'http://www.researchspace.org/instances/stories/s1/slide/a', title: 'Start', text: '<p>Hi</p>', stateUrl: '/resource/:test?states=x' },
      { iri: 'http://www.researchspace.org/instances/stories/s1/slide/b', title: '', text: '', stateUrl: '' },
    ],
  };

  it('models a story with CIDOC-CRM', () => {
    const graph = storyToGraph(story);
    expect(objects(graph, story.iri, CRM + 'P2_has_type')).to.deep.equal([STORY_TYPE]);
    // the graph is a set: the order of the slides is given by their sequence position
    expect(objects(graph, story.iri, CRM + 'P106_is_composed_of').sort()).to.deep.equal(story.slides.map((s) => s.iri));
    expect(objects(graph, story.slides[1].iri, 'http://www.researchspace.org/ontology/PX_has_sequence_position')).to.deep.equal(['2']);
    expect(objects(graph, story.iri + '/primary_appellation', CRM + 'P190_has_symbolic_content')).to.deep.equal([
      'Florence in 1835',
    ]);
    expect(objects(graph, story.iri + '/creation', CRM + 'P14_carried_out_by')).to.deep.equal([story.creator]);
    const first = story.slides[0].iri;
    expect(objects(graph, first, CRM + 'P2_has_type')).to.deep.equal([SLIDE_TYPE]);
    expect(objects(graph, first, 'http://www.researchspace.org/ontology/PX_has_sequence_position')).to.deep.equal(['1']);
    expect(objects(graph, first + '/view/url', CRM + 'P190_has_symbolic_content')).to.deep.equal([
      '/resource/:test?states=x',
    ]);
    const html = graph.triples.find((t) => t.s.value === first && t.p.value === CRM + 'P190_has_symbolic_content');
    expect((html.o as Rdf.Literal).datatype.value).to.equal('http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML');
    // the second slide has no text, title nor state
    expect(objects(graph, story.slides[1].iri, CRM + 'P67_refers_to')).to.deep.equal([]);
  });

  it('parses a story from query results and drops repeated slides', () => {
    const metadata: SparqlClient.SparqlSelectResult = {
      head: { vars: ['title', 'description'] },
      results: { bindings: [{ title: Rdf.literal('T'), description: Rdf.literal('D') }] },
    } as any;
    const slides: SparqlClient.SparqlSelectResult = {
      head: { vars: ['slide', 'title', 'text', 'stateUrl'] },
      results: {
        bindings: [
          { slide: Rdf.iri('s/1'), title: Rdf.literal('one'), text: Rdf.literal('<p>a</p>'), stateUrl: Rdf.literal('/u') },
          { slide: Rdf.iri('s/1'), title: Rdf.literal('uno') },
          { slide: Rdf.iri('s/2') },
        ],
      },
    } as any;
    const parsed = parseStory('s', metadata, slides);
    expect(parsed.title).to.equal('T');
    expect(parsed.slides.map((s) => s.iri)).to.deep.equal(['s/1', 's/2']);
    expect(parsed.slides[0]).to.deep.equal({ iri: 's/1', title: 'one', text: '<p>a</p>', stateUrl: '/u' });
    expect(parsed.slides[1].stateUrl).to.equal('');
    const missing = { head: { vars: [] }, results: { bindings: [] } } as any;
    expect(parseStory('s', missing, slides)).to.equal(undefined);
  });

  it('creates new stories with unique slide IRIs', () => {
    const created = emptyStory();
    expect(created.iri.indexOf('http://www.researchspace.org/instances/stories/')).to.equal(0);
    expect(created.slides).to.have.length(1);
    expect(newSlideIri(created.iri)).not.to.equal(newSlideIri(created.iri));
  });
});

describe('StoryNavigation', () => {
  const here = (href: string) => ({ href } as Location);

  it('compares pages by path, uri and repository', () => {
    const current = here('http://localhost/resource/:test?states=a&storySlide=2');
    expect(isSamePage(new URL('http://localhost/resource/:test?states=b'), current)).to.equal(true);
    expect(isSamePage(new URL('http://localhost/resource/:other'), current)).to.equal(false);
    expect(isSamePage(new URL('http://localhost/resource/:test?repository=x'), current)).to.equal(false);
    expect(isSamePage(new URL('http://example.org/resource/:test'), current)).to.equal(false);
  });

  it('reads the states of a slide and the components used by a story', () => {
    const url = `/resource/:test?states=${encodeURIComponent(
      `map=${encodeComponentState({ view: { center: [1, 2], zoom: 3 } })}&controls=${encodeComponentState({ year: 1835 })}`
    )}`;
    const target = resolveSlideTarget(url);
    expect(target.states.map).to.deep.equal({ view: { center: [1, 2], zoom: 3 } });
    expect(target.states.controls).to.deep.equal({ year: 1835 });
    expect(resolveSlideTarget('')).to.equal(undefined);
    expect(collectComponentIds([target, undefined, resolveSlideTarget('/resource/:test')]).sort()).to.deep.equal([
      'controls',
      'map',
    ]);
  });

  it('adds the story and slide to the URL of another page', () => {
    const target = resolveSlideTarget('/resource/:other?states=abc');
    const url = buildSlidePageUrl(target, 'http://x/story', 2);
    expect(url.search(true)).to.deep.equal({ states: 'abc', story: 'http://x/story', storySlide: '3' });
    expect(url.path()).to.equal('/resource/:other');
  });
});

describe('StoryHtml', () => {
  it('keeps text formatting and removes scripts', () => {
    const html = sanitizeStoryHtml(
      '<h3>Title</h3><p onclick="alert(1)"><strong>bold</strong> <a href="javascript:alert(1)">x</a></p>' +
        '<script>alert(1)</script><iframe src="http://evil"></iframe><a href="#" data-story-goto="2">next</a>'
    );
    expect(html).to.contain('<h3>Title</h3>');
    expect(html).to.contain('<strong>bold</strong>');
    expect(html).not.to.contain('onclick');
    expect(html).not.to.contain('javascript:');
    expect(html).not.to.contain('<script');
    expect(html).not.to.contain('<iframe');
    expect(html).to.contain('data-story-goto="2"');
  });

  it('keeps embedded images, editor alignment classes and slide links', () => {
    const image = 'data:image/png;base64,iVBORw0KGgo=';
    const html = sanitizeStoryHtml(
      `<p class="ql-align-center evil"><img src="${image}" alt="map"></p>` +
        '<p class="foo">x</p><img src="javascript:alert(1)"><a href="#3">to slide 3</a>'
    );
    expect(html).to.contain(`<img src="${image}" alt="map">`);
    expect(html).to.contain('<p class="ql-align-center">');
    expect(html).to.contain('<p>x</p>');
    expect(html).not.to.contain('javascript:');
    expect(html).to.contain('<a href="#3">to slide 3</a>');
  });

  it('opens external links in a new tab', () => {
    const html = sanitizeStoryHtml('<a href="https://example.org">x</a>');
    expect(html).to.contain('target="_blank"');
    expect(html).to.contain('rel="noopener noreferrer"');
  });
});
