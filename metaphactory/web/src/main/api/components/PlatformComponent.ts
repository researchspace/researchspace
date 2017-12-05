/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import { Component, ValidationMap, PropTypes } from 'react';

import { GlobalEventsContext, GlobalEventsContextTypes } from 'platform/api/events';
import * as TemplateService from 'platform/api/services/template';

import { SemanticContext, SemanticContextTypes } from './SemanticContext';
import { TemplateContext, TemplateContextTypes } from './TemplateContext';

export type ComponentContext = SemanticContext & TemplateContext & GlobalEventsContext;
export const ContextTypes: ValidationMap<any> = {
  ...SemanticContextTypes,
  ...TemplateContextTypes,
  ...GlobalEventsContextTypes,
};

export interface ComponentProps {
  /**
   * Scope with templates explicitely specified in the markup.
   *
   * If present then it means the component had been created from markup;
   * otherwise it has been created as part of another component.
   *
   * This property should be used only as implementation detail to template-related
   * components (like `SemanticIf`).
   */
  readonly markupTemplateScope?: TemplateService.TemplateScope;
}

/**
 * @author Alexey Morozov
 */
export abstract class PlatformComponent<P extends ComponentProps, S> extends Component<P, S> {
  static propTypes: { [K in keyof ComponentProps]?: any } = {
    markupTemplateScope: PropTypes.object,
  };

  static childContextTypes: any = TemplateContextTypes;

  static readonly contextTypes: any = ContextTypes;
  readonly context: ComponentContext;

  get appliedTemplateScope(): TemplateService.TemplateScope {
    return this.props.markupTemplateScope
      || this.context.templateScope
      || TemplateService.TemplateScope.default;
  }

  constructor(props: P, context: any) {
    super(props, context);
  }

  getChildContext(): TemplateContext {
    // resets template scope to explicitely provided one if
    // component have been created from markup
    return {
      templateScope: this.props.markupTemplateScope || this.context.templateScope,
    };
  }
}
