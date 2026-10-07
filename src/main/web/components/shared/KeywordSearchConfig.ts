/**
 * ResearchSpace
 * Copyright (C) 2025, Pharos: The International Consortium of Photo Archives
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

export interface KeywordSearchConfig {
  /**
   * A flag determining whether any special Lucene syntax will be escaped.
   * When `false` lucene syntax in the user input is not escaped.
   *
   * @default true
   */
  escapeLuceneSyntax?: boolean;

  /**
   * Minimum number of input characters that triggers the search.
   *
   * @default 3
   */
  minSearchTermLength?: number;
  
  /**
   * A flag determining whether the user input is tokenized by whitespace into words postfixed by `*`.
   * E.g. the search for `Hello World` becomes `Hello* World*`.
   *
   * @default true
   */
  tokenizeLuceneQuery?: boolean;

  /**
   * If tokenizeLuceneQuery is true, this parameter can be used to
   * filter out tokens shorter than the specified length.
   * 
   * When set, e.g. minTokenLength=3, and the input string is "an apple",
   * only "apple*" will be propagated to the query.
   * 
   * When undefined (default), no token length filtering is applied,
   * preserving backward-compatible behavior where all tokens are included.
   * 
   * @default undefined (no filtering)
   */
  minTokenLength?: number;
}

export const defaultKeywordSearchConfig: KeywordSearchConfig = {
  minSearchTermLength: 3,
  tokenizeLuceneQuery: true,
  escapeLuceneSyntax: true,
};

/**
 * Check if text string confirms to KeywoardSearchConfig
 */
export function textConfirmsToConfig(input: string, searchConfig: KeywordSearchConfig) {
  const mergedConfig = { ...defaultKeywordSearchConfig, ...searchConfig };
  const { tokenizeLuceneQuery, escapeLuceneSyntax, minTokenLength, minSearchTermLength } = mergedConfig;
  if (input && input.length >= minSearchTermLength) {
    if (tokenizeLuceneQuery && minTokenLength !== undefined) {
      // When minTokenLength is set, check if tokenization produces at least one valid token
      const tokenizedInput = luceneTokenize(input, escapeLuceneSyntax, tokenizeLuceneQuery, minTokenLength);
      return tokenizedInput.length > 0;
    } else {
      return true;
    }
  } else {
    return false;
  }
}

/**
 * @see https://lucene.apache.org/core/2_9_4/queryparsersyntax.html
 */
const LUCENE_ESCAPE_REGEX = /([+\-&|!(){}\[\]^"~*?:\\])/g;

export function luceneTokenize(
  inputText: string, escape = true, tokenize = true, minTokenLength?: number
): string[] {
  return inputText
    .split(' ')
    .map((w) => w.trim()) // Trim whitespace
    .filter((w) => w.length > 0) // Filter empty strings
    .filter((w) => minTokenLength === undefined || w.length >= minTokenLength) // Apply length filter only if specified
    .map((w) => {
      let processedWord = w;
      if (escape) {
        processedWord = processedWord.replace(LUCENE_ESCAPE_REGEX, '\\$1');
      }
      if (tokenize) {
        processedWord += '*';
      }
      return processedWord;
    });
}
