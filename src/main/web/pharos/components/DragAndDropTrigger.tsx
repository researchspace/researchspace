/**
 * ResearchSpace
 * Copyright (C) 2025, PHAROS: The International Consortium of Photo Archives
 *
 * This program is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 * later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
import * as React from 'react';
import { Component } from 'platform/api/components';
import { Dropzone } from 'platform/components/ui/dropzone';
import { trigger } from 'platform/api/events';
import { tr } from 'react-dom-factories';

export interface DragAndDropTriggerProps {
  id: string;

  /**
   * Children elements to be wrapped by the drag and drop area
   */
  children: React.ReactNode;
    
  /**
   * Optional CSS class name for styling
   */
  className?: string;
  
  /**
   * Optional inline styles
   */
  style?: React.CSSProperties;
}

/**
 * A component that can be wrapped around any HTML content to provide
 * drag and drop functionality for file input. It stores the file object
 * in a global variable on window and shows a progress bar if the upload
 * takes more than 1 second.
 */
class DragAndDropTrigger extends Component<DragAndDropTriggerProps, {}> {
  constructor(props: DragAndDropTriggerProps, context: any) {
    super(props, context);
  }

  render() {
    const { children, className, style } = this.props;

    return (
        <Dropzone
          accept={"image/*"}
          onDropAccepted={this.handleDrop}
          className={className}
          style={style}
        >
          {({getRootProps, getInputProps}) => (
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {children}
            </div>
          )}
        </Dropzone>
    );
  }

  private handleDrop = (files: File[]) => {
    if (files && files.length > 0) {
      const file = files[0];
      (window as any).dndFile = file;

      trigger({
        eventType: "DragAndDropTrigger.FileDropped",
        source: this.props.id,
        data: {
          queryParams: {
            withFile: "dndFile"
          }
        }
      })
    }
  };
}

export default DragAndDropTrigger;
