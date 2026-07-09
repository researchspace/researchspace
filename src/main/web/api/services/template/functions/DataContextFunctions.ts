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

export interface DataContext {
  /** `this` context */
  context: any;
  /** `@data` stack */
  data: HandlebarsDataStack;
}

export class ContextCapturer {
  static readonly DATA_KEY = '$contextCapturer';

  constructor(private contexts?: Map<number, DataContext>) {}

  private static lastContextKey = 0;
  private static generateUniqueContextKey(): number {
    ContextCapturer.lastContextKey++;
    return ContextCapturer.lastContextKey;
  }

  /** @returns context key for {{expose}} block */
  captureContext(dataContext: DataContext): number {
    const { context, data } = dataContext;
    const key = ContextCapturer.generateUniqueContextKey();
    if (!this.contexts) {
      this.contexts = new Map<number, DataContext>();
    }
    this.contexts.set(key, { context, data: cloneContextData(data) });
    return key;
  }

  getResult() {
    return new CapturedContext(this.contexts);
  }
}

export class CapturedContext {
  static readonly DATA_KEY = '$capturedContext';

  constructor(private contexts?: ReadonlyMap<number, DataContext>) {}

  getContext(contextKey: number): DataContext | undefined {
    if (!this.contexts) {
      return undefined;
    }
    const context = this.contexts.get(contextKey);
    if (!context) {
      console.warn(`Missing context for context key ${contextKey}`);
    }
    return context;
  }

  static inheritAndCapture(base?: CapturedContext) {
    const inheritedContexts = base && base.contexts ? new Map(base.contexts) : undefined;
    return new ContextCapturer(inheritedContexts);
  }
}

/**
 * Represents `@data` stack from Handlebars template context.
 */
interface HandlebarsDataStack {
  _parent?: HandlebarsDataStack;
  root?: any;
  index?: number;
  key?: number | string;
  first?: boolean;
  last?: boolean;
}

const CAPTURED_DATA_KEYS: Array<keyof HandlebarsDataStack> = ['root', 'index', 'key', 'first', 'last'];

function cloneContextData(data: HandlebarsDataStack) {
  if (!data) {
    return data;
  }
  const clone: HandlebarsDataStack = {};
  for (const key of CAPTURED_DATA_KEYS) {
    if (key in data) {
      (clone as any)[key] = data[key];
    }
  }
  if ('_parent' in data) {
    clone._parent = cloneContextData(data._parent);
  }
  return clone;
}

function mergeDataContext(outer: any, inner: any) {
  if (isPlainObjectOrNothing(inner)) {
    if (isPlainObjectOrNothing(outer)) {
      return { ...outer, ...inner };
    } else {
      // 'outer' is a primitive and can be inherited only when 'inner' is empty
      return hasAnyOwnKey(inner) ? inner : outer;
    }
  } else {
    // 'inner' is a primitive and cannot inherit data context
    return inner;
  }
}

/**
 * Checks if `target` is a plain object (not function, class instance or boxed primitive)
 * or `undefined` / `null`.
 */
function isPlainObjectOrNothing(target: any) {
  if (target === null || target === undefined) {
    return true;
  }
  if (typeof target !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(target);
  return !prototype || prototype === Object.getPrototypeOf({});
}

function hasAnyOwnKey(target: object): boolean {
  for (const key in target) {
    if (target.hasOwnProperty(key)) {
      return true;
    }
  }
  return false;
}

function overrideContextData(base: HandlebarsDataStack, override: HandlebarsDataStack): HandlebarsDataStack {
  const result = { ...base, ...override };
  if (base._parent && override._parent) {
    result._parent = overrideContextData(base._parent, override._parent);
  }
  return result;
}

export const DataContextFunctions = {
  /**
   * {{{{capture}}}} raw helper escapes it's child template and captures all
   * available template context (`this` context and `@data` stack) at that point.
   * `ContextCapturer` instance in `@data` stack is required to be able to capture.
   *
   * When result is evaluated the second time, it uses {{#expose <generated-key>}} block to
   * restore captured template context.
   *
   * Currently it is not possible to directly refer to parent context (../something)
   * because parent `this` context doesn't exposed to helper functions
   * (in contrast with `@data`-references like `@../key`), e.g:
   * ```
   * {{#each xs}} {{#each ys}}
   *   {{-- this won't work --}}
   *   x={{..}}
   * {{/each}} {{/each}}
   * ```
   * It's possible to use either a partial call or dynamic lookup by index as a workaround.
   */
  capture: function (this: any, options: any) {
    const data = options ? options.data : {};
    const capturedContext = data[ContextCapturer.DATA_KEY];
    if (capturedContext instanceof ContextCapturer) {
      const key = capturedContext.captureContext({ context: this, data: options.data });
      return `{{#expose ${key}}}${options.fn(this)}{{/expose}}`;
    }
    return options.fn(this);
  },

  /**
   * {{expose <generated-key>}} helper restores previously captured template context
   * (`this` context and `@data` stack) using `CapturedContext` in `@data` stack.
   */
  expose: function (this: any, key: number, options: any) {
    if (typeof key !== 'number') {
      throw new Error('{{#expose}} context key is missing or not a number');
    }

    const data = options ? options.data : {};
    const capturedContext = data[CapturedContext.DATA_KEY];
    const dataContext = capturedContext instanceof CapturedContext ? capturedContext.getContext(key) : undefined;

    if (dataContext) {
      return options.fn(mergeDataContext(dataContext.context, this), {
        data: overrideContextData(data, dataContext.data),
      });
    } else {
      return options.fn(this);
    }
  },

  /**
   * {{bind}} helper allows to explicitly put any referenceable value into
   * current data context. This allows to reference aliased block params (`as |foo|`)
   * and values from parent data context (`../../foo`) when invoking a partial.
   * @example
   * <!-- outer context: foos, bars, qux -->
   * {{#each foos as |foo|}}
   *   {{#each bars as |bar|}}
   *      {{bind f=foo b=bar q=../../qux}}
   *        <semantic-query query='SELECT * WHERE {}'
   *          template='{{> sub foo=f bar=b qux=q}}'>
   *          <template id='sub'>
   *            <span>{{foo}} {{bar}} {{qux}}</span>
   *          </template>
   *        </semantic-query>
   *     {{/bind}}
   *   {{/each}}
   * {{/each}}
   */
  bind: function (this: any, options: any) {
    const boundContext = mergeDataContext(this, options.hash);
    return options.fn(boundContext);
  },
};
