/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as uuid from 'uuid';

import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';

/**
 * A story: an ordered list of slides, each with a text and the URL of an application state
 * (a page with `<app-state>` parameters) that the slide shows.
 */
export interface Story {
  iri: string;
  title: string;
  description: string;
  /** IRI of the user who created the story. */
  creator?: string;
  /** Creation time, xsd:dateTime. */
  created?: string;
  slides: StorySlide[];
}

export interface StorySlide {
  iri: string;
  title: string;
  /** HTML text of the slide. */
  text: string;
  /** URL of the state the slide shows, absolute or relative to the platform. */
  stateUrl: string;
}

const CRM = 'http://www.cidoc-crm.org/cidoc-crm/';
const CRMDIG = 'http://www.cidoc-crm.org/extensions/crmdig/';
const RSO = 'http://www.researchspace.org/ontology/';
const RESOURCE_TYPE = 'http://www.researchspace.org/resource/system/vocab/resource_type/';

export const STORY_CONTAINER = 'http://www.researchspace.org/resource/system/storyContainer';
export const STORY_INSTANCE_BASE = 'http://www.researchspace.org/instances/stories/';

export const STORY_TYPE = RESOURCE_TYPE + 'story';
export const SLIDE_TYPE = RESOURCE_TYPE + 'story_slide';
export const APP_STATE_VIEW_TYPE = RESOURCE_TYPE + 'app_state_view';
export const URL_TYPE = RESOURCE_TYPE + 'url';
const PRIMARY_APPELLATION = RESOURCE_TYPE + 'primary_appellation';
const DESCRIPTION_TYPE = 'http://www.researchspace.org/resource/vocab/text_type/description';

