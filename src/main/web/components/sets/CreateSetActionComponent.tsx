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
/**
 * @author Philip Polkovnikov
 */

import * as React from 'react';
import { Component } from 'react';
import * as maybe from 'data.maybe';
import { SaveSetDialog, createNewSetFromItems } from 'platform/components/sets';
import { Rdf } from 'platform/api/rdf';
import { MenuProps } from 'platform/components/ui/selection/SelectionActionProps';
import { AllTitleProps } from './TypedSelectionActionProps';
import TypedSelectionActionComponent, { closeDialog } from './TypedSelectionActionComponent';

type Props = MenuProps & AllTitleProps & { id: string };

export default class CreateSetActionComponent extends Component<Props, void> {
  static defaultProps = {
    menuTitle: 'Create new set',
    title: 'Create new set',
  };

  render() {
    const { selection, closeMenu, menuTitle, title } = this.props;
    return (
      <TypedSelectionActionComponent
        menuTitle={menuTitle}
        title={title}
        isDisabled={(s) => s.length === 0}
        renderRawDialog={(s) => (
          <SaveSetDialog
            onSave={(name) => this.onSave(s, name)}
            onHide={() => {
              /**/
            }}
            maxSetSize={maybe.Nothing<number>()}
          />
        )}
        selection={selection}
        closeMenu={closeMenu}
      />
    );
  }
  onSave = (selection: string[], name: string) => {
    const result = createNewSetFromItems(this.props.id, name, selection.map(Rdf.iri));
    result.onEnd(closeDialog);
    return result;
  };
}
