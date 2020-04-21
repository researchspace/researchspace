/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from 'react';
import { Button } from 'react-bootstrap';

import { Component } from 'platform/api/components';

import { Node } from 'platform/components/semantic/lazy-tree';
import { OverlayDialog } from 'platform/components/ui/overlay';

import { AlignKind } from './AlignmentNodeModel';

import * as styles from './ConfirmAlignDialog.scss';

export interface ConfirmAlignDialogProps {
  sourceNode: Node;
  targetNode: Node;
  onSubmit: (kind: AlignKind) => void;
  onClose: () => void;
}

export class ConfirmAlignDialog extends Component<ConfirmAlignDialogProps, {}> {
  static readonly KEY = 'ConfirmAlignDialog';

  render() {
    const { sourceNode, targetNode, onSubmit, onClose } = this.props;
    return (
      <OverlayDialog
        type="modal"
        show={true}
        className={styles.component}
        title="Select alignment relation type"
        onHide={onClose}
      >
        <Button bsSize="large" block={true} onClick={() => onSubmit(AlignKind.ExactMatch)}>
          <span className={styles.description}>
            <span className={styles.sourceTerm}>{Node.getLabel(sourceNode)}</span> is exact match (=) to{' '}
            <span className={styles.targetTerm}>{Node.getLabel(targetNode)}</span>
          </span>
        </Button>
        <Button bsSize="large" block={true} onClick={() => onSubmit(AlignKind.NarrowerMatch)}>
          <span className={styles.description}>
            <span className={styles.sourceTerm}>{Node.getLabel(sourceNode)}</span> is narrow match (≤) to{' '}
            <span className={styles.targetTerm}>{Node.getLabel(targetNode)}</span>
          </span>
        </Button>
      </OverlayDialog>
    );
  }
}
