/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as Kefir from 'kefir';
import * as maybe from 'data.maybe';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';
import { LdpService } from 'platform/api/services/ldp';
import { Util as SecurityUtil } from 'platform/api/services/security';

import { Story, STORY_CONTAINER, STORY_QUERY, SLIDES_QUERY, parseStory, storyToGraph } from './StoryModel';

/**
 * Stories are kept in the platform repository, not in the data repository of the page.
 */
export const DEFAULT_STORY_REPOSITORY = 'default';

/**
 * Loads a story.
 *
 * @returns `undefined` when the story does not exist.
 */
export function loadStory(iri: string, repository = DEFAULT_STORY_REPOSITORY): Kefir.Property<Story | undefined> {
  const context = { context: { repository } };
  const bind = (query: string) =>
    SparqlClient.setBindings(SparqlUtil.parseQuery(query), { story: Rdf.iri(iri) });
  return Kefir.combine([
    SparqlClient.select(bind(STORY_QUERY), context),
    SparqlClient.select(bind(SLIDES_QUERY), context),
  ])
    .map(([metadata, slides]) => parseStory(iri, metadata, slides))
    .toProperty();
}

/**
 * Creates or replaces a story. A new story gets the current user as creator and the
 * current time as creation date.
 */
export function saveStory(story: Story, isNew: boolean, repository = DEFAULT_STORY_REPOSITORY): Kefir.Property<Story> {
  const ldp = new LdpService(STORY_CONTAINER, { repository });
  if (!isNew) {
    return ldp.update(Rdf.iri(story.iri), storyToGraph(story)).map(() => story);
  }
  return Kefir.fromPromise(SecurityUtil.getUser())
    .flatMap((user) => {
      const created: Story = {
        ...story,
        creator: user && user.userURI ? user.userURI : undefined,
        created: new Date().toISOString(),
      };
      // a slug that is an absolute IRI becomes the IRI of the new resource
      return ldp.addResource(storyToGraph(created), maybe.Just(story.iri)).map(() => created);
    })
    .toProperty();
}

export function deleteStory(iri: string, repository = DEFAULT_STORY_REPOSITORY): Kefir.Property<void> {
  return new LdpService(STORY_CONTAINER, { repository }).deleteResource(Rdf.iri(iri)).map(() => undefined);
}
