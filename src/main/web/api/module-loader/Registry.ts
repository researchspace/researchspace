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

import { ReactElement, ReactNode, createElement, CSSProperties, ComponentClass } from 'react';
import * as D from 'react-dom-factories';

import * as assign from 'object-assign';
import * as _ from 'lodash';
import { Set } from 'immutable';
import * as React from 'react';
import * as render from 'dom-serializer';
import * as he from 'he';
import { Parser as ToReactParser, ProcessNodeDefinitions, Node, Instruction } from 'html-to-react';
import * as Kefir from 'kefir';

import { ConfigHolder } from 'platform/api/services/config-holder';
import * as SecurityService from 'platform/api/services/security';
import { TemplateParser, TemplateScope } from 'platform/api/services/template';
import { ComponentProps } from 'platform/api/components';
import { WrappingError } from 'platform/api/async';

import { Reparentable } from 'platform/components/utils/Reparentable';

import { hasComponent, loadComponent } from './ComponentsStore';
import { safeReactCreateElement } from './ReactErrorCatcher';

const processNodeDefinitions = new ProcessNodeDefinitions(React);

/**
 * Holds all natively registered custom elements.
 */
const NativeRegistry = Set<string>().asMutable();

/*
 * Intercept calls to customElements.define to track all custom components.
 */
const registerElement = customElements.define;
customElements.define = function (name: string, constructor: Function, options?: ElementDefinitionOptions) {
  NativeRegistry.add(name);
  return registerElement.bind(customElements)(name, constructor, options);
};

/**
 * Register react component as a web-component.
 *
 * At rendering time html tag instantiated with corresponding react component.
 * Attributes are propagated as props with some transformations:
 *  1) 'data-' prefix is stripped.
 *  2) names are translated to camel-case se. e.g "data-event-key" corresponds
 *     to "eventKey" property.
 *  3) attribute value is parsed as JSON.
 *
 * Example:
 *  html:
 *    <bs-tab data-event-key="1" data-title="Tab 1">
 *      Some Content
 *    </bs-tab>
 *
 *  react:
 *    Tab({eventKey: '1', title: 'Tab 1'}, 'Some Content')
 */
export function init() {
  /**/
}

/**
 * When we parse custom component attributes we save raw style attribute into
 * __style variable,
 * because original style is parsed to be in line with react style syntax.
 * But raw style string can be useful when we want to propagate style to DOM element
 * managed outside React. E.g. CytoscapeNavigator component.
 */
export const RAW_STYLE_ATTRIBUTE = '__style';

/**
 * Parse HTML string into ReactElements hierarchy.
 * @param  {string} html
 *         Plain html string to be parsed to React.
 * @return {Array} Array of @ReactElement
 */
export function parseHtmlToReact(html: string): Promise<ReactElement<any> | ReactElement<any>[]> {
  const processingInstructions: Instruction[] = [
    {
      shouldProcessNode: isCodeExample,
      processNode: processCode('mp-code-example'),
    },
    {
      shouldProcessNode: isCode,
      processNode: processCode('mp-code-highlight'),
    },
    {
      shouldProcessNode: isCodeBlock,
      processNode: processCode('mp-code-block'),
    },
    {
      shouldProcessNode: isCodeChild,
      processNode: skipNode,
    },
    {
      shouldProcessNode: isStyle,
      processNode: processStyle,
    },
    {
      shouldProcessNode: isStyleChild,
      processNode: skipNode,
    },
    {
      shouldProcessNode: isReactComponent,
      processNode: processReactComponent,
    },
    {
      shouldProcessNode: isNativeComponent,
      processNode: processNativeComponent,
    },
    {
      shouldProcessNode: (node) => !TemplateParser.isTemplate(node),
      processNode: processDefaultNode,
    },
  ];

  const htmlToReactParser = new ToReactParser(React, { recognizeCDATA: true });

  /*
   * Because html-to-react expects html with single root node as an input,
   * we need to wrap html into artificial div node. After parsing it's children
   * will correspond to initial html.
   */
  return htmlToReactParser
    .parseWithInstructions(`<div key="root">${html}</div>`, isValidNode, processingInstructions)
    .then((components) => components.props.children);
}

export function isWebComponent(componentTag: string) {
  return hasComponent(componentTag);
}

/**
 * Creates ReactElement for corresponding html-tag with
 * provided props, children and templateScope
 */
export function renderWebComponent(
  componentTag: string,
  props: Record<string, any>,
  children?: ReactNode[],
  templateScope?: TemplateScope
): Promise<ReactElement<any>> {
  // check if user is permitted to use the component
  // if not it will not be rendered at all
  templateScope = templateScope ||
    TemplateScope.create({scopeTrace: {componentTag, componentId: props.id}});
  return isComponentPermited(componentTag)
    .toPromise()
    .then<ReactElement<any>>((result) => {
      if (!result) {
        return null;
      }
      return loadComponent(componentTag).then((component) =>
        createElementWithTemplateScope(component, props, children, templateScope)
      );
    });
}

