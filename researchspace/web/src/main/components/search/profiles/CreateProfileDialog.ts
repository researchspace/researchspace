/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
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

/**
 * @author Artem Kozlov <ak@metaphacts.com>
 */

import { Component, createFactory, ReactElement } from 'react';
import * as D from 'react-dom-factories';
import { findDOMNode } from 'react-dom';
import * as ReactBootstrap from 'react-bootstrap';
import * as assign from 'object-assign';
import * as classnames from 'classnames';

const Modal = createFactory(ReactBootstrap.Modal);
const Button = createFactory(ReactBootstrap.Button);
const ModalHeader = createFactory(ReactBootstrap.Modal.Header);
const ModalTitle = createFactory(ReactBootstrap.Modal.Title);
const ModalBody = createFactory(ReactBootstrap.Modal.Body);

export interface ProfileMetadata {
  name: string
  description: string
}

export interface Props extends ReactBootstrap.ModalDialogProps {
  onHide: () => void
  onSave: (profileMetadata: ProfileMetadata) => void
  error: Data.Maybe<string>
  show: boolean
}

enum States {
  USER_INPUT, LOADING, ERROR, SUCCESS,
}

interface InputValidationState {
  name: boolean
  description: boolean
}

interface State {
  state?: States,
  errorMessage?: string
  inputValidationState?: InputValidationState
}

export class CreateProfileDialogClass extends Component<Props, State> {

  private static nameInputRef = 'name';
  private static descriptionInputRef = 'description';

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = {
      state: States.USER_INPUT,
      inputValidationState: {
        name: true,
        description: true,
      },
    };
  }

  componentWillMount() {
    this.initState(this.props);
  }

  componentWillReceiveProps(props: Props) {
    this.initState(props);
  }

  render() {
    return Modal(
      assign(
        {}, this.props,
        {
          className: 'new-profile-modal',
          onHide: this.props.onHide,
          onEntered: () => this.getNameInputElement().focus(),
        }
      ),
      this.dialogHeader(),
      this.dialogBody()
    );
  }

  private initState(props: Props) {
    if (props.error.isJust) {
      this.setState({
        state: States.ERROR,
        errorMessage: props.error.get(),
      });
    }
  }

  private dialogHeader() {
    return ModalHeader(
      {
        closeButton: true,
      },
      ModalTitle({}, 'Create new Relationship Profile')
    );
  }

  private dialogBody() {
    return ModalBody(
      {},
      this.showMessage(),
      D.form(
        {
          className: 'new-profile-modal__form',
        },
        D.input(
          {
            className: this.inputClassName(
              'new-profile-modal__form__profile-name',
              this.state.inputValidationState.name
            ),
            placeholder: 'Profile Name',
            type: 'text',
            required: true,
            ref: CreateProfileDialogClass.nameInputRef,
          }
        ),
        D.textarea(
          {
            className: this.inputClassName(
              'new-profile-modal__form__profile-description',
              this.state.inputValidationState.description
            ),
            placeholder: 'Profile Description',
            required: true,
            ref: CreateProfileDialogClass.descriptionInputRef,
          }
        ),
        Button(
          {
            className: 'new-profile-modal__form__save-button',
            disabled: this.isLoading(),
            onClick: this.onSave.bind(this),
          }, this.isLoading() ? 'Saving...' : 'Save'
        )
      )
    );
  }

  private onSave() {
    if (this.isFormValid()) {
      this.setState({
        state: States.LOADING,
      });
      this.props.onSave({
        name: this.getNameInputElement().value,
        description: this.getDescriptionInputElement().value,
      });
    } else {
      this.setState({
        state: States.ERROR,
        errorMessage: 'Some required fields are missing!',
      });
    }
  }

  private showMessage(): ReactElement<any> {
    switch (this.state.state) {
    case States.ERROR:
      return D.div({
        className: 'save-as-dataset-modal__error-message',
      }, this.state.errorMessage);
    default: return null;
    }
  }

  private isLoading() {
    return this.state.state === States.LOADING;
  }

  private isFormValid() {
    const isNameValid = this.isInputValid('name');
    const isDescriptionValid = this.isInputValid('description');

    this.setState({
      inputValidationState: {
        name: isNameValid,
        description: isDescriptionValid,
      },
    });

    return isNameValid && isDescriptionValid;
  }

  private inputClassName(baseClass: string, isValid: boolean) {
    return classnames({
      [baseClass]: isValid,
      [`${baseClass}--has-error`]: !isValid,
    });
  }

  private isInputValid(ref: string): boolean {
    return this.getInputElement(ref).validity.valid;
  }

  private getNameInputElement() {
    return this.getInputElement(CreateProfileDialogClass.nameInputRef);
  }

  private getDescriptionInputElement() {
    return this.getInputElement(CreateProfileDialogClass.descriptionInputRef);
  }

  private getInputElement(ref): HTMLInputElement {
    return findDOMNode(this.refs[ref]) as HTMLInputElement;
  }
}

const CreateProfileDialog = createFactory(CreateProfileDialogClass);
export default CreateProfileDialog;
