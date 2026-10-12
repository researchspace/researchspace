/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as uri from 'urijs';

import { ComponentStates } from 'platform/components/semantic/app-state/AppStateEvents';
import { parseAppStateUrl } from 'platform/components/semantic/app-state/AppStateUrlCodec';

/** URL parameter with the IRI of the story being played. */
export const STORY_PARAM = 'story';
/** URL parameter with the position (from 1) of the slide being shown. */
export const SLIDE_PARAM = 'storySlide';

export interface SlideTarget {
  /** Whether the slide shows the current page, so that its state can be applied in place. */
  samePage: boolean;
  url: URL;
  states?: ComponentStates;
  stateId?: string;
}

/**
 * Parses the state URL of a slide.
 *
 * @returns undefined when the URL is empty or invalid.
 */
export function resolveSlideTarget(stateUrl: string): SlideTarget | undefined {
  if (!stateUrl || !stateUrl.trim()) {
    return undefined;
  }
  const parsed = parseAppStateUrl(stateUrl.trim());
  if (!parsed) {
    return undefined;
  }
  return { ...parsed, samePage: isSamePage(parsed.url) };
}

/**
 * Whether a URL shows the same page as the current one: same origin and path, and same
 * `uri` and `repository` parameters.
 */
export function isSamePage(url: URL, current: Location = window.location): boolean {
  const here = new URL(current.href);
  const sameParam = (name: string) => (url.searchParams.get(name) || '') === (here.searchParams.get(name) || '');
  return (
    url.origin === here.origin &&
    decodeURIComponent(url.pathname) === decodeURIComponent(here.pathname) &&
    sameParam('uri') &&
    sameParam('repository')
  );
}

/**
 * URL to open a slide that shows another page: the story and slide parameters let the story
 * on that page continue from this slide.
 */
export function buildSlidePageUrl(target: SlideTarget, storyIri: string, index: number): uri.URI {
  const url = new URL(target.url.href);
  url.searchParams.set(STORY_PARAM, storyIri);
  url.searchParams.set(SLIDE_PARAM, String(index + 1));
  return uri(url.pathname + url.search + url.hash);
}

/**
 * Story and slide (from 0) given in the current URL, if any.
 */
export function readSlideParams(): { story?: string; index?: number } {
  const params = new URLSearchParams(window.location.search);
  const slide = parseInt(params.get(SLIDE_PARAM), 10);
  return {
    story: params.get(STORY_PARAM) || undefined,
    index: isNaN(slide) ? undefined : slide - 1,
  };
}

/**
 * Writes the current story and slide in the URL, without adding a history entry.
 */
export function writeSlideParams(storyIri: string, index: number) {
  const url = new URL(window.location.href);
  url.searchParams.set(STORY_PARAM, storyIri);
  url.searchParams.set(SLIDE_PARAM, String(index + 1));
  if (url.href !== window.location.href) {
    window.history.replaceState(window.history.state, '', url.href);
  }
}

/**
 * Ids of the components that appear in at least one slide: a slide resets the components it
 * does not mention, so that the state of the previous slide does not leak into it.
 */
export function collectComponentIds(targets: Array<SlideTarget | undefined>): string[] {
  const ids: { [id: string]: true } = {};
  targets.forEach((target) => {
    if (target && target.states) {
      Object.keys(target.states).forEach((id) => (ids[id] = true));
    }
  });
  return Object.keys(ids);
}
