import { SparqlUtil } from "platform/api/sparql";
import { KeywordSearch } from "../sets/Defaults";

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
   * If tokenizeLuceneQuery is true this parameter can be used to
   * filter out tokens that a shorter then specified lenght.
   * 
   * So if minTokenLength=3, and input string is "an apple",
   * then only "apple*" will be propagated to the query.
   * 
   * @default 3
   */
  minTokenLength?: number;
}

export const defaultKeywordSearchConfig: KeywordSearchConfig = {
  minSearchTermLength: 3,
  tokenizeLuceneQuery: true,
  escapeLuceneSyntax: true,
  minTokenLength: 3,
};

/**
 * Check if text string confirms to KeywoardSearchConfig
 */
export function textConfirmsToConfig(input: string, searchConfig: KeywordSearchConfig) {
  const { 
    tokenizeLuceneQuery, escapeLuceneSyntax, minTokenLength, minSearchTermLength
  } = searchConfig;
  if (input && input.length >= minSearchTermLength) {
    if (tokenizeLuceneQuery) {
      // we need to check if when we tokenize the query we get at least one token that
      // confirms to min token lenght 
      const tokenizedInput = 
        luceneTokenize(input, tokenizeLuceneQuery, escapeLuceneSyntax, minTokenLength);
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
  inputText: string, escape = true, tokenize = true, minTokenLength: number
): String[] {
  return inputText
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => minTokenLength ? w.length >=  minTokenLength : w.length > 0)
    .map((w) => {
      if (escape) {
        w = w.replace(LUCENE_ESCAPE_REGEX, '\\$1');
      }
      if (tokenize) {
        w += '*';
      }
      return w;
    });
}
