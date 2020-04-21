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

import { Component, createElement, cloneElement, Children } from 'react';

import { getOverlaySystem } from 'platform/components/ui/overlay';
import { ResourceViewerDialog } from './ResourceViewerDialog';

export interface ResourceViewerProps {
  pageIri: string;
  title: string;
  isOpen?: boolean;
  params?: { [index: string]: string };
}

export class ResourceViewer extends Component<ResourceViewerProps, {}> {
  componentDidMount() {
    if (this.props.isOpen) {
      this.openDialog();
    }
  }

  componentDidUpdate(prevProps: ResourceViewerProps) {
    if (this.props.isOpen) {
      this.openDialog();
    }
  }

  public render() {
    const props = {
      onClick: this.openDialog,
    };
    return cloneElement(<any>Children.only(this.props.children), props);
  }

  private openDialog = () => {
    const dialogRef = `show-source-statements-${this.props.title}`;
    getOverlaySystem().show(dialogRef, createElement(ResourceViewerDialog, this.props));
  };
}
