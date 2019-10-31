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

import { MenuProps } from 'platform/components/ui/selection/SelectionActionProps';
import { AllTitleProps, TypeProps } from 'platform/components/sets/TypedSelectionActionProps';

/**
 * Credentials to IIIF server
 */
export interface IiifProps {
  /**
   * URL of IIIF server
   */
  iiifServerUrl: string

  /**
   * TODO
   */
  imageIdPattern: string;

  repositories?: Array<string>;
}

/**
 * Props for an image selection action definition
 */
export type AllImageActionProps = IiifProps & MenuProps & AllTitleProps & TypeProps
