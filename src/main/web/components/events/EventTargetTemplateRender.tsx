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
import * as React from 'react';

import { Component } from 'platform/api/components';
import { listen, BuiltInEvents } from 'platform/api/events';
import { Cancellation } from 'platform/api/async/Cancellation';
import { TemplateItem } from 'platform/components/ui/template';

export interface EventTargetTemplateRenderConfig {
  /**
   * Identifier which will be used as event target id.
   */
  id: string;
  /**
   * <semantic-link uri='http://help.researchspace.org/resource/FrontendTemplating'>Template</semantic-link> that will be rendered with data passed as context variables.
   */
  template: string;
}
type Props = EventTargetTemplateRenderConfig;

export interface State {
  key?: number;
  data?: object;
}

/**
 * Updates the template component and passes it new properties.
 *
 * @example
 * <mp-event-trigger id='event-trigger' type='Component.TemplateUpdate' targets='["event-target"]'
 *     data='{"iri": "http://example.com/resource"}'>
 *     <button>Update</button>
 * </mp-event-trigger>
 *
 * <mp-event-target-template-render id='event-target' template='{{> template}}'>
 *     <template id='template'>
 *        <div>
 *          {{#if iri}}
 *            <mp-label iri='{{iri}}'></mp-label>
 *          {{/if}}
 *        </div>
 *     </template>
 * </mp-event-target-template-render>
 */
export class EventTargetTemplateRender extends Component<Props, State> {
  private readonly cancellation = new Cancellation();

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      key: 0,
      data: {},
    };
  }

  componentDidMount() {
    this.cancellation
      .map(
        listen({
          eventType: BuiltInEvents.ComponentTemplateUpdate,
          target: this.props.id,
        })
      )
      .observe({
        value: ({ data }) => this.setState((prevState: State): State => ({ key: prevState.key + 1, data })),
      });
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  render() {
    const { template: source } = this.props;
    const { key, data: options } = this.state;
    return <TemplateItem key={key} template={{ source, options }} />;
  }
}

export default EventTargetTemplateRender;
