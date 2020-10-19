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

import { Props as ReactProps, ReactElement, createFactory, Children, cloneElement, SFC } from 'react';
import * as ReactBootstrap from 'react-bootstrap';
import * as assign from 'object-assign';
import * as _ from 'lodash';
import * as block from 'bem-cn';
import * as classNames from 'classnames';

import { listen } from 'platform/api/events';

import { componentHasType } from 'platform/components/utils';
import { Component } from 'platform/api/components';

import { getOverlaySystem } from './OverlaySystem';
import OverlayDialogTrigger from './OverlayDialogTrigger';
import OverlayDialogContent from './OverlayDialogContent';
import { CloseEvent } from './OverlayDialogEvents';

const Modal = createFactory(ReactBootstrap.Modal);
const ModalHeader = createFactory(ReactBootstrap.Modal.Header);
const ModalTitle = createFactory(ReactBootstrap.Modal.Title);
const ModalBody = createFactory(ReactBootstrap.Modal.Body);

import './overlay-dialog.scss';

// These props are delegates of OverlayProps
export interface OverlayDialogProps extends ReactBootstrap.ModalDialogProps {
  onHide: () => void;
  title?: string;
  type?: string;
  className?: string;
  show?: boolean;
  bsSize?: 'lg' | 'large' | 'sm' | 'small';
}

export const OverlayDialog: SFC<OverlayDialogProps> = (props: OverlayDialogProps) => {
  // if type is not set or incorrect we will default silently to modal
  const type = props.type && (props.type === 'modal' || props.type === 'lightbox') ? props.type : 'modal';
  // use provided classname or choose on type
  const className = props.className ? props.className : type === 'lightbox' ? 'overlay-lightbox' : 'overlay-modal';

  const b = block(className);


  return Modal(
    assign(
      {},
      props,
      // we don't want to have backdrop for lightbox
      {
        onHide: props.onHide,
        backdrop: type === 'modal' ? 'static' : false,
        className: b('').toString(),
        dialogClassName: classNames('modal-dialog', b('dialog').toString()),
        bsSize: (props.type === 'modal' || props.type === undefined) && props.bsSize ? props.bsSize : null,
      }
    ),
    props.title
      ? ModalHeader({ closeButton: true, className: b('header').toString() }, ModalTitle({}, props.title))
      : null,
    ModalBody(
      {
        className: b('body').toString(),
      },
      props.children
    )
  );
};

export interface OverlayComponentProps extends ReactProps<OverlayComponent> {
  /**
   * Dialog id, needs to be defined when components should listen to events.
   */
  id?: string;

  /**
   * Show dialog on mount.
   *
   * @default false
   */
  show?: boolean;

  // title to render
  title: string;
  // type could be 'dialog' or 'lightbox', lightbox will span over all space, dialog will be small
  type?: string;
  // what dialog css class to use. Defaults to 'overlay-modal'
  // when type=modal and 'overlay-lightbox' when type=lightbox
  // css should follow BEM, example is @overlay-dialog.less/.overlay-modal
  className?: string;
  // Size of dialog. It's used when type = 'modal'.
  // Default width of the dialog is 600px.
  // Width is 900px when bsSize is equal to 'lg' or 'large'
  // and 300px when bsSize is equal to 'sm' or 'small'.
  bsSize?: 'lg' | 'large' | 'sm' | 'small';
}

/**
 * Component that displays it's contents in page-wide lightbox/overlay.
 * @see OverlayProps for props documentation
 * Usage:
 * <overlay-dialog data-title="OverlayDialog" data-type="modal|lightbox">
 * <overlay-trigger>
 * <button class="btn btn-primary">Open in lightbox</button>
 * </overlay-trigger>
 * <overlay-content>
 *   content here
 * </overlay-content>
 * </overlay-dialog>
 */
export class OverlayComponent extends Component<OverlayComponentProps> {
  constructor(props: OverlayComponentProps, context: any) {
    super(props, context);
  }

  componentDidMount() {
    if (this.props.show) {
      // show dialog immediately when component is mounted
      this.showDialog();
    }

    // if 'id' is defined then we should listen to events that can be send to the dialog component
    if (this.props.id) {
      /*
       * Hide the dialog on CloseEvent.
       */
      this.cancel.map(
        listen({
          target: this.props.id,
          eventType: CloseEvent,
        })
      ).observe({
        value: () => {
          this.onHide();
        }
      });
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.onHide();
  }

  render() {
    // 1. find anchor child and body child
    const children = Children.toArray(this.props.children);
    const anchorComponent = _.find(children, (child) => componentHasType(child, OverlayDialogTrigger));

    if (anchorComponent) {
      const anchorChild = (Children.only(anchorComponent) as ReactElement<any>).props.children;
      const props = {
        onClick: (event: React.SyntheticEvent<any>) => {
          event.preventDefault();
          this.showDialog();
        },
      };
      return cloneElement(anchorChild, props);
    } else {
      return null;
    }
  }

  private showDialog = () => {
    const children = Children.toArray(this.props.children);
    const bodyComponent = _.find(children, (child) => componentHasType(child, OverlayDialogContent));
    const bodyChild = (Children.only(bodyComponent) as ReactElement<any>).props.children;
    getOverlaySystem().show(
      this.props.title,
      OverlayDialog({
        show: true,
        title: this.props.title,
        type: this.props.type,
        className: this.props.className,
        onHide: this.onHide,
        children: bodyChild,
        bsSize: this.props.bsSize,
      })
    );
  }

  private onHide = () => {
    getOverlaySystem().hide(this.props.title);
  }
}
export default OverlayComponent;
