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
import * as Kefir from 'kefir';
import { Alert } from 'react-bootstrap';
import { Cancellation, requestAsProperty } from 'platform/api/async';
import { addNotification, ErrorPresenter } from 'platform/components/ui/notification';
import * as request from 'platform/api/http';
import { ConfirmationDialog } from 'platform/components/ui/confirmation-dialog';
import { getOverlaySystem } from 'platform/components/ui/overlay';

/**
 * @example
 * <mp-restart-wrapper>
 *  <Button><i class="fa fa-power-off fa-5x" aria-hidden="true"></i></Button>
 * </mp-restart-wrapper>
 */
export class RestartWrapper extends React.Component {
  private readonly cancellation = new Cancellation();

  private onClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    showRestartConfirmationDialog((restart) => {
      if (restart) {
        this.cancellation.map(this.executePost()).observe({
          value: (iri) => {
            addNotification({
              autoDismiss: 57,
              message: 'System is restarting. Please reload the page and log in again when the system has restarted.',
              level: 'success',
            });
          },
          error: (error) => {
            addNotification({
              message: 'Restarting failed.',
              level: 'error',
            });
          },
        });
      }
    });
  };

  private executePost(): Kefir.Property<void> {
    const req = request.post('/rest/admin/system/restart');
    return requestAsProperty(req).map(() => {
      return undefined;
    });
  }

  componentWillUnmount() {
    this.cancellation.cancelAll();
  }

  render() {
    return <div className="mp-restart-wrapper">{this.renderBody()}</div>;
  }

  private renderBody() {
    const { children } = this.props;
    const childrenNumber = React.Children.count(children);
    if (childrenNumber !== 1) {
      return (
        <Alert bsStyle="warning">
          <ErrorPresenter error={new Error(`Expected children number is 1, but provided ${childrenNumber}`)} />
        </Alert>
      );
    }

    const child = React.Children.only(children);
    if (typeof child === 'object') {
      const childComponent = child as React.ReactElement<any>;
      return React.cloneElement(childComponent, { ...childComponent.props, onClick: this.onClick });
    } else {
      return child;
    }
  }
}

export default RestartWrapper;

function showRestartConfirmationDialog(execute: (b: boolean) => void) {
  const dialogRef = 'mp-restart-confirmation-dialog';
  const onHide = () => getOverlaySystem().hide(dialogRef);
  getOverlaySystem().show(
    dialogRef,
    <ConfirmationDialog
      message={'Are you sure you want to restart the system?'}
      onHide={onHide}
      onConfirm={(confirm) => {
        onHide();
        if (confirm) {
          execute(confirm);
        }
      }}
    />
  );
}
