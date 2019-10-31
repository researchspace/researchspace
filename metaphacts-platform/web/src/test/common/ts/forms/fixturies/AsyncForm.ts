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

import { createElement, ReactNode } from 'react';

import { Rdf } from 'platform/api/rdf';
import {
  SemanticForm, SemanticFormProps, DataState, FieldValue, CompositeValue, FieldDefinitionProp,
} from 'platform/components/forms';

import { mount } from 'platform-tests/configuredEnzyme';

export class AsyncForm {
  /** enzyme wrapper */
  wrapper: any;
  private props: SemanticFormProps;

  model: CompositeValue;
  dataState: DataState;

  private scheduledUpdate: number | null = null;
  private runOnceOnUpdate: Array<() => void> = [];

  constructor(
    readonly fields: ReadonlyArray<FieldDefinitionProp>,
    readonly children: ReactNode,
  ) {}

  private onChanged = (model: CompositeValue) => {
    this.model = model;
    if (this.scheduledUpdate !== null) {
      clearImmediate(this.scheduledUpdate);
    }
    this.scheduledUpdate = setImmediate(this.updateProps);
  }

  private updateProps = () => {
    this.wrapper.setProps({...this.props, model: this.model});
  }

  mount(params: { model?: FieldValue; } = {}): Promise<this> {
    return new Promise(resolve => {
      this.props = {
        debug: true,
        fields: this.fields,
        children: this.children,
        model: params.model || FieldValue.fromLabeled({value: Rdf.literal('')}),
        onChanged: this.onChanged,
        onLoaded: model => {
          this.model = model;
          this.wrapper.setProps({...this.props, model});
          resolve(this);
        },
        onUpdated: dataState => {
          this.dataState = dataState;
          this.invokeUpdateSubscribers();
        },
      };
      const element = createElement(SemanticForm, this.props);
      this.wrapper = mount(element);
      return this;
    });
  }

  private invokeUpdateSubscribers() {
    for (const callback of this.runOnceOnUpdate) {
      try {
        callback();
      } catch (err) {
        console.error('Error while running form update subscription', err);
      }
    }
    this.runOnceOnUpdate = [];
  }

  performChangeAndWaitUpdate(change: () => void): Promise<this> {
    return new Promise(resolve => {
      this.runOnceOnUpdate.push(() => resolve(this));
      change();
    });
  }
}
