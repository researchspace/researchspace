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
import * as CopyToClipboard from 'react-copy-to-clipboard';

import { addNotification } from 'platform/components/ui/notification';

export interface Props {
  /**
   * The text that will be copied to clipboard
   */
  text: string;
  /**
   * The message that will be displayed in the notification when the text has been copied
   * @default 'The content has been copied!'
   */
  message?: string;
}

/**
 * @example
 * <mp-copy-to-clipboard text='text'>
 *     <button class='btn btn-default'>
 *         <i class='fa fa-copy'></i>
 *     </button>
 * </mp-copy-to-clipboard>
 */
export class CopyToClipboardComponent extends React.Component<Props, {}> {
  static defaultProps = {
    message: 'The content has been copied!',
  };

  private onCopy = () => {
    addNotification({
      level: 'success',
      message: this.props.message,
    });
  };

  render() {
    return (
      <CopyToClipboard text={this.props.text} onCopy={this.onCopy}>
        {this.props.children}
      </CopyToClipboard>
    );
  }
}

export default CopyToClipboardComponent;
