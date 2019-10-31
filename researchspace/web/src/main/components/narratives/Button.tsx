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

import * as React from 'react'
import * as classNames from 'classnames';
import FloatingActionButton from 'material-ui/FloatingActionButton';
import { device } from 'device.js';

const ToggleButton = ({
                  description,
                  icon,
                  onClick,
                  active,
                  disabled,
                }: {
  description: string,
  icon: any,
  active: boolean,
  disabled?: boolean,
  onClick: Function,
}) => (
  <div className="ory-controls-mode-toggle-button">
    <div onClick={() => {onClick(); }}
         className={classNames('btn btn-default ory-controls-mode-toggle-button-inner',
           {'active': active})}>
          <FloatingActionButton
            secondary={active}
            mini={device.mobile}
            disabled={disabled}
            >
            {icon}
          </FloatingActionButton>
        <span className='semantic-narrative-editor__mode-toggle-description'>{description}</span>
    </div>
    <div className="ory-controls-mode-toggle-button-description">
      {description}
    </div>
  </div>
);

export default ToggleButton;
