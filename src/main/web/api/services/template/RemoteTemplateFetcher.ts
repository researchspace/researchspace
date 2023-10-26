/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as Handlebars from 'handlebars';
import { partition } from 'lodash';

import { WrappingError } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';
import { SparqlUtil } from 'platform/api/sparql';

import { escapeRemoteTemplateHtml } from './TemplateParser';
import { ParsedTemplate } from './TemplateCommons';
import { remoteTemplateCache } from './TemplateCache';

import { PageService } from '../page';



export function fetchRemoteTemplate(iri: Rdf.Iri): Promise<ParsedTemplate> {
  if (remoteTemplateCache.has(iri.value)) {
    return remoteTemplateCache.get(iri.value);
  }

  // fetching and parsing template source
  const promise = PageService.loadPageTemplateHtml(iri)
    .toPromise()
    .then((template) => escapeRemoteTemplateHtml(template.templateHtml))
    .then(parseTemplate)
    .catch((error) => Promise.reject(new WrappingError(`Failed to load the source of template ${iri}`, error)));

  remoteTemplateCache.set(iri.value, promise);
  return promise;
}

interface HandlebarsAPI {
  JavaScriptCompiler?: HandlebarsJavaScriptCompilerConstructor;
}

interface HandlebarsJavaScriptCompilerConstructor {
  new (...args: any[]): HandlebarsJavaScriptCompiler;
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
      const iri = resolveTemplateIri(name);
      return super.nameLookup(parent, iri.value, type);
    }
    return super.nameLookup(parent, name, type);
  }
}
IRIResolvingCompiler.prototype.compiler = IRIResolvingCompiler;

export function isRemoteReference(partialName: string) {
  return partialName.includes(':');
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

  private getPartialName(name: hbs.AST.PathExpression | hbs.AST.SubExpression | hbs.AST.StringLiteral) {
    if (name.type === 'PathExpression') {
      const path = name as hbs.AST.PathExpression;
      if (path.parts.length === 1) {
        return path.original;
      }
    } else if (name.type === 'StringLiteral') {
      return (name as hbs.AST.StringLiteral).value;
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

  // if reference starts with http then it is full IRI, otherwise it is prefixed one
  const [expanded, prefixed] = partition(scanner.remoteReferences, ref => ref.startsWith('http'));
  expanded.forEach(ref => references.add(ref));

  SparqlUtil.resolveIris(prefixed)
    .map((iri) => iri.value)
    .forEach((remoteReference) => references.add(remoteReference));

  return { source: body, ast, references: Array.from(references.values()) };
}

function resolveTemplateIri(ref: string) {
  if (ref.startsWith('http:/')) {
    return Rdf.iri(ref);
  } else {
    return SparqlUtil.resolveIris([ref])[0];
  }
}
