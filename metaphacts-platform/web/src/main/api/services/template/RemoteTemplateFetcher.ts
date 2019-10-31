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

import * as Handlebars from 'handlebars';

import { WrappingError } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { SparqlUtil } from 'platform/api/sparql';

import { escapeRemoteTemplateHtml } from './TemplateParser';

import { PageService } from '../page';

const remoteTemplateCache = new Map<string, Promise<ParsedTemplate>>();

export function purgeRemoteTemplateCache() {
  remoteTemplateCache.clear();
}

export interface ParsedTemplate {
  readonly source: string;
  readonly ast: hbs.AST.Program;
  readonly references: ReadonlyArray<string>;
}

export function fetchRemoteTemplate(iri: Rdf.Iri): Promise<ParsedTemplate> {
  if (remoteTemplateCache.has(iri.value)) {
    return remoteTemplateCache.get(iri.value);
  }

  // fetching and parsing template source
  const promise = PageService.loadPageTemplateHtml(iri).toPromise()
    .then(template => escapeRemoteTemplateHtml(template.templateHtml))
    .then(parseTemplate)
    .catch(error => Promise.reject(new WrappingError(
      `Failed to load the source of template ${iri}`, error))
    );

  remoteTemplateCache.set(iri.value, promise);
  return promise;
}

interface HandlebarsAPI {
  JavaScriptCompiler?: HandlebarsJavaScriptCompilerConstructor;
}

interface HandlebarsJavaScriptCompilerConstructor {
  new(...args: any[]): HandlebarsJavaScriptCompiler;
}

interface HandlebarsJavaScriptCompiler {
  nameLookup(parent: any, name: any, type: string): any;
  /**
   * Undocumented reference to constructor function of itself.
   * Nested partials compilation will use default JavaScriptCompiler if this field isn't set to
   * derived compiler's constructor function.
   */
   // See `compiler: JavaScriptCompiler` field here:
   // tslint:disable-next-line:max-line-length
   // https://github.com/wycats/handlebars.js/blob/714a4c448281aef44bcafc4d9e4ecf32ed063b8b/lib/handlebars/compiler/javascript-compiler.js#L695
  compiler?: HandlebarsJavaScriptCompilerConstructor;
}

/**
 * Handlebars runtime compiler with added ability to resolve partial name
 * specified as short prefixed IRI using platform-wide registered prefixes.
 */
class IRIResolvingCompiler extends (Handlebars as HandlebarsAPI).JavaScriptCompiler {
  nameLookup(parent: any, name: any, type: string) {
    if (type === 'partial' && typeof name === 'string' && isRemoteReference(name)) {
      const [iri] = SparqlUtil.resolveIris([name]);
      return super.nameLookup(parent, iri.value, type);
    }
    return super.nameLookup(parent, name, type);
  }
}
IRIResolvingCompiler.prototype.compiler = IRIResolvingCompiler;

export function isRemoteReference(partialName: string) {
  return partialName.indexOf(':') >= 0;
}

class RemoteTemplateScanner extends Handlebars.Visitor {
  readonly localReferences = new Set<string>();
  readonly remoteReferences: string[] = [];

  PartialStatement(partial: hbs.AST.PartialStatement): void {
    this.addReference(partial);
  }

  PartialBlockStatement(partial: hbs.AST.PartialBlockStatement): void {
    this.addReference(partial);
  }

  private addReference(partial: hbs.AST.PartialStatement | hbs.AST.PartialBlockStatement) {
    const name = this.getPartialName(partial.name);
    // exclude special partial names, e.g. @partial-block
    if (name && name.indexOf('@') !== 0) {
      if (isRemoteReference(name)) {
        this.remoteReferences.push(name);
      } else {
        this.localReferences.add(name);
      }
    }
  }

  private getPartialName(name: hbs.AST.PathExpression | hbs.AST.SubExpression) {
    if (name.type === 'PathExpression') {
      const path = name as hbs.AST.PathExpression;
      if (path.parts.length === 1) {
        return path.original;
      }
    }
    return undefined;
  }
}

export function createHandlebarsWithIRILookup() {
  const handlebars = Handlebars.create();
  (handlebars as HandlebarsAPI).JavaScriptCompiler = IRIResolvingCompiler;
  return handlebars;
}

export function parseTemplate(body: string): ParsedTemplate {
  const ast = typeof body === 'string' ? Handlebars.parse(body) : body;
  const scanner = new RemoteTemplateScanner();
  scanner.accept(ast);

  const references = scanner.localReferences;
  SparqlUtil.resolveIris(scanner.remoteReferences)
    .map(iri => iri.value)
    .forEach(remoteReference => references.add(remoteReference));

  return {source: body, ast, references: Array.from(references.values())};
}
