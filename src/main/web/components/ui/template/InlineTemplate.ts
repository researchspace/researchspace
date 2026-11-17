/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { createElement } from 'react';

import { Component, ComponentProps } from 'platform/api/components';
import { trigger } from 'platform/api/events';

import { TemplateItem } from './TemplateItem';
import * as TemplateEvents from './TemplateEvents';

export interface InlineTemplateConfig {
  /**
   * Identifier used as the source of the `Template.LoadFailed` event, which is
   * triggered when the template cannot be loaded or rendered.
   */
  id?: string
  template?: string
  templateIri?: string
  options?: Record<string, any>
}

type InlineTemplateProps = InlineTemplateConfig & ComponentProps;

export class InlineTemplate extends Component<InlineTemplateProps> {
  render() {
    return createElement(
      TemplateItem, {
        template: {
          source: this.getTemplateString(),
          options: this.props.options
        },
        onError: this.onError,
      }
    );
  }

  private onError = (error: any) => {
    if (this.props.id) {
      trigger({
        eventType: TemplateEvents.TemplateLoadFailed,
        source: this.props.id,
        data: {
          templateIri: this.props.templateIri,
          message: error && error.message ? String(error.message) : String(error),
        },
      });
    }
  };

  private getTemplateString = (): string => {
    if (this.props.templateIri) {
      return `{{> "${this.props.templateIri}"}}`;
    }

    if (this.props.template) {
      return this.props.template;
    }

    // try to get default noResultTemplate "<template>" element with id template from the local scope
    const localScope = this.props.markupTemplateScope;
    const partial = localScope ? localScope.getPartial('template') : undefined;
    if (partial) {
      return partial.source;
    } else {
      throw Error("<inline-template> requires nested <template id='template'> or 'template' attribute.");
    }
  }

}

export default InlineTemplate;
