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

import { createElement, ReactElement, cloneElement, Props } from 'react';
import * as D from 'react-dom-factories';
import { isEqual, isArray } from 'lodash';
import * as classNames from 'classnames';
import * as Maybe from 'data.maybe';

import { Component, TemplateContext } from 'platform/api/components';
import { CapturedContext } from 'platform/api/services/template';
import { ModuleRegistry } from 'platform/api/module-loader';

import { ErrorNotification } from 'platform/components/ui/notification';

export interface TemplateItemProps extends Props<TemplateItem> {
  template: Template;
  componentProps?: {
    [key: string]: any;
  };
  componentMapper?: (component: JSX.Element) => JSX.Element;
  onLoad?: () => void;
}

type Template = {
  source: string;
  options?: {};
};

interface State {
  parsedTemplate?: ReactElement<any> | ReactElement<any>[];
  capturedContext?: CapturedContext;
  error?: any;
}

/**
 * Helper component that renders parametrized handlebars templates to react elements.
 */
export class TemplateItem extends Component<TemplateItemProps, State> {
  static defaultProps: Partial<TemplateItemProps & { id: string | number }> = {
    id: Math.random(),
    template: undefined,
  };

  private compileVersion = 0;

  constructor(props: TemplateItemProps, context: any) {
    super(props, context);
    this.state = {
      parsedTemplate: null,
    };
  }

  getChildContext() {
    const baseContext = super.getChildContext();
    const parentContext = this.context.templateDataContext;

    const dataContextOverride: Partial<TemplateContext> = {
      templateDataContext: this.state.capturedContext || parentContext,
    };
    return { ...baseContext, ...dataContextOverride };
  }

  componentDidMount() {
    this.compileTemplate(this.props);
  }

  componentWillReceiveProps(props, nextContext) {
    if (!templateEqual(props.template, this.props.template)) {
      // use nextContext: this.context still holds the previous captured
      // context, but the new source may reference the incoming one's keys
      this.compileTemplate(props, nextContext);
    }
  }

  shouldComponentUpdate(nextProps: TemplateItemProps, nextState: State) {
    return !(
      templateEqual(this.props.template, nextProps.template) &&
      shallowEqual(this.props.componentProps, nextProps.componentProps) &&
      this.props.componentMapper === nextProps.componentMapper &&
      shallowEqual(this.state, nextState)
    );
  }

  render() {
    if (this.state.error) {
      return createElement(ErrorNotification, { errorMessage: this.state.error });
    }

    const { parsedTemplate } = this.state;
    const root = this.flattenRoot(parsedTemplate);

    let component: JSX.Element;
    if (typeof root === 'string') {
      component = D.span({}, root);
    } else if (isArray(root)) {
      return root;
    } else if (root) {
      // propagate also props.children, we need this for react-resizable
      // to be able to add resize handle to templated items
      const children = this.props.children ? [root.props.children, this.props.children] : root.props.children;
      const { componentProps } = this.props;
      // merge styles instead of replacing them, so a style override
      // (e.g. element size in the knowledge map) keeps the template ones
      const style = componentProps?.style && root.props.style
        ? { ...root.props.style, ...componentProps.style }
        : componentProps?.style ?? root.props.style;
      component = cloneElement(root, {
        ...root.props,
        ...componentProps,
        style,
        className: classNames(
          Maybe.fromNullable(componentProps)
            .map((cp) => cp.className)
            .getOrElse(''),
          root.props.className
        ),
        children,
      });
    } else {
      component = null;
    }

    if (component && this.props.componentMapper) {
      component = this.props.componentMapper(component);
    }

    return component;
  }

  private flattenRoot(parsed: ReactElement<any> | ReactElement<any>[]) {
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        return null;
      } else if (parsed.length > 1) {
        return parsed;
      } else {
        return parsed[0];
      }
    } else {
      return parsed;
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    // prevent setState from compilations resolving after unmount
    this.compileVersion++;
  }

  private compileTemplate(props: TemplateItemProps, context: TemplateContext = this.context) {
    const { templateDataContext } = context;
    const version = ++this.compileVersion;

    const capturer = CapturedContext.inheritAndCapture(templateDataContext);
    this.appliedTemplateScope
      .compile(props.template.source)
      .then((template) => {
        const renderedHtml = template(props.template.options, { capturer, parentContext: templateDataContext });
        if (version !== this.compileVersion) {
          // a newer compilation has been started in the meantime
          return;
        }
        // parse to react, but do not omit whitespaces
        return ModuleRegistry.parseHtmlToReact(renderedHtml).then((parsedTemplate) => {
          if (version !== this.compileVersion) {
            return;
          }
          this.setState(
            { parsedTemplate, capturedContext: capturer.getResult(), error: undefined },
            () => props.onLoad?.()
          );
        });
      })
      .catch((error) => {
        if (version !== this.compileVersion) {
          return;
        }
        console.error(error);
        this.setState({ error }, () => props.onLoad?.());
      });
  }
}

function templateEqual(a: Template, b: Template) {
  return a === b || (a.source === b.source && isEqual(a.options, b.options));
}

function shallowEqual<T>(a: T, b: T) {
  if (Object.is(a, b)) {
    return true;
  }
  if (typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  for (const key in a) {
    if (!a.hasOwnProperty(key)) {
      continue;
    }
    if (!b.hasOwnProperty(key) || !Object.is(a[key], b[key])) {
      return false;
    }
  }
  for (const key in b) {
    if (!b.hasOwnProperty(key)) {
      continue;
    }
    if (!a.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
}

export default TemplateItem;
