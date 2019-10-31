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
 * @author Andrey Nikolov an@metaphacts.com
 */

import * as React from 'react';
import * as _ from 'lodash';
import { FormControl, FormGroup, Button } from 'react-bootstrap';

import * as Navigation from 'platform/api/navigation';
import { Rdf } from 'platform/api/rdf';

import * as styles from './TextSelection.scss';

const ENTER_KEY_CODE = 13;

interface Props {
  onSelect: (text: string) => void;
  helpPage?: Rdf.Iri;
}

interface State {
  textValue?: string;
  helpUrl?: string;
}

export class TextSelection extends React.PureComponent<Props, State> {
  constructor(props, context) {
    super(props, context);
    this.state = {
      textValue: '',
      helpUrl: ''
    };

    if(props.helpPage)
        Navigation.constructUrlForResource(props.helpPage)
            .onValue(uri => this.setState({ helpUrl: uri.valueOf()}));
  }

  render() {
    return <div className={styles.holder}>
    {this.props.helpPage ? <a  href={this.state.helpUrl} target="_blank">
        <i className={styles.helpQuestionCircle}></i>
    </a> : null}
      <FormGroup className={styles.inputGroup}>
        <FormControl value={this.state.textValue}
          autoFocus={true}
          onChange={this.onValueChange}
          onKeyUp={this.onKeyUp}
          placeholder='text'
        />
      </FormGroup>
      <Button bsStyle='primary'
              disabled={this.isButtonDisabled()}
              onClick={this.submitText}
      >
          Find Text
      </Button>
    </div>;
  }

  private isButtonDisabled = () => _.isEmpty(this.state.textValue);

  private onValueChange = (event) =>
    this.setState({textValue: event.target.value});

  private submitText = (event) =>
    this.props.onSelect(this.state.textValue);

  private onKeyUp = (event) => {
    if (event.keyCode === ENTER_KEY_CODE) {
      this.submitText(event);
    }
  }
}
export default TextSelection;
