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
import { ReactElement, ReactChild, ComponentClass, Component, Children } from 'react';
import * as _ from 'lodash';
import { Panel as BootstrapPanel, PanelProps as BootstrapPanelProps } from 'react-bootstrap';

export interface PanelProps extends BootstrapPanelProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  collapsible?: boolean;
}

import { PanelHeader } from './PanelHeader';
import { PanelFooter } from './PanelFooter';
import { PanelBody } from './PanelBody';

/**
 * Wrapper for react-bootstrap Panel component with custom header and footer templates.
 *
 * @example
 *  <mp-panel>
 *    <mp-panel-header>
 *      <div>Title</div>
 *    </mp-panel-header>
 *    <mp-panel-body>
 *      <div>Title</div>
 *    </mp-panel-body>
 *    <mp-panel-footer>
 *      <div>Title</div>
 *    </mp-panel-footer>
 *  </mp-panel>
 */
export class Panel extends Component<PanelProps, {}> {
  render() {
    const children = Children.toArray(this.props.children);
    const header = this.findComponent(children, PanelHeader);
    const body = this.findComponent(children, PanelBody);
    const footer = this.findComponent(children, PanelFooter);

    const { header: _header, footer: _footer, collapsible, ...panelProps } = this.props;

    // When collapsible is true, Panel.Body with collapsible={true} is a shorthand
    // that wraps the body in Panel.Collapse automatically
    const bodyElement = collapsible ? (
      <BootstrapPanel.Body collapsible>{body}</BootstrapPanel.Body>
    ) : (
      <BootstrapPanel.Body>{body}</BootstrapPanel.Body>
    );

    // For collapsible panels, header should use Panel.Title with toggle to enable click-to-expand
    const headerElement = header ? (
      collapsible ? (
        <BootstrapPanel.Heading>
          <BootstrapPanel.Title toggle>{header}</BootstrapPanel.Title>
        </BootstrapPanel.Heading>
      ) : (
        <BootstrapPanel.Heading>{header}</BootstrapPanel.Heading>
      )
    ) : null;

    return (
      <BootstrapPanel {...panelProps}>
        {headerElement}
        {bodyElement}
        {footer && <BootstrapPanel.Footer>{footer}</BootstrapPanel.Footer>}
      </BootstrapPanel>
    );
  }

  private findComponent = (children: Array<React.ReactNode>, component: ComponentClass<any>): ReactElement<any> => {
    const element = _.find(children, (child) => (child as React.ReactElement<any>).type === component) as ReactElement<
      any
    >;
    return element;
  };
}
export default Panel;
