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
import * as React from 'react';
import { Modal, Button, ButtonGroup } from 'react-bootstrap';

export interface Props {
  title?: string;
  message: string;
  onHide: () => void;
  onConfirm: (confirm: boolean) => void;
}

export class ConfirmationDialog extends React.Component<Props, {}> {
  render() {
    const { title, message, onHide, onConfirm } = this.props;
    return (
      <Modal onHide={onHide} show={true}>
        <Modal.Header>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>{message}</p>
          <div className='form-btn-group'>
            <Button bsStyle="default" onClick={(e) => onConfirm(false)}>
              Cancel
            </Button>
            <Button bsStyle="default" className='btn-action' onClick={(e) => onConfirm(true)}>
              Confirm
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    );
  }
}