const RDF_TYPE = Rdf.iri('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
const RDF_HTML = Rdf.iri('http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML');
const RDFS_LABEL = Rdf.iri('http://www.w3.org/2000/01/rdf-schema#label');
const XSD_INTEGER = Rdf.iri('http://www.w3.org/2001/XMLSchema#integer');
const XSD_DATETIME = Rdf.iri('http://www.w3.org/2001/XMLSchema#dateTime');

const crm = (name: string) => Rdf.iri(CRM + name);
/** Position of a slide in its story: CIDOC-CRM has no ordering construct. */
const SEQUENCE_POSITION = Rdf.iri(RSO + 'PX_has_sequence_position');

export function newStoryIri(): string {
  return STORY_INSTANCE_BASE + uuid.v4();
}

export function newSlideIri(storyIri: string): string {
  return `${storyIri}/slide/${uuid.v4()}`;
}

export function emptyStory(): Story {
  const iri = newStoryIri();
  return { iri, title: '', description: '', slides: [emptySlide(iri)] };
}

export function emptySlide(storyIri: string): StorySlide {
  return { iri: newSlideIri(storyIri), title: '', text: '', stateUrl: '' };
}

/**
 * RDF of a story, modelled with CIDOC-CRM:
 *
 * ```turtle
 * <story> a crm:E73_Information_Object ; crm:P2_has_type <resource_type/story> ;
 *   rdfs:label "title" ;
 *   crm:P1_is_identified_by <story/primary_appellation> ;  # E41, P190 "title"
 *   crm:P67i_is_referred_to_by <story/description> ;      # E73 typed description, P190 "text"
 *   crm:P94i_was_created_by <story/creation> ;            # E65, P14 creator, P4 E52 P82 date
 *   crm:P106_is_composed_of <story/slide/1> .
 * <story/slide/1> a crm:E73_Information_Object ; crm:P2_has_type <resource_type/story_slide> ;
 *   crm:P106i_forms_part_of <story> ; rso:PX_has_sequence_position 1 ;
 *   crm:P1_is_identified_by <.../primary_appellation> ;   # slide title
 *   crm:P190_has_symbolic_content "<p>...</p>"^^rdf:HTML ;
 *   crm:P67_refers_to <.../view> .                        # crmdig:D1 typed app_state_view
 * <.../view> crm:P1_is_identified_by <.../view/url> .      # E42 typed url, P190 "/resource/..."
 * ```
 */
export function storyToGraph(story: Story): Rdf.Graph {
  const triples: Rdf.Triple[] = [];
  const add = (s: Rdf.Iri, p: Rdf.Iri, o: Rdf.Node) => triples.push(Rdf.triple(s, p, o));
  const text = (value: string) => Rdf.literal(value);
  const appellation = (subject: Rdf.Iri, value: string) => {
    const node = Rdf.iri(subject.value + '/primary_appellation');
    add(subject, crm('P1_is_identified_by'), node);
    add(node, RDF_TYPE, crm('E41_Appellation'));
    add(node, crm('P2_has_type'), Rdf.iri(PRIMARY_APPELLATION));
    add(node, crm('P190_has_symbolic_content'), text(value));
  };

  const storyIri = Rdf.iri(story.iri);
  add(storyIri, RDF_TYPE, crm('E73_Information_Object'));
  add(storyIri, crm('P2_has_type'), Rdf.iri(STORY_TYPE));
  add(storyIri, RDFS_LABEL, text(story.title));
  appellation(storyIri, story.title);

  if (story.description) {
    const description = Rdf.iri(story.iri + '/description');
    add(storyIri, crm('P67i_is_referred_to_by'), description);
    add(description, RDF_TYPE, crm('E73_Information_Object'));
    add(description, crm('P2_has_type'), Rdf.iri(DESCRIPTION_TYPE));
    add(description, crm('P190_has_symbolic_content'), text(story.description));
  }

  const creation = Rdf.iri(story.iri + '/creation');
  add(storyIri, crm('P94i_was_created_by'), creation);
  add(creation, RDF_TYPE, crm('E65_Creation'));
  if (story.creator) {
    add(creation, crm('P14_carried_out_by'), Rdf.iri(story.creator));
  }
  if (story.created) {
    const timeSpan = Rdf.iri(story.iri + '/creation/time_span');
    add(creation, crm('P4_has_time-span'), timeSpan);
    add(timeSpan, RDF_TYPE, crm('E52_Time-Span'));
    add(timeSpan, crm('P82_at_some_time_within'), Rdf.literal(story.created, XSD_DATETIME));
  }

  story.slides.forEach((slide, index) => {
    const slideIri = Rdf.iri(slide.iri);
    add(storyIri, crm('P106_is_composed_of'), slideIri);
    add(slideIri, crm('P106i_forms_part_of'), storyIri);
    add(slideIri, RDF_TYPE, crm('E73_Information_Object'));
    add(slideIri, crm('P2_has_type'), Rdf.iri(SLIDE_TYPE));
    add(slideIri, SEQUENCE_POSITION, Rdf.literal(String(index + 1), XSD_INTEGER));
    if (slide.title) {
      add(slideIri, RDFS_LABEL, text(slide.title));
      appellation(slideIri, slide.title);
    }
    if (slide.text) {
      add(slideIri, crm('P190_has_symbolic_content'), Rdf.literal(slide.text, RDF_HTML));
    }
    if (slide.stateUrl) {
      const view = Rdf.iri(slide.iri + '/view');
      const url = Rdf.iri(slide.iri + '/view/url');
      add(slideIri, crm('P67_refers_to'), view);
      add(view, RDF_TYPE, Rdf.iri(CRMDIG + 'D1_Digital_Object'));
      add(view, crm('P2_has_type'), Rdf.iri(APP_STATE_VIEW_TYPE));
      add(view, crm('P1_is_identified_by'), url);
      add(url, RDF_TYPE, crm('E42_Identifier'));
      add(url, crm('P2_has_type'), Rdf.iri(URL_TYPE));
      add(url, crm('P190_has_symbolic_content'), text(slide.stateUrl));
    }
  });
  return Rdf.graph(triples);
}

const PREFIXES = `
PREFIX crm: <${CRM}>
PREFIX rso: <${RSO}>
`;

/**
 * Metadata of the story bound to `?story`.
 */
export const STORY_QUERY = `${PREFIXES}
SELECT ?title ?description ?creator ?created WHERE {
  ?story crm:P2_has_type <${STORY_TYPE}> .
  OPTIONAL {
    ?story crm:P1_is_identified_by ?appellation .
    ?appellation crm:P2_has_type <${PRIMARY_APPELLATION}> ;
      crm:P190_has_symbolic_content ?title .
  }
  OPTIONAL {
    ?story crm:P67i_is_referred_to_by ?descriptionNode .
    ?descriptionNode crm:P2_has_type <${DESCRIPTION_TYPE}> ;
      crm:P190_has_symbolic_content ?description .
  }
  OPTIONAL {
    ?story crm:P94i_was_created_by ?creation .
    OPTIONAL { ?creation crm:P14_carried_out_by ?creator }
    OPTIONAL { ?creation crm:P4_has_time-span/crm:P82_at_some_time_within ?created }
  }
} LIMIT 1`;

/**
 * Slides of the story bound to `?story`, in order.
 */
export const SLIDES_QUERY = `${PREFIXES}
SELECT ?slide ?position ?title ?text ?stateUrl WHERE {
  ?story crm:P106_is_composed_of ?slide .
  ?slide crm:P2_has_type <${SLIDE_TYPE}> ;
    rso:PX_has_sequence_position ?position .
  OPTIONAL {
    ?slide crm:P1_is_identified_by ?appellation .
    ?appellation crm:P2_has_type <${PRIMARY_APPELLATION}> ;
      crm:P190_has_symbolic_content ?title .
  }
  OPTIONAL { ?slide crm:P190_has_symbolic_content ?text }
  OPTIONAL {
    ?slide crm:P67_refers_to ?view .
    ?view crm:P2_has_type <${APP_STATE_VIEW_TYPE}> ;
      crm:P1_is_identified_by ?identifier .
    ?identifier crm:P190_has_symbolic_content ?stateUrl .
  }
} ORDER BY ?position`;

/**
 * Stories with their title, newest first. Can be used in templates to list them.
 */
export const STORIES_QUERY = `${PREFIXES}
SELECT ?story ?title ?created WHERE {
  ?story crm:P2_has_type <${STORY_TYPE}> .
  OPTIONAL {
    ?story crm:P1_is_identified_by ?appellation .
    ?appellation crm:P2_has_type <${PRIMARY_APPELLATION}> ;
      crm:P190_has_symbolic_content ?title .
  }
  OPTIONAL { ?story crm:P94i_was_created_by/crm:P4_has_time-span/crm:P82_at_some_time_within ?created }
} ORDER BY DESC(?created)`;

export function parseStory(
  iri: string,
  metadata: SparqlClient.SparqlSelectResult,
  slides: SparqlClient.SparqlSelectResult
): Story | undefined {
  const row = metadata.results.bindings[0];
  if (!row) {
    return undefined;
  }
  const value = (node: Rdf.Node | undefined) => (node ? node.value : '');
  const seen = new Set<string>();
  const parsedSlides: StorySlide[] = [];
  slides.results.bindings.forEach((binding) => {
    const slideIri = binding['slide'].value;
    // a slide is repeated when an optional part has several values; keep the first
    if (seen.has(slideIri)) {
      return;
    }
    seen.add(slideIri);
    parsedSlides.push({
      iri: slideIri,
      title: value(binding['title']),
      text: value(binding['text']),
      stateUrl: value(binding['stateUrl']),
    });
  });
  return {
    iri,
    title: value(row['title']),
    description: value(row['description']),
    creator: row['creator'] ? row['creator'].value : undefined,
    created: row['created'] ? row['created'].value : undefined,
    slides: parsedSlides,
  };
}
