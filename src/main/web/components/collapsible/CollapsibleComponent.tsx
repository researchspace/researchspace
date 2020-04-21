/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
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
import * as classNames from 'classnames';

import { TemplateItem } from 'platform/components/ui/template';

import * as styles from './CollapsibleComponent.scss';

interface Props {
  toggleCollapsibleTemplate: string;
  cancelCallback: () => void;
}

interface State {
  containerOpen: boolean;
}

export class CollapsibleComponent extends React.Component<Props, State> {
  static defaultProps = {
    toggleCollapsibleTemplate: `<div>
        <i className="fa fa-pencil"></i>
        <strong>
          <a>Create new...</a>
        </strong>
      </div>`,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      containerOpen: false,
    };
  }

  render() {
    let toggleClasses = classNames(styles.toggle, {
      open: this.state.containerOpen,
      closed: !this.state.containerOpen,
    });
    let contentClasses = classNames('rs-collapsible__content', {
      show: this.state.containerOpen,
      hidden: !this.state.containerOpen,
    });

    const child = React.Children.only(this.props.children) as React.ReactElement<any>;

    return (
      <div>
        <div onClick={this.onToggleCollapsed} className={toggleClasses}>
          <TemplateItem template={{ source: this.props.toggleCollapsibleTemplate }} />
        </div>
        <div className={contentClasses}>{React.cloneElement(child, { cancelCallback: this.onCollapse })}</div>
      </div>
    );
  }

  private onCollapse = () => this.setState({ containerOpen: false });

  private onToggleCollapsed = () => this.setState({ containerOpen: !this.state.containerOpen });
}

export default CollapsibleComponent;
