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
import { ImageUploadService } from './ImageUploadService';
import { ProgressBar, ProgressState } from '../../ontodia/src/ontodia/widgets/progressBar';

export interface DragAndDropTriggerProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  imageStorage: string;
}

interface DragAndDropTriggerState {
  progress: number;
}

/**
 * A component that can be wrapped around any HTML content to provide
 * drag and drop functionality for file input. It uploads the file and
 * shows a progress bar.
 */
class DragAndDropTrigger extends Component<DragAndDropTriggerProps, DragAndDropTriggerState> {
  private imageUploadService: ImageUploadService;

  constructor(props: DragAndDropTriggerProps, context: any) {
    super(props, context);
    this.state = {
      progress: 0,
    };
    this.imageUploadService = new ImageUploadService();
  }

  render() {
    const { children, className, style } = this.props;
    const { progress } = this.state;

    if (progress > 0 && progress < 100) {
      return <ProgressBar percent={progress} state={ProgressState.loading} />;
    }

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
      this.setState({ progress: 0 });
      this.imageUploadService.uploadImage(file, this.props.imageStorage, (progress) => this.setState({ progress }))
        .then(response => {
          this.setState({ progress: 100 });
          trigger({
            eventType: "DragAndDropTrigger.FileDropped",
            source: this.props.id,
            data: {
              queryParams: {
                file: response.fileName
              }
            }
          });
        })
        .catch(error => {
          console.error('Failed to upload image:', error);
          this.setState({ progress: 0 });
        });
    }
  };
}

export default DragAndDropTrigger;
