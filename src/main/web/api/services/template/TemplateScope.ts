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

import { WrappingError } from 'platform/api/async';
import { Rdf } from 'platform/api/rdf';

import { DefaultHelpers, ContextCapturer, CapturedContext } from './functions';

import { ParsedTemplate } from './TemplateCommons';
import { defaultContextCache } from './TemplateCache';
import {
  fetchRemoteTemplate,
  parseTemplate,
  isRemoteReference,
  createHandlebarsWithIRILookup,
} from './RemoteTemplateFetcher';

const EMPTY_TEMPLATE: CompiledTemplate = () => '';

export type CompiledTemplate = (
  dataContext?: object,
  options?: {
    capturer?: ContextCapturer;
    parentContext?: CapturedContext;
  }
) => string;

export interface TemplateScopeProps {
  partials?: { readonly [id: string]: string };
}

export interface TemplateScopeTrace {
  componentTag?: string;
  componentId?: string;
  templateId?: string;
}

export interface TemplateScopeOptions extends TemplateScopeProps {
  scopeTrace?: TemplateScopeTrace
  helpers?: { readonly [id: string]: Function };
}

/**
 * Represents an isolated Handlebars compiler instance acting as a container
 * for partials and helpers with an ability to clone it.
 *
 * Cloned scope doesn't depend on it's parent, e.g. registering a helper or a
 * partial on a parent scope won't affect cloned scope.
 *
 * @example
 * // compile template with default global partials and helpers
 * TemplateScope.default.compile('<div>{{foo}}</div>')
 *   .then(template => { ... });
 *
 * // create an isolated scope with partials using `create()` or `builder()`
 * const isolateScopeWithCreate = TemplateScope.create({
 *   partials: {
 *     foo: '<span>{{> @partial-block}}<span>',
 *   }
 * });
 * const isolatedScopeWithBuilder = TemplateScope.builder()
 *  .registerPartial('foo', '<span>{{> @partial-block}}<span>')
 *  .build();
 *
 * // use either local partials or remote ones
 * // (by specifying IRI as a partial name)
 * clonedScope.compile('{{#> foo}} {{> platform:someTemplate}} {{/foo}}')
 *   .then(template => { ... });
 */
export class TemplateScope {
  static readonly default = new TemplateScope(DefaultHelpers, null, null, defaultContextCache);
  /** DO NOT USE. For testing purposes only. */
  static _fetchRemoteTemplate = fetchRemoteTemplate;

  private readonly handlebars = createHandlebarsWithIRILookup();
  private readonly compiledCache;

  private readonly partials: ReadonlyMap<string, ParsedTemplate>;

  private constructor(
    private readonly helpers: { readonly [id: string]: Function },
    private readonly scopeTrace?: TemplateScopeTrace,
    partials?: ReadonlyMap<string, ParsedTemplate>,
    cache?: Map<string, HandlebarsTemplateDelegate>,
  ) {
    this.compiledCache = cache || new Map<string, HandlebarsTemplateDelegate>();
    for (const helperId in helpers) {
      if (!helpers.hasOwnProperty(helperId)) {
        continue;
      }
      this.handlebars.registerHelper(helperId, helpers[helperId]);
    }

    this.partials = partials || new Map<string, ParsedTemplate>();
    this.partials.forEach((body, id) => {
      this.handlebars.registerPartial(id, body.ast);
    });
  }

  clearCache() {
    this.compiledCache.clear();
  }

  getPartial(name: string): ParsedTemplate {
    return this.partials.get(name);
  }

  static builder(options: TemplateScopeOptions = {}): TemplateScopeBuilder {
    const helpers = { ...DefaultHelpers, ...options.helpers };
    return new TemplateScopeBuilder(
      options, (partials) => new TemplateScope(helpers, options.scopeTrace, partials)
    );
  }

  static create(options: TemplateScopeOptions = {}) {
    return TemplateScope.builder(options).build();
  }

  exportProps(): TemplateScopeProps {
    const partials: { [id: string]: string } = {};
    this.partials.forEach((partial, id) => (partials[id] = partial.source));
    return { partials };
  }

