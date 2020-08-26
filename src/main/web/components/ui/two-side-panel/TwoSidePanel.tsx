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

import * as React from 'react';

import { listen, EventMaker } from 'platform/api/events';
import { Component, ComponentProps } from 'platform/api/components';

import { TemplateItem } from 'platform/components/ui/template';
import { Cancellation } from 'platform/api/async';

export interface TwoSidePanelEvents {
  'TwoSidePanel.ShowBack': {
    backVariables?: Record<string, any>
  },
  'TwoSidePanel.ShowFront': {}
}
const event: EventMaker<TwoSidePanelEvents> = EventMaker;
export const ShowBackEvent = event('TwoSidePanel.ShowBack');
export const ShowFrontEvent = event('TwoSidePanel.ShowFront');

export interface TwoSidePanelProps extends ComponentProps {
  id: string;

  front?: string;
  back?: string;

  frontVariables?: Record<string, any>;
  backVariables?: Record<string, any>;

  /**
   * @default true
   */
  refreshOnChange?: boolean;
}

interface State {
  showBack: boolean;
  backVariables: Record<string, any>;
}


export class TwoSidePanel extends Component<TwoSidePanelProps, State> {
  static defaultProps = {
    frontVariables: {},
    backVariables: {},
  };

  private readonly cancellation = new Cancellation();

  constructor(props, context) {
    super(props, context);

    this.state = {
      showBack: false,
      backVariables: {},
    };
  }

  componentDidMount() {
    this.cancellation
        .map(
          listen({
            eventType: ShowBackEvent,
            target: this.props.id,
          })
        )
        .observe({
          value: ({ data }) => {
            this.setState({
              showBack: true,
              backVariables: data?.backVariables || {}
            })
          }
        });

    this.cancellation
        .map(
          listen({
            eventType: ShowFrontEvent,
            target: this.props.id,
          })
        )
        .observe({
          value: () => {
            this.setState({
              showBack: false,
              backVariables: {}
            })
          }
        });
  }

  render() {
    if (this.state.showBack) {
      return (
        <TemplateItem template={{
          source: this.getTemplate('back'),
          options: {
            ... this.props.backVariables,
            ... this.state.backVariables
          }
        }} />
      );
    } else {
      return (
        <TemplateItem template={{
          source: this.getTemplate('front'),
          options: {
            ... this.props.frontVariables
          }
        }} />
      );
    }
  }

  private getTemplate(key: 'front' | 'back'): string | undefined {
    const propsTemplate = this.props[key];
    if (propsTemplate) {
      return propsTemplate;
    }
    const localScope = this.props.markupTemplateScope;
    const partial = localScope ? localScope.getPartial(key) : undefined;
    if (partial) {
      return partial.source;
    }
    return undefined;
  }
}

export default TwoSidePanel;
