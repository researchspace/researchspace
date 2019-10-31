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

import { BrowserPersistence } from 'platform/api/persistence';
import { Rdf } from 'platform/api/rdf';

import { ConfigHolder } from 'platform/api/services/config-holder';

const LS_LANGUAGE_PREFERENCES_KEY = 'preferredLanguage';
const DEFAULT_LANGUAGE = 'en';

const LanguagePreferences = BrowserPersistence.adapter<{
  userLanguageTag?: string;
}>();

let computedPreferences: undefined | {
  readonly preferredLanguage: string;
  readonly languageRanks: ReadonlyMap<string, number>;
};

/**
 * @returns BCP 47 language tag
 */
export function getPreferredUserLanguage(): string {
  return getOrComputePreferences().preferredLanguage;
}

export function setPreferredUserLanguage(bcp47LanguageTag: string | undefined) {
  LanguagePreferences.update(LS_LANGUAGE_PREFERENCES_KEY, {
    userLanguageTag: bcp47LanguageTag,
  });
  // invalidate computed language preferences
  computedPreferences = undefined;
}

function getOrComputePreferences(): typeof computedPreferences {
  if (!computedPreferences) {
    // initialize preferred language and ranks
    const preferredLanguage = readPreferredUserLanguage();
    const languageRanks = computeLanguageRanks();
    computedPreferences = {preferredLanguage, languageRanks};
  }
  return computedPreferences;
}

function readPreferredUserLanguage() {
  const preferences = LanguagePreferences.get(LS_LANGUAGE_PREFERENCES_KEY) || {};
  if (typeof preferences.userLanguageTag === 'string') {
    return preferences.userLanguageTag;
  }
  const {preferredLanguages} = ConfigHolder.getUIConfig();
  if (preferredLanguages.length > 0) {
      return preferredLanguages[0];
  }
  return DEFAULT_LANGUAGE;
}

/**
 * See LabelCache.java `chooseLabelWithPreferredLanguage()` for reference.
 */
function computeLanguageRanks(): Map<string, number> {
  const languageToRank = new Map<string, number>();
  // unlike original Java method we do not put selected language into
  // language ranks to be able to choose it dynamically

  // lower rank means better, best rank is zero
  let nextRank = 1;
  const {preferredLanguages} = ConfigHolder.getUIConfig();
  for (const language of preferredLanguages) {
    if (!languageToRank.has(language)) {
      languageToRank.set(language, nextRank++);
    }
  }

  if (!languageToRank.has('')) {
    languageToRank.set('', nextRank++);
  }

  return languageToRank;
}

/**
 * Returns the label with the user preferred language, otherwise returns the label based on
 * the order of the preferredLanguages. In case the label is missing, returns the label with
 * empty language. If no label exists, returns undefined.
 *
 * This client-side logic is only to be used in exceptional cases (i.e. if physical triples might
 * no be present in the triple store) and otherwise the global/backend label service should be used.
 *
 * See LabelCache.java `chooseLabelWithPreferredLanguage()` for reference.
 */
export function selectPreferredLabel(
  labels: ReadonlyArray<Rdf.Literal>,
  selectedLanguage?: string
): Rdf.Literal | undefined {
  // fast path: no labels detected
  if (labels.length === 0) {
    return undefined;
  }

  const {languageRanks} = getOrComputePreferences();

  let bestObserved: Rdf.Literal | undefined;
  let bestObservedRank = Number.MAX_SAFE_INTEGER;
  for (const label of labels) {
    const {language} = label;
    if (language === selectedLanguage) {
      // optimal match found
      return label;
    }

    let rank = languageRanks.get(language);
    if (typeof rank === 'undefined') {
      // better than uninitialized
      rank = Number.MAX_SAFE_INTEGER - 1;
    }

    if (rank < bestObservedRank) {
      // remember best match thus far
      bestObservedRank = rank;
      bestObserved = label;
    } // else: continue scanning
  }

  return bestObserved;
}

/**
 * Returns the defined label for the IRI if the literal in the optional is present, otherwise
 * computing a fall back label. The fallback is the IRI's local name and if local name is empty,
 * it simply returns the full IRI as a string.
 *
 * See LabelCache.java `resolveLabelWithFallback()` for reference.
 */
export function resolveLabelWithFallback(
  labelIfDefined: Rdf.Literal | undefined,
  iri: Rdf.Iri
): string {
  if (labelIfDefined) {
    return labelIfDefined.value;
  }
  return Rdf.getLocalName(iri.value) || iri.value;
}