function processDefaultNode(
  node: Node,
  children: Array<ReactElement<any>>
): Promise<ReactElement<any> | Array<ReactElement<any>>> {
  return Promise.resolve(processNodeDefinitions.processDefaultNode(node, children));
}

function isCode(node: Node): boolean {
  return node.name === 'code';
}

function isCodeExample(node: Node): boolean {
  return node.name === 'mp-code-example';
}

function isCodeBlock(node: Node): boolean {
  return node.name === 'mp-code-block';
}

function isCodeChild(node: Node): boolean {
  return (
    node.parent &&
    (node.parent.name === 'code' || node.parent.name === 'mp-code-example' || node.parent.name === 'mp-code-block')
  );
}

function isStyle(node: Node): boolean {
  return node.name === 'style';
}

function isStyleChild(node: Node): boolean {
  return node.parent && node.parent.name === 'style';
}

function isReactComponent(node: Node): boolean {
  return hasComponent(node.name);
}

function isNativeComponent(node: Node): boolean {
  // according to specification name of the custom element must contain dash.
  // see https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define
  return !hasComponent(node.name) && node.type === 'tag' && node.name.indexOf('-') !== -1;
}
/**
 * We simply skip (ignore) empty text nodes here in the processing instructions.
 */
function isValidNode(node: Node): boolean {
  return node.type === 'text' ? _.trim(node.data) !== '' : true;
}

function processNativeComponent(node: Node, children: Array<ReactNode>): Promise<ReactElement<any>> {
  return Promise.resolve(
    D.div({
      dangerouslySetInnerHTML: {
        __html: render(node),
      },
    })
  );
}

/**
 * Properly handle children for code visualization components.
 */
function processCode(codeComponent: 'mp-code-example' | 'mp-code-highlight' | 'mp-code-block') {
  return function (node: Node, children: Array<React.ReactNode>): Promise<React.ReactElement<any>> {
    const innerCode = _.trim(he.decode(render(node.children)));
    const attributes = htmlAttributesToReactProps(node.attribs);

    // remove CDATA wrapper if it is present
    const codeToHighlight = innerCode.replace('<!--[CDATA[', '').replace(']]-->', '');

    return loadComponent(codeComponent).then((component) =>
      createElement(component, assign({ codeText: codeToHighlight }, attributes))
    );
  };
}

function skipNode(node: Node, children: Array<React.ReactNode>): Promise<React.ReactElement<any>> {
  return null;
}

function processStyle(node: Node, children: Array<React.ReactNode>): Promise<React.ReactElement<any>> {
  // return for empty style tags i.e. uBlock browser extension may inject these
  const styleNode = !node.children[0]
    ? D.style()
    : D.style({ dangerouslySetInnerHTML: { __html: node.children[0].data } }, null);

  return Promise.resolve(styleNode);
}

function processReactComponent(node: Node, children: Array<ReactNode>): Promise<React.ReactElement<any>> {
  let attributes;
  try {
    attributes = htmlAttributesToReactProps(node.attribs);
  } catch (e) {
    const msg = `Error while processing attributes for component \"${node.name}\":
      ' + ${e.message}`;
    throw new Error(msg);
  }

  // was previously {key: `component-${index}-${level}`},
  const computedKey =
    attributes['key'] && !attributes['fixedKey']
      ? attributes['key']
      : attributes['fixedKey']
      ? attributes['fixedKey']
      : Math.random().toString(36).slice(2);

  // we propagate attributes as-is, but also put them into special config field
  let props = assign({ key: computedKey }, attributes);

  // handle nested config for semantic components
  if (_.startsWith(node.name, 'semantic')) {
    if (!_.isUndefined(props['config'])) {
      const nestedProps = _.transform(
        props['config'],
        (acc: {}, val: string, key: string) => {
          acc[attributeName(key)] = val;
          return acc;
        },
        {}
      );
      props = assign(props, nestedProps);
    }
  }

  let templateScope: TemplateScope = undefined;
  try {
    templateScope = extractTemplateScope(node);
  } catch (error) {
    throw new WrappingError(`Invalid template markup at <${node.name}>`, error);
  }

  if (attributes['fixedKey'] && attributes['reparentable']) {
    delete props.key;
    return renderWebComponent(node.name, props, children, templateScope).then(el => {
      return React.createElement(
        Reparentable, {uid: attributes['fixedKey']}, el
      );
    });
  } else {
    return renderWebComponent(node.name, props, children, templateScope);
  }
}

/**
 * Creates a template scope derived from default one and registers
 * local templates from the node.
 */
