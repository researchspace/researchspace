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

import { Component, createElement, createFactory } from 'react';
import * as D from 'react-dom-factories';
import { MenuItem, DropdownButton } from 'react-bootstrap';
import { assign } from 'lodash';
import * as block from 'bem-cn';
import * as ReactBootstrap from 'react-bootstrap';
import * as maybe from 'data.maybe';
import { List, Set } from 'immutable';
import * as classNames from 'classnames';
import * as Kefir from 'kefir';

import { Rdf } from 'platform/api/rdf';
import { SemanticTable, SemanticTableConfig } from 'platform/components/semantic/table';
import SideBySide from './SideBySideComparison';
import OverlayComparison from './OverlayComparison';
import { SaveSetDialog } from 'platform/components/sets';
import { getSetServiceForUser } from 'platform/api/services/ldp-set';
import { getOverlaySystem } from 'platform/components/ui/overlay';
import { rso } from '../../data/vocabularies/vocabularies';
import { CreateResourceDialog } from 'platform/components/ldp';
import LdpLinkService from '../../data/LdpLinkService';

import '../../../scss/lightbox.scss';

const Modal = createFactory(ReactBootstrap.Modal);
const ModalHeader = createFactory(ReactBootstrap.Modal.Header);
const ModalTitle = createFactory(ReactBootstrap.Modal.Title);
const ModalBody = createFactory(ReactBootstrap.Modal.Body);

const ACTION_DIALOG_REF = 'dialog-action';

export const OverlayDialogComponent = (props: any) => {
  const b = block('rs-lightbox-modal');

  return Modal(
    assign(
      {
        show: true,
      },
      props,
      {
        animation: false,
        backdrop: false,
        className: b.toString(),
        dialogClassName: b('dialog').toString(),
      }
    ) as any,
    ModalHeader(
      { closeButton: false, className: b('header').toString() },
      ModalTitle(
        {},
        D.button(
          {
            className: classNames('btn', 'btn-default', b('back-button').toString()),
            onClick: () => getOverlaySystem().hide(ACTION_DIALOG_REF),
          },
          D.i({}),
          'Back to Lightbox'
        ),
        props.title
      )
    ),
    ModalBody(
      {
        className: b('body').toString(),
      },
      D.div(
        {
          style: { height: 800 },
        },
        props.children
      )
    )
  );
};

type LightboxTableConfig = SemanticTableConfig & {
  iiifServerUrl: string;
};

interface LightboxTableProps {
  config: LightboxTableConfig;
}

/**
 * Table component wrapper which adds researchspace specific actions like:
 * image comparison, image overlay, etc.
 */
class LightBoxTable extends Component<LightboxTableProps, any> {
  refs: { table: SemanticTable };

  render() {
    const actions = D.div(
      { className: 'rs-lightbox-modal__actions' },
      createElement(
        DropdownButton,
        {
          id: 'lightbo-actions',
          title: 'Actions',
          pullRight: true,
          onToggle: () => this.forceUpdate(),
        },
        createElement(
          MenuItem,
          {
            disabled: this.getSelectedCount() < 1,
            onClick: () =>
              this.showDialogAction('Side-by-Side image comparison', SideBySide, this.props.config.iiifServerUrl),
          },
          'Compare side-by-side'
        ),

        createElement(
          MenuItem,
          {
            disabled: this.getSelectedCount() !== 2,
            onClick: () => this.showDialogAction('Image overlay', OverlayComparison, this.props.config.iiifServerUrl),
          },
          'Overlay'
        ),

        createElement(
          MenuItem,
          {
            onClick: this.showCreateNewSetDialog,
          },
          'Create new set'
        ),

        createElement(
          MenuItem,
          {
            disabled: this.getSelectedCount() < 1,
            onClick: this.showLinkDialog,
          },
          'Link'
        )
      )
    );

    return D.div({}, actions, createElement(SemanticTable, assign({ ref: 'table' }, this.props) as any));
  }

  private getSelectedCount = (): number => {
    return this.refs.table ? this.refs.table.getSelected().size : 0;
  };

  private getSelectedItems = (): Set<Rdf.Node> => {
    return this.refs.table.getSelected().map((item) => item.node);
  };

  private showDialogAction = (title: string, component: any, iiifServerUrl: string) => {
    const images = this.getSelectedItems()
      .map((node) => node.value)
      .toArray();
    getOverlaySystem().show(
      ACTION_DIALOG_REF,
      createElement(OverlayDialogComponent, {
        key: 'create-link',
        title: title,
        children: component({
          iiifServerUrl: iiifServerUrl,
          comparedImages: images,
        }),
      })
    );
  };

  private showLinkDialog = () => {
    const dialogRef = 'create-link';
    getOverlaySystem().show(
      dialogRef,
      createElement(CreateResourceDialog, {
        onSave: this.createLink,
        onHide: () => getOverlaySystem().hide(dialogRef),
        show: true,
        title: 'Create Linked Resource',
        placeholder: 'Enter link title',
      })
    );
  };

  private createLink = (name: string): Kefir.Property<any> => {
    const images = this.getSelectedItems();
    return LdpLinkService.createLink(name, images);
  };

  private showCreateNewSetDialog = () => {
    const images = this.getSelectedItems().toList() as List<Rdf.Iri>;
    const dialogRef = 'add-to-new-set';
    getOverlaySystem().show(
      dialogRef,
      createElement(SaveSetDialog, {
        onSave: (name: string) =>
          getSetServiceForUser().flatMap((service) => service.createSetAndAddItems(name, images)),
        onHide: () => getOverlaySystem().hide(dialogRef),
        maxSetSize: maybe.Nothing<number>(),
      })
    );
  };
}

export type c = LightBoxTable;
export const c = LightBoxTable;
export const f = createFactory(c);
export default c;
