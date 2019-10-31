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

import {
  createFactory, createElement, ReactElement, KeyboardEvent, MouseEvent
} from 'react';

import * as D from 'react-dom-factories';
import { findDOMNode } from 'react-dom';
import * as ReactBootstrap from 'react-bootstrap';
import * as Kefir from 'kefir';
import * as assign from 'object-assign';
import * as _ from 'lodash';
import * as classNames from 'classnames';
import * as block from 'bem-cn';

import { Component } from 'platform/api/components';
import { Spinner } from 'platform/components/ui/spinner';

const Modal = createFactory(ReactBootstrap.Modal);
const ModalHeader = createFactory(ReactBootstrap.Modal.Header);
const ModalTitle = createFactory(ReactBootstrap.Modal.Title);
const ModalBody = createFactory(ReactBootstrap.Modal.Body);

export interface CreateResourceDialogProps extends ReactBootstrap.ModalDialogProps {
  title?: string;
  placeholder?: string;
  onSave: (name: string) => Kefir.Property<any>;
  onHide: () => void;
  show?: boolean;
}

enum States {
  USER_INPUT, LOADING, ERROR, SUCCESS,
}

interface CreateResourceDialogState {
  state: States;
  errorMessage?: string;
}

const REF_LDP_RESOURCE_NAME = 'ldpResourceName';

const b = block('create-ldp-resource-modal');
/**
 * Dialog for CreateNewResource action, should not be used standalone.
 */
export class CreateResourceDialog extends
  Component<CreateResourceDialogProps, CreateResourceDialogState> {
  constructor(props: CreateResourceDialogProps, context: any) {
    super(props, context);
    this.state = {
      state: States.USER_INPUT,
    };
  }

  render() {
    return Modal(
      assign(
        {}, this.props,
        {
          className: classNames('form-group', b('')),
          onHide: this.props.onHide,
          onEntered: () => this.getInputElement().focus(),
        }),
      ModalHeader(
        {closeButton: true},
        ModalTitle({}, this.props.title ? this.props.title : 'Create new resource')
      ),
      ModalBody(
        {},
        this.showMessage(),
        D.form(
          {
            className: b('form'),
          },
          D.input(
            {
              className: classNames('form-control', b('form__collection-name')),
              placeholder: this.props.placeholder ? this.props.placeholder : 'Name' ,
              type: 'text',
              ref: REF_LDP_RESOURCE_NAME,
              onKeyDown: this.onKeyPress,
            }
          ),
          D.button(
            {
              className: classNames('btn btn-primary', b('form__save-button')),
              disabled: this.isLoading() || this.isSuccess(),
              onClick: this.onSaveBtn,
            }, this.isLoading() ? 'Saving...' : 'Save'
          )
        )
      )
    );
  }

  private isLoading = () => {
    return this.state.state === States.LOADING;
  }

  private isSuccess = () => {
    return this.state.state === States.SUCCESS;
  }

  private onKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.keyCode === 13) {
      event.preventDefault();
      event.stopPropagation();
      this.onSave();
    }
  }

 private onSaveBtn = (event: MouseEvent<HTMLButtonElement>) => {
   event.preventDefault();
   event.stopPropagation();
   this.onSave();
 }

  private onSave = () => {
    const resourceName = this.getInputElement().value;
    if (resourceName.length === 0) {
      this.setState({
        state: States.ERROR,
        errorMessage: 'Name of the resource must not be empty',
      });
    } else {
      this.setState({
        state: States.LOADING,
      });
      const saveResult = this.props.onSave(resourceName);

      const callback = (event) => {
        if (event.type === 'value') {
          this.setState({
            state: States.SUCCESS,
          });
          saveResult.offAny(callback);
          _.delay(() => {
            this.props.onHide();
            // reset state i.e. in case the user
            // tries to create the same resource again while saving
            this.setState({
              state: States.USER_INPUT,
            });
          }, 1000);
        } else if (event.type === 'error') {
          this.setState({
            state: States.ERROR,
            errorMessage: event.value.response.text,
          });
        }
      };
      saveResult.onAny(callback);
    } // end else

  }

  private showMessage = (): ReactElement<any> => {
    switch (this.state.state) {
    case States.USER_INPUT:
      return null;
    case States.LOADING:
      return createElement(Spinner);
    case States.SUCCESS:
      return D.div({
        className: 'alert alert-success text-center',
      }, 'New LDP resource has been created successfully!'
      );
    case States.ERROR:
      return D.div({
        className: 'alert alert-danger text-center',
      }, this.state.errorMessage);
    }
  }

  private getInputElement() {
    return findDOMNode(this.refs[REF_LDP_RESOURCE_NAME]) as HTMLInputElement;
  }
}