export function extractTemplateScope(node: Node): TemplateScope | undefined {
  const templates = TemplateParser.extractTemplates(node);
  if (templates.length === 0) {
    return undefined;
  }
  return templates
    .reduce((builder, { id, source }) => {
      try {
        builder.registerPartial(id, source);
      } catch (error) {
        throw new WrappingError(`Failed to register <template id='${id}'>`, error);
      }
      return builder;
    }, TemplateScope.builder())
    .build();
}

const isAlwaysPermitted = Kefir.constant(true);

/**
 * With default platform configuration all component are enabled by default
 * one need to explicitly enable security check for components in ui.prop
 */
function isComponentPermited(componentName: string): Kefir.Property<boolean> {
  if (ConfigHolder.getUIConfig().enableUiComponentBasedSecurity) {
    const right = 'ui:component:view:' + componentName.replace(/-/g, ':');
    return SecurityService.Util.isPermitted(right);
  } else {
    return isAlwaysPermitted;
  }
}

function createElementWithTemplateScope(
  component: ComponentClass<any>,
  componentProps: any,
  children: ReactNode[],
  templateScope: TemplateScope
) {
  let props = componentProps;
  if (component.propTypes) {
    const propTypes = component.propTypes as { [K in keyof ComponentProps]: any };
    if (propTypes.markupTemplateScope) {
      // provide template context if component accepts it in props
      const scopeProps: Partial<ComponentProps> = {
        markupTemplateScope: templateScope,
      };
      props = { ...props, ...scopeProps };
    }
  }
  return safeReactCreateElement.apply(null, [component, props].concat(children));
}

/**
 * Use helper functions from reactive-elements to convert html attributes to react props.
 */
function htmlAttributesToReactProps(attribs: { [key: string]: string }): {} {
  return _.transform(
    attribs,
    (acc: {}, val: string, key: string) => {
      acc[attributeName(key)] =
        key === 'style' ? parseReactStyleFromCss(attributeValue(key, val)) : attributeValue(key, val);

      if (key === 'style') {
        // save raw style attribute
        acc[RAW_STYLE_ATTRIBUTE] = attributeValue(key, val);
      }
      return acc;
    },
    {}
  );
}

function attributeName(name: string): string {
  if (name === 'class') {
    return 'className';
  }
  if (name === 'data-flex-layout' || name === 'data-flex-self') {
    // we need to propagate data-layout and data-layout-self as is to support
    // styling with https://github.com/StefanKovac/flex-layout-attribute
    return name;
  } else {
    return attributeNameToPropertyName(name);
  }
}

function attributeNameToPropertyName(attributeName: string): string {
  return attributeName.replace(/^(x|data)[-_:]/i, '').replace(/[-_:](.)/g, (x, chr) => chr.toUpperCase());
}

function attributeValue(name: string, val: string): any {
  const decoded = he.decode(val);

  // custom handling for boolean attributes.
  // replace with something more generic, like https://github.com/YousefED/typescript-json-schema
  if (decoded === 'true' || decoded === 'false') {
    return JSON.parse(decoded);
  } else if (decoded !== '' && !isNaN(+decoded)) {
    // isNaN returns true for empty string, so we need to check for it 
    // custom handling for number attributes
    return +decoded;
  } else {
    return parseAttributeValue(name, decoded);
  }
}

function parseAttributeValue(name: string, value) {
  if (!value) {
    return null;
  }

  const jsonRegexp = /^{{1}.*}{1}$/,
    jsonArrayRegexp = /(^\[.*\]$)/;

  // remove all kind of line breaks
  const valueWithoutLineBreaks = value.replace(/(\r\n|\n|\r|\t)/gm, '');
  const jsonMatches = valueWithoutLineBreaks.match(jsonRegexp) || valueWithoutLineBreaks.match(jsonArrayRegexp);
  const isEnclosedInDoubleCurlyBraces =
    valueWithoutLineBreaks.startsWith('{{') && valueWithoutLineBreaks.endsWith('}}');

  if (jsonMatches && !isEnclosedInDoubleCurlyBraces) {
    try {
      value = JSON.parse(jsonMatches[0]);
    } catch (e) {
      const msg = `Failed to parse value for attribute \"${name}\" as JSON.
                      Details: ${e.message}`;
      throw new Error(msg);
    }
  }

  return value;
}

export function parseReactStyleFromCss(cssStyle: string | undefined | null): CSSProperties {
  if (!cssStyle) {
    return {};
  }
  const styles = cssStyle.split(';');
  const jsonStyles: CSSProperties = {};
  for (const styleEntry of styles) {
    const separatorIndex = styleEntry.indexOf(':');
    if (separatorIndex <= 0 || separatorIndex === styleEntry.length - 1) {
      continue;
    }
    const key = _.camelCase(styleEntry.substring(0, separatorIndex));
    const value = styleEntry.substring(separatorIndex + 1);
    jsonStyles[key] = value;
  }
  return jsonStyles;
}
