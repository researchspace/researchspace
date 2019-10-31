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
import { Component, ReactElement, KeyboardEvent, SyntheticEvent } from 'react';
import { findDOMNode } from 'react-dom';
import { Modal, Button }from 'react-bootstrap';
import * as Kefir from 'kefir';
import * as assign from 'object-assign';
import * as _ from 'lodash';
import * as classNames from 'classnames';

import { Spinner } from 'platform/components/ui/spinner';

export type SaveSetDialogProps = HeadlessSaveSetDialogProps & {
  onHide: () => void;
};

export interface HeadlessSaveSetDialogProps extends ReactBootstrap.ModalDialogProps {
  onSave: (name: string) => Kefir.Observable<any>;
  maxSetSize: Data.Maybe<number>;
  title?: string;
  placeholder?: string;
}

enum States {
  USER_INPUT, LOADING, ERROR, SUCCESS,
}

interface State {
  state: States;
  errorMessage?: string;
}

const KEY_RETURN = 13;

export class SaveSetDialog extends Component<SaveSetDialogProps, State> {
  static defaultProps = {
    title: 'Save as new set',
    placeholder: 'Name of the set',
  }

  render() {
    return <Modal
      show={true}
      className='save-as-dataset-modal'
      onHide={this.props.onHide}
    >
      <Modal.Header closeButton={true}>
        <Modal.Title>
          {this.props.title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {React.createElement(HeadlessSaveSetDialog, this.props)}
      </Modal.Body>
    </Modal>;
  }
}

export class HeadlessSaveSetDialog extends Component<HeadlessSaveSetDialogProps, State> {
  static defaultProps = {
    placeholder: 'Name of the set',
  }

  constructor(props: HeadlessSaveSetDialogProps, context) {
    super(props, context);
    this.state = {
      state: States.USER_INPUT,
    };
  }

  render() {
    return <div>
      {this.showMessage()}
      {this.renderBody()}
    </div>;
  }

  renderBody() {
    const state = this.state.state;
    const isLoading = state === States.LOADING;
    const isSaved = state === States.SUCCESS;
    return <div className={classNames('form-inline', 'save-as-dataset-modal__form')}>
      <input
        className={classNames(
          'form-control',
          'save-as-dataset-modal__form__collection-name'
        )}
        placeholder={this.props.placeholder}
        type='text'
        ref='setName'
        onKeyDown={this.onKeyPress}
      />
      <button
        className={classNames(
          'btn', 'btn-primary',
          'save-as-dataset-modal__form__save-button'
        )}
        disabled={isLoading || isSaved}
        onClick={this.onSave}
      >
        {isLoading ? 'Saving...' : 'Save'}
      </button>
    </div>;
  }

  private onKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.keyCode === KEY_RETURN) {
      event.preventDefault();
      event.stopPropagation();
      this.onSave();
    }
  }

  private onSave = (event?: SyntheticEvent<HTMLButtonElement>) => {
    const setName = this.getInputElement().value;
    // check that the setname has at least 6 characters
    // to enforce distinguishing set names and
    // to ensure performant auto-suggestion queries
    if (setName.length < 6) {
      return this.setState({
        state: States.ERROR,
        errorMessage: `Name of the set must have at least six characters.`,
      });
    }
    event && event.preventDefault();
    this.setState({
      state: States.LOADING,
    });
    const saveResult = this.props.onSave(setName);
    const callback = (event) => {
      if (event.type === 'value') {
        this.setState({
          state: States.SUCCESS,
        });
        saveResult.offAny(callback);
        _.delay(() => {
          this.props.onHide();
        }, 3000);
      } else if (event.type === 'error') {
        this.setState({
          state: States.ERROR,
          errorMessage: event.value.response.text,
        });
      }
    };
    saveResult.onAny(callback);
  }

  private showMessage = (): ReactElement<any> => {
    const {maxSetSize} = this.props;
    switch (this.state.state) {
    case States.USER_INPUT:
      return null;
    case States.LOADING:
      return <Spinner />;
    case States.SUCCESS:
      return <div className='save-as-dataset-modal__success-message'>
        New set has been saved successfully!<br/>
        {
          maxSetSize.isJust
            ? 'Please be aware that the system has been configured ' +
              'to allow for storing ' + maxSetSize.get() + ' at maximum.'
            : ''
        }
      </div>;
    case States.ERROR:
      return <div className='save-as-dataset-modal__error-message'>
        {this.state.errorMessage}
      </div>;
    }
  }

  private getInputElement() {
    return findDOMNode(this.refs['setName']) as HTMLInputElement;
  }
}
