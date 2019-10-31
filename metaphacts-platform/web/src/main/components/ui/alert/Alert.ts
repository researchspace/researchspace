/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import { Component } from 'react';
import * as D from 'react-dom-factories';
import * as classNames from 'classnames';
import {isEmpty} from 'lodash';

import './alert-component.scss';

export enum AlertType {
    NONE,
    INFO,
    WARNING,
    SUCCESS,
    DANGER,
}

export interface AlertConfig extends React.Props<Alert> {
  className?: string;
  alert: AlertType;
  message: string;
}

export function Error(message: string): AlertConfig {
  return {
    alert: AlertType.DANGER,
    message: message,
  };
}

export class Alert extends Component<AlertConfig, {}> {
  constructor(props: AlertConfig) {
    super(props);
  }

  render() {
    return D.div(
      {
        className: classNames(
          'alert-component',
          this.getCSS(this.props.alert),
          this.props.className
        ),
      },
      isEmpty(this.props.message) ? '' : this.props.message,
      this.props.children,
    );
  }

  getCSS = (alert: AlertType) => {
    switch (alert) {
      case AlertType.INFO:     return 'alert-component__info';
      case AlertType.WARNING:  return 'alert-component__warning';
      case AlertType.DANGER:   return 'alert-component__danger';
      case AlertType.SUCCESS:  return 'alert-component__success';
      case AlertType.NONE:     return 'alert-component__none';
      default: return 'alert-component';
    }
  }
}