  compile(template: string): Promise<CompiledTemplate> {
    if (template === undefined || template === null) {
      return Promise.resolve(EMPTY_TEMPLATE);
    }
    const fromCache = this.compiledCache.get(template);
    if (fromCache) {
      return Promise.resolve(fromCache);
    }
    return this.resolve(template).then((resolved) => {
      const withParentContext: CompiledTemplate = (local, { capturer, parentContext } = {}) =>
        resolved(local, {
          data: {
            [ContextCapturer.DATA_KEY]: capturer,
            [CapturedContext.DATA_KEY]: parentContext,
          },
        });
      this.compiledCache.set(template, withParentContext);
      return withParentContext;
    });
  }

  /**
   * Synchronously compiles template without resolving remote template references.
   * @deprecated
   */
  compileWithoutRemote(template: string): CompiledTemplate {
    if (template === undefined || template === null) {
      return EMPTY_TEMPLATE;
    }
    const fromCache = this.compiledCache.get(template);
    if (fromCache) {
      return fromCache;
    }
    const compiled = this.handlebars.compile(template);
    const withParentContext: CompiledTemplate = (local, { capturer, parentContext } = {}) =>
      compiled(local, {
        data: {
          [ContextCapturer.DATA_KEY]: capturer,
          [CapturedContext.DATA_KEY]: parentContext,
        },
      });
    this.compiledCache.set(template, withParentContext);
    return withParentContext;
  }

  private resolve(templateBody: string): Promise<HandlebarsTemplateDelegate> {
    return Promise.resolve(templateBody)
      .then(parseTemplate)
      .then((parsed) => {
        const dependencies = new Map<string, ParsedTemplate>();
        return recursiveResolve(parsed, dependencies, this.loadByReference)
          .then(() => {
            dependencies.forEach((dependency, iri) => {
              if (!this.partials.has(iri)) {
                this.handlebars.registerPartial(iri, dependency.ast);
              }
            });
          })
          .then(() => this.handlebars.compile(parsed.ast));
      });
  }

  /** Loads partial by local name or remote reference. */
  private loadByReference = (reference: string): Promise<ParsedTemplate | null> => {
    if (this.partials.has(reference)) {
      return Promise.resolve(this.partials.get(reference));
    } else if (isRemoteReference(reference)) {
      return TemplateScope._fetchRemoteTemplate(Rdf.iri(reference));
    } else {
      // if we can't find partial then we just return null
      // to resort to handlebars default resolution logic.
      // It gives us the ability to use partial failover mechanism.
      // see https://handlebarsjs.com/guide/partials.html#partial-blocks
      return Promise.resolve(null);
    }
  };
}

export class TemplateScopeBuilder {
  private partials = new Map<string, ParsedTemplate>();

  constructor(
    options: TemplateScopeOptions,
    private createScope: (partials: Map<string, ParsedTemplate>) => TemplateScope
  ) {
    const { partials = {} } = options;
    for (const id in partials) {
      if (!partials.hasOwnProperty(id)) {
        continue;
      }
      const partialText = partials[id];
      if (typeof partialText === 'string') {
        this.registerPartial(id, partialText);
      }
    }
  }

  registerPartial(id: string, partial: string | ParsedTemplate): this {
    if (this.partials.has(id)) {
      throw new Error(`Template partial '${id}' already registered`);
    }
    const parsedTemplate = typeof partial === 'string' ? parseTemplate(partial) : partial;
    this.partials.set(id, parsedTemplate);
    return this;
  }

  build(): TemplateScope {
    return this.createScope(this.partials);
  }
}

async function recursiveResolve(
  parsedTemplate: ParsedTemplate,
  dependencies: Map<string, ParsedTemplate>,
  load: (reference: string) => Promise<ParsedTemplate>
): Promise<{}> {
  const body = await Promise.resolve(parsedTemplate);
  const referencesToLoad = parsedTemplate.references.filter((reference) => !dependencies.has(reference));
  for (const reference of referencesToLoad) {
    // mark dependency to prevent multiple loading
    dependencies.set(reference, null);
  }

  const fetchedDependencies = [];
  for (const reference of referencesToLoad) {
    const loaded = await load(reference);
    if (loaded != null) {
      fetchedDependencies.push({ reference, template: loaded });
    } else {
      dependencies.delete(reference);
    }
  }

  const fetched = await Promise.all(fetchedDependencies);
  for (const { reference, template } of fetched) {
    dependencies.set(reference, template);
  }
  return Promise.all(
    fetched.map(({ reference, template }) =>
      recursiveResolve(template, dependencies, load).catch((error) => {
        throw new WrappingError(`Error while resolving dependencies of template '${reference}'`, error);
      })
    )
  );
}
