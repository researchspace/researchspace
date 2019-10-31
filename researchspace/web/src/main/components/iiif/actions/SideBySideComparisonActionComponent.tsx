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
 * @author Philip Polkovnikov
 */

import * as React from 'react';

import { Component } from 'platform/api/components';
import TypedSelectionActionComponent from 'platform/components/sets/TypedSelectionActionComponent';
import { AllImageActionProps } from './IiifProps';
import SideBySideComparison from '../SideBySideComparison';

export default class SideBySideComparisonActionComponent extends Component<AllImageActionProps, void> {
  static defaultProps = {
    menuTitle: 'Compare side-by-side',
    title: 'Side-by-Side image comparison',
    types: ['http://www.researchspace.org/ontology/EX_Digital_Image'],
  }
  render() {
    const {
      iiifServerUrl, imageIdPattern, selection, closeMenu, menuTitle, title, types, repositories,
    } = this.props;
    return <TypedSelectionActionComponent
      repositories={repositories}
      menuTitle={menuTitle}
      title={title}
      isDisabled={(selection) => selection.length < 2}
      renderDialog={(selection) =>
        <SideBySideComparison
          repositories={repositories}
          iiifServerUrl={iiifServerUrl}
          imageIdPattern={imageIdPattern}
          selection={selection}
        />
      }
      selection={selection}
      closeMenu={closeMenu}
      types={types}
    />;
  }
}
