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
import { NavigationUtils } from 'platform/api/navigation';

export interface Props {
  /**
   * The message that will be displayed in the notification when the text has been copied
   * @default 'The content has been copied!'
   */
  message?: string;

  /* Todo: support using this parameter, mutually exclusive with the relativePath one */
  absolutePath?: string;

  relativePath: string;
}

/**
 * @example
 * <rs-share-link relative-path='/resource/ThinkingFrames' 
 *                urlqueryparam-resource="http://www.researchspace.org/resource/place/c26cd35e-ec3c-4069-b779-47d941f56edc" 
 *                urlqueryparam-view="resource-editor" urlqueryparam-custom-label="My Place" message='Share link has been copied'>
 *       <button class="btn btn-default btn-textAndIcon" title="Copy IRI">
 *       <rs-icon icon-type="rounded" icon-name="content_copy" symbol="true"></rs-icon>
 *           Share Link to Resource View
 *       </button>
 * </rs-share-link>
 */
export class ShareLinkComponent extends React.Component<Props, {}> {
  static defaultProps = {
    message: 'The content has been copied!',
    isUrl: false
  };

  private onCopy = () => {
    
    addNotification({
      level: 'success',
      message: this.props.message,
    });
  };

  private createQueryString = (obj) => {
    const params = new URLSearchParams(obj);
    return params.toString();
  };

  render() {
    const params = NavigationUtils.extractParams(this.props);
    return (
      <CopyToClipboard text={window.location.protocol+"//"+window.location.host+this.props.relativePath+"?"+this.createQueryString(params)} onCopy={this.onCopy}>
        {this.props.children}
      </CopyToClipboard>
    );   
  }
}

export default ShareLinkComponent;