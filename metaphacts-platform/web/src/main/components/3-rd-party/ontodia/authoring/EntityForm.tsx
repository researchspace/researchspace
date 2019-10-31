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

import * as React from 'react';
import { Children, ReactNode, cloneElement } from 'react';

import { Component } from 'platform/api/components';

import {
  CompositeValue, FieldDefinition, SemanticForm,
} from 'platform/components/forms';
import { isValidChild, universalChildren } from 'platform/components/utils';

import * as styles from './EntityForm.scss';

export interface EntityFormProps {
  fields: ReadonlyArray<FieldDefinition>;
  model: CompositeValue;
  onSubmit: (newData: CompositeValue) => void;
  onCancel: () => void;
}

interface State {
  model: CompositeValue;
}

export class EntityForm extends Component<EntityFormProps, State> {
  private initModel: CompositeValue;

  constructor(props: EntityFormProps, context) {
    super(props, context);
    this.initModel = this.props.model;
    this.state = {model: this.initModel};
  }

  componentWillReceiveProps(nextProps: EntityFormProps) {
    if (this.props.model !== nextProps.model) {
      this.initModel = nextProps.model;
      this.setState({model: this.initModel});
    }
  }

  private mapChildren(children: ReactNode): ReactNode {
    return Children.map(children, child => {
      if (isValidChild(child)) {
        if (child.type === 'button') {
          if (child.props.name === 'reset') {
            return cloneElement(child, {onClick: this.onReset});
          } else if (child.props.name === 'submit') {
            return cloneElement(child, {onClick: this.onSubmit});
          } else if (child.props.name === 'cancel') {
            return cloneElement(child, {onClick: () => this.props.onCancel()});
          }
        }
        if (child.props.children) {
          return cloneElement(child, {}, universalChildren(
            this.mapChildren(child.props.children)));
        }
      }
      return child;
    });
  }

  private onSubmit = () => {
    this.props.onSubmit(this.state.model);
  }

  private onReset = () => {
    this.setState({model: this.initModel});
  }

  render() {
    const mapped = this.mapChildren(this.props.children);
    return (
      <div className={styles.dialog}>
        <div className={styles.content}>
          <SemanticForm fields={this.props.fields}
            model={this.state.model}
            onLoaded={() => { /* nothing */ }}
            onChanged={model => this.setState({model})}>
            {mapped}
          </SemanticForm>
        </div>
      </div>
    );
  }
}
