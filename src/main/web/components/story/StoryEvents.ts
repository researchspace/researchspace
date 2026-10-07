/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { EventMaker } from 'platform/api/events';

export interface StoryEventData {
  /** Goes to the next slide. Target: the rs-story id. */
  'Story.Next': void;
  /** Goes to the previous slide. Target: the rs-story id. */
  'Story.Previous': void;
  /** Goes to a slide by position (from 0) or by IRI. Target: the rs-story id. */
  'Story.GoTo': { index?: number; slide?: string };
  /** Applies the current slide again, e.g. after the user moved the map. Target: the rs-story id. */
  'Story.Reset': void;
  /** Triggered by rs-story when the story has been loaded. */
  'Story.Loaded': { story: string; total: number };
  /** Triggered by rs-story when a slide is shown. */
  'Story.SlideChanged': { story: string; index: number; slide: string; total: number };
  /** Triggered by rs-story-editor when a story has been saved. */
  'Story.Saved': { story: string };
  /** Triggered by rs-story-editor when a story has been deleted. */
  'Story.Deleted': { story: string };
}

const event: EventMaker<StoryEventData> = EventMaker;

export const Next = event('Story.Next');
export const Previous = event('Story.Previous');
export const GoTo = event('Story.GoTo');
export const Reset = event('Story.Reset');
export const Loaded = event('Story.Loaded');
export const SlideChanged = event('Story.SlideChanged');
export const Saved = event('Story.Saved');
export const Deleted = event('Story.Deleted');
