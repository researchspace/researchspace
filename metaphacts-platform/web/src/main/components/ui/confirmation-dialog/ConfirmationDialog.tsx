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
import { Modal, Button, ButtonGroup } from 'react-bootstrap';

export interface Props {
  message: string;
  onHide: () => void;
  onConfirm: (confirm: boolean) => void;
}

export class ConfirmationDialog extends React.Component<Props, {}> {
  render() {
    const {message, onHide, onConfirm} = this.props;
    return (
      <Modal onHide={onHide} show={true}>
        <Modal.Body>
          <Modal.Title>{message}</Modal.Title>
        </Modal.Body>
        <Modal.Footer>
          <ButtonGroup>
            <Button bsStyle='primary' onClick={e => onConfirm(true)}>Confirm</Button>
            <Button bsStyle='danger' onClick={e => onConfirm(false)}>Cancel</Button>
          </ButtonGroup>
        </Modal.Footer>
      </Modal>
    );
  }
}
