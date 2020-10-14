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

import { Component, createFactory, createElement } from 'react';
import * as D from 'react-dom-factories';
import * as ReactBootstrap from 'react-bootstrap';
import { Left, Right } from 'data.either';

import { getOverlaySystem, OverlayDialog } from 'platform/components/ui/overlay';

import { Argument } from './QueryTemplateTypes';
import { QueryTemplateEditArgument } from './QueryTemplateEditArgument';

const Well = createFactory(ReactBootstrap.Well);
const Panel = createFactory(ReactBootstrap.Panel);
const PanelGroup = createFactory(ReactBootstrap.PanelGroup);
const FormGroup = createFactory(ReactBootstrap.FormGroup);
const ControlLabel = createFactory(ReactBootstrap.ControlLabel);
const Button = createFactory(ReactBootstrap.Button);
const ButtonToolbar = createFactory(ReactBootstrap.ButtonToolbar);

export interface Props {
  args: Data.Either<Argument, Argument>[];
  variables: string[];
  onAdd: (arg: Data.Either<Argument, Argument>) => void;
  onDelete: (index: number) => void;
  onChange: (arg: Data.Either<Argument, Argument>, index: number) => void;
}

export interface State {
  activeKey?: number;
}

export class QueryTemplateArgumentsComponent extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      activeKey: 0,
    };
  }

  private handleAddNewArgument = () => {
    const emptyArgument = {
      label: '',
      variable: '',
      comment: '',
      optional: false,
      valueType: '',
    };

    this.setState({ activeKey: this.props.args.length }, () => {
      this.props.onAdd(Left<Argument, Argument>(emptyArgument));
    });
  };

  private handleDeleteArgument = (index) => {
    const title = 'Delete Argument';
    const body = D.div(
      { style: { textAlign: 'center' } },
      D.h5({ style: { margin: '0 0 20px' } }, 'Are You Sure?'),
      ButtonToolbar(
        { style: { display: 'inline-block' } },
        Button(
          {
            bsStyle: 'success',
            onClick: () => {
              getOverlaySystem().hide(title);

              this.props.onDelete(index);
            },
          },
          'Yes'
        ),
        Button({ bsStyle: 'danger', onClick: () => getOverlaySystem().hide(title) }, 'No')
      )
    );

    getOverlaySystem().show(
      title,
      createElement(OverlayDialog, {
        show: true,
        title: title,
        bsSize: 'sm',
        onHide: () => getOverlaySystem().hide(title),
        children: body,
      })
    );
  };

  private handleChangeArgument = (arg: Argument, index, isValid) => {
    const argument = isValid ? Right<Argument, Argument>(arg) : Left<Argument, Argument>(arg);

    this.props.onChange(argument, index);
  };

  private renderArgument = (argument: Argument, index: number, isValid: boolean) => {
    const { args, variables } = this.props;

    const filteredArgs = args.filter((arg, i) => {
      return i !== index;
    });

    const notAvailableLabels = filteredArgs.map((arg) => {
      return arg.fold(
        (item) => item.label,
        (item) => item.label
      );
    });

    const notAvailableVariables = filteredArgs.map((arg) => {
      return arg.fold(
        (item) => item.variable,
        (item) => item.variable
      );
    });

    return Panel(
      {
        key: index,
        header: argument.label.length ? argument.label : 'No Label',
        eventKey: index,
        onSelect: (key) => this.setState({ activeKey: key }),
        bsStyle: isValid ? 'default' : 'danger',
      },
      createElement(QueryTemplateEditArgument, {
        argument,
        variables,
        notAvailableLabels,
        notAvailableVariables,
        onDelete: () => {
          this.handleDeleteArgument(index);
        },
        onChange: (arg, flag) => {
          this.handleChangeArgument(arg, index, flag);
        },
      })
    );
  };

  render() {
    const { activeKey } = this.state;

    return FormGroup(
      { style: { width: '50%' } },
      ControlLabel({}, 'Arguments'),
      Well(
        {},
        this.props.args.length
          ? PanelGroup(
              { activeKey: activeKey, accordion: true },
              this.props.args.map((item, index) => {
                return item.fold(
                  (arg) => this.renderArgument(arg, index, false),
                  (arg) => this.renderArgument(arg, index, true)
                );
              })
            )
          : null,
        Button({ bsSize: 'small', bsStyle: 'primary', onClick: this.handleAddNewArgument }, 'Add New Argument')
      )
    );
  }
}

export type component = QueryTemplateArgumentsComponent;
export const component = QueryTemplateArgumentsComponent;
export const factory = createFactory(component);
export default component;
