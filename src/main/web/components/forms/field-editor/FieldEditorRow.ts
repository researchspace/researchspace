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

import { createFactory, createElement, Component, ReactNode } from 'react';
import * as D from 'react-dom-factories';
import { Row, Col, Button } from 'react-bootstrap';
import * as bem from 'bem-cn';

const row = createFactory(Row);
const col = createFactory(Col);

export const CLASS_NAME = 'field-editor';
const block = bem(CLASS_NAME);

interface Props {
  expandOnMount?: boolean;
  expanded: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  label: string;
  error?: Error;
  element?: ReactNode;
}

export class FieldEditorRow extends Component<Props, {}> {
  componentDidMount() {
    if (this.props.expandOnMount) {
      this.toggle({ expand: true });
    }
  }

  componentWillReceiveProps(nextProps: Props) {
    if (!this.props.expandOnMount && nextProps.expandOnMount) {
      // expand if row becomes non-collapsible
      this.toggle({ expand: true });
    }
  }

  render() {
    const { onCollapse, expanded, label, error } = this.props;
    const children = this.props.element || this.props.children;
    const canBeCollapsed = expanded && onCollapse;
    return D.div(
      { className: block('row').toString() },
      D.div({ className:block('input-header').toString(), onClick: () => this.toggle({ expand: true }) }, D.span({}, label)),
      D.div({ className:'inputAndButton-wrapper'}, 
        D.div(
          { style: { flex: '1' }  },
          D.div(
            {},
            expanded
              ? children
              : D.div(
                  {
                    className: block('expand').toString(),
                    onClick: () => this.toggle({ expand: true }),
                  },
                  `Click to add an optional ${label}.`
                )
          ),
          error ? 
          D.div({ className: block('error').toString() }, 
            D.div({className:"field-editor__error-icon"}, 
              D.i({ className: 'material-icons-round' }, 'priority_high')
            ),
            D.div({}, 
              D.div({className:"field-editor__error-title"}, "Error!"),
              D.div({}, error.message)
            )
          ) 
          : null
        ),
        D.div(
          { style: { display: canBeCollapsed ? undefined : 'none' } },
          createElement(
            Button,
            {
              className: block('collapse').toString(),
              onClick: () => this.toggle({ expand: false }),
            },
            D.span({className: 'material-icons-round'}, 'close')
          )
        )
      )
    );
  }

  private toggle = ({ expand }: { expand: boolean }) => {
    if (this.props.expanded === expand) {
      return;
    }

    if (expand && this.props.onExpand) {
      this.props.onExpand();
    } else if (!expand && this.props.onCollapse) {
      this.props.onCollapse();
    }
  };
}

export default createFactory(FieldEditorRow);
