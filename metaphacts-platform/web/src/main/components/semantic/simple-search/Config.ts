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

export interface SemanticSimpleSearchBaseConfig {
  /**
   * SPARQL SELECT query string. Needs to have a variable named as `__token__`(can be customized with searchTermVariable) that will be replaces with the user input.
   */
  query: string;

  /**
   * SPARQL SELECT query string. If present will be used to show default suggestions without the need for the user to type anything.
   */
  defaultQuery?: string

  /**
   * User input variable name.
   *
   * @default __token__
   */
  searchTermVariable?: string;

  /**
   * Minimum number of input characters that triggers the search.
   *
   * @default 3
   */
  minSearchTermLength?: number;

  /**
   * Input placeholder.
   */
  placeholder?: string;

  /**
   * A flag determining whether any special Lucene syntax will be escaped.
   * When `false` lucene syntax in the user input is not escaped.
   *
   * @default true
   */
  escapeLuceneSyntax?: boolean;

  /**
   * A flag determining whether the user input is tokenized by whitespace into words postfixed by `*`. 
   * E.g. the search for `Hello World` becomes `Hello* World*`.
   *
   * @default true
   */
  tokenizeLuceneQuery?: boolean
}

export interface SemanticSimpleSearchConfig extends SemanticSimpleSearchBaseConfig {
  /**
   * Name of the binding being used for result.
   */
  resourceBindingName?: string;

  /**
   * <semantic-link uri='http://help.metaphacts.com/resource/FrontendTemplating'>Template</semantic-link> for suggestion item.
   */
  template?: string;
}
