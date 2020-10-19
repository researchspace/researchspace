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
  'TwoSidePanel.ShowBack': Record<string, any>;
  'TwoSidePanel.ShowFront': Record<string, any>;
}
const event: EventMaker<TwoSidePanelEvents> = EventMaker;
export const ShowBackEvent = event('TwoSidePanel.ShowBack');
export const ShowFrontEvent = event('TwoSidePanel.ShowFront');

export interface TwoSidePanelProps extends ComponentProps {
  id: string;

  /**
   * Front side template .
   */
  front?: string;

  /**
   * Back side template .
   */
  back?: string;

  /**
   * Default variables that are propagated to the front template .
   */
  frontVariables: Record<string, any>;


  /**
   * Default variables that are propagated to the back template .
   */
  backVariables: Record<string, any>;

  /**
   * Don't re-render the template when side is switched.
   *
   * @default true
   */
  refreshOnChange?: boolean;
}

interface State {
  showBack: boolean;
  frontVariables: Record<string, any>;
  backVariables: Record<string, any>;
}


/**
 * Flip panel component. See Help:MPComponents documentation page for more detauls.
 *
 * <two-side-panel id='component-id' front='{{> front}}' back='{{> back}}'>
 *    <template id='front'></template>
 *    <template id='back'></template>
 * </two-side-panel>
 *
 */
export class TwoSidePanel extends Component<TwoSidePanelProps, State> {
  static defaultProps = {
    variables: {},
    refreshOnChange: true,
  };

  private readonly cancellation = new Cancellation();

  constructor(props, context) {
    super(props, context);

    this.state = {
      showBack: false,
      frontVariables: {},
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
            if (data?.dontRefresh && this.state.showBack) {
              // if event has don't refresh flag and we are already showing back panel then do nothing
            } else {
              this.setState({
                showBack: true,
                backVariables: data || {}
              })
            }
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
          value: ({data}) => {
            this.setState({
              showBack: false,
              frontVariables: data || {}
            })
          }
        });
  }

  render() {
    if (this.props.refreshOnChange) {
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
              ... this.props.frontVariables,
              ... this.state.frontVariables
            }
          }} />
        );
      }
    } else {
      const backPanel =
        this.state.showBack ?
        (
          <TemplateItem template={{
            source: this.getTemplate('back'),
            options: {
              ... this.props.backVariables,
              ... this.state.backVariables
            }
          }} />
        ) : null;
      return (
        <React.Fragment>
          <TemplateItem
            componentProps={{
              style: {
                display: this.state.showBack ? 'none' : 'block',
              },
            }}
            template={{
              source: this.getTemplate('front'),
              options: {
                ... this.props.frontVariables,
                ... this.state.frontVariables
              }
            }}
          />
          {backPanel}
        </React.Fragment>
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
