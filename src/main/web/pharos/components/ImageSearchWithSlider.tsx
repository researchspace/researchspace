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
import * as Maybe from 'data.maybe';
import * as Kefir from 'kefir';
import * as _ from 'lodash';
import { FormControl, FormGroup, Button } from 'react-bootstrap';
import * as SparqlJs from 'sparqljs';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

import { Rdf } from 'platform/api/rdf';
import { SparqlUtil, SparqlClient } from 'platform/api/sparql';
import { Component } from 'platform/api/components';
import { Action } from 'platform/components/utils';
import { Dropzone } from 'platform/components/ui/dropzone';

import { setSearchDomain } from 'platform/components/semantic/search/commons/Utils';
import { SemanticSimpleSearchBaseConfig } from 'platform/components/semantic/simple-search/Config';
import { SemanticSearchContext, InitialQueryContext } from 'platform/components/semantic/search/web-components/SemanticSearchApi';
import Icon from 'platform/components/ui/icon/Icon';

import * as styles from './ImageSearchWithSlider.scss';

// Maximum dimensions for image resizing while preserving aspect ratio
const MAX_IMAGE_DIMENSION = 700;

export interface BaseConfig<T> extends SemanticSimpleSearchBaseConfig {
  /**
   * Custom css styles for the input element
   */
  style?: T;

  /**
   * Custom css classes for the input element
   */
  className?: string;

  /**
   * Specify search domain category IRI (full IRI enclosed in <>).
   * Required, if component is used together with facets.
   */
  domain?: string;

  /**
   * Number of milliseconds to wait after the last keystroke before sending the query.
   *
   * @default 300
   */
  debounce?: number;

  /**
   * The minimum value of the slider
   * @default 0
   */
  min?: number;

  /**
   * The maximum value of the slider
   * @default 100
   */
  max?: number;

  /**
   * Value to be added or subtracted on each step the slider makes
   * @default 1
   */
  step?: number;

  /**
   * Variable name for the AI assist value in the query
   * @default '__aiAssist__'
   */
  aiAsistVariable?: string;

  /**
   * Marks on the slider. Object with keys as slider values and values as mark labels.
   * Example: { 0: 'Metadata', 50: ' ', 100: 'Visual Similarity' }
   * @default undefined
   */
  marks?: Record<number, string>;

  /**
   * Default value for the slider when the component is first rendered
   * @default min value (0 if not specified)
   */
  defaultSliderValue?: number;

  /**
   * Initial URL of an image to be used for search when the component is first rendered.
   * If provided, the component will automatically initialize with this image and trigger the search.
   */
  withInitalFileUrl?: string;

  /**
   * Name of a window variable that contains base64 encoded image data.
   * If provided, the component will retrieve the image data from window[withInitialFileData]
   * and use it to initialize the search.
   */
  withInitialFileData?: string;
}

export interface ImageSearchWithSliderConfig extends BaseConfig<string> {
  /**
   * Variable name for the image data (URL or base64) in the query
   * @default '__data__'
   */
  dataVariable?: string;

  /**
   * Variable name for the image data type in the query
   * Will be set to "url" for URLs or "image" for image files
   * @default '__dataType__'
   */
  dataTypeVariable?: string;
}

interface ImageSearchWithSliderProps extends BaseConfig<React.CSSProperties> {
  dataVariable?: string;
  dataTypeVariable?: string;
}

class ImageSearchWithSlider extends Component<ImageSearchWithSliderProps, {}> {
  render() {
    return (
      <SemanticSearchContext.Consumer>
        {(context) => <ImageSearchWithSliderInner {...this.props} context={context} />}
      </SemanticSearchContext.Consumer>
    );
  }
}

interface InnerProps extends ImageSearchWithSliderProps {
  context: InitialQueryContext;
}

interface State {
  value: string;
  sliderValue: number;
  imageData?: string;  // Base64 image data from dropped file
  imageUrl?: string;   // URL of the image if entered as URL
  showImage: boolean;  // Whether to show image preview or input
}

class ImageSearchWithSliderInner extends React.Component<InnerProps, State> {
  static defaultProps: Partial<ImageSearchWithSliderProps> = {
    placeholder: 'Enter image URL or drop an image file',
    className: "input-image-search",
    dataVariable: '__data__',
    dataTypeVariable: '__dataType__',
    aiAsistVariable: '__aiAssist__',
    debounce: 300,
    min: 0,
    max: 100,
    step: 1,
  };

  private keys: Action<string>;

  constructor(props: InnerProps) {
    super(props);
    this.state = {
      value: '',
      sliderValue: props.defaultSliderValue !== undefined ? props.defaultSliderValue : (props.min || 0),
      showImage: false,
    };

    this.keys = Action<string>(); 
  }

  componentDidMount() {
    setSearchDomain(this.props.domain, this.props.context);
    this.initialize(this.props);
    this.initializeFromProps();
  }

  private initializeFromProps = () => {
    const { withInitalFileUrl, withInitialFileData } = this.props;
    
    if (withInitalFileUrl) {
      // For URLs, we don't resize the image
      this.setState({ 
        imageUrl: withInitalFileUrl, 
        imageData: undefined, 
        value: withInitalFileUrl,
        showImage: true 
      }, () => {
        this.keys(this.state.value);
      });
    } else if (withInitialFileData && window[withInitialFileData]) {
      // Handle file instance initialization with resizing
      const fileInstance = window[withInitialFileData];
      this.getFileAsBase64(fileInstance).then((base64Data: string) => {
        this.resizeImageToMaxDimensions(base64Data, MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION).then((resizedData: string) => {
          this.setState({ 
            imageData: resizedData, 
            imageUrl: undefined,
            value: 'Initial image data',
            showImage: true 
          }, () => {
            this.keys(this.state.value);
          });
        }).catch(error => {
          console.error('Failed to resize initial image data:', error);
          // Fallback to original image if resizing fails
          this.setState({ 
            imageData: base64Data, 
            imageUrl: undefined,
            value: 'Initial image data',
            showImage: true 
          }, () => {
            this.keys(this.state.value);
          });
        });
      });
    }
  };

  componentWillReceiveProps(props: InnerProps) {
    const { context } = props;
    if (context.searchProfileStore.isJust && context.domain.isNothing) {
      setSearchDomain(props.domain, context);
    }
  }

  render() {
    const { placeholder, style, className, min, max, step } = this.props;
    
    return (
      <div className={styles.imageSearchWithSlider}>
        <div className={styles.imageSearchContainer}>
          {this.state.showImage ? (
            // Image preview with clear button
            <div className={styles.imagePreviewContainer}>
              <img 
                src={this.state.imageUrl || this.state.imageData} 
                alt="Selected image" 
                className={styles.imagePreview}
              />
              <Button 
                className={styles.clearImageBtn} 
                onClick={this.handleClearImage}
              >
                Clear
              </Button>
            </div>
          ) : (
            // Input, dropzone, and button in one row
            <div className={styles.inputDropzoneContainer}>
              <FormControl
                    className={className}
                    style={style}
                    value={this.state.value}
                    placeholder={placeholder}
                    onChange={this.onKeyPress}
              />
              <Dropzone
                accept={"image/*"}
                onDropAccepted={this.handleDrop}
                className={styles.imageDropzone}
              >
                <div className={styles.dropzoneContent}>
                  <div className={styles.dropzoneText}>drag and drop</div>
                </div>
              </Dropzone>
              <Button 
                className={styles.searchButton}
                onClick={this.handleSearch}
              >
                Search
              </Button>
            </div>
          )}
        </div>
        <div className={styles.sliderField}>
          <div className={styles.sliderLabel}>AI Assist:</div>
          <div className={styles.sliderFieldSliderContainer}>
            <Slider
              min={min}
              max={max}
              step={step}
              value={this.state.sliderValue}
              onChange={this.onSliderChange}
              included={false}
              marks={this.props.marks}
            />
          </div>
        </div>
      </div>
    );
  }

  private initialize = (props: InnerProps) => {
    const query = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(props.query);

    const queryProp = this.keys.$property
      .debounce(this.props.debounce)
      .filter((value) => value !== '')
      .map(this.buildQuery(query));


    queryProp.onValue((q) => this.props.context.setBaseQuery(Maybe.Just(q)));
  };

  private onKeyPress = (event: React.FormEvent<FormControl>) => {
    const newValue = (event.target as any).value;
    this.setState({ value: newValue });
  }

  private handleSearch = () => {
    const { value } = this.state;
    
    if (value.startsWith('http')) {
      // For URLs, we don't resize the image
      this.setState({ 
        imageUrl: value, 
        imageData: undefined, 
        showImage: true 
      }, () => {
        this.keys(this.state.value);
      });
    }
  };

  private handleDrop = (files: File[]) => {
    if (files && files.length > 0) {
      const file = files[0];
      this.getFileAsBase64(file).then((base64Data: string) => {
        // Resize the image to max dimensions
        this.resizeImageToMaxDimensions(base64Data, MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION).then((resizedData: string) => {
          this.setState({ 
            imageData: resizedData, 
            imageUrl: undefined,
            value: 'Dropped image',
            showImage: true 
          }, () => {
            this.keys(this.state.value);
          });
        }).catch(error => {
          console.error('Failed to resize image:', error);
          // Fallback to original image if resizing fails
          this.setState({ 
            imageData: base64Data, 
            imageUrl: undefined,
            value: 'Dropped image',
            showImage: true 
          }, () => {
            this.keys(this.state.value);
          });
        });
      });
    }
  };

  private handleClearImage = () => {
    this.setState({ 
      imageUrl: undefined, 
      imageData: undefined, 
      value: '', 
      showImage: false 
    }, () => {
      // Notify that the query should be cleared
      this.keys('');
    });
  };

  private onSliderChange = (value: number | number[]) => {
    this.setState({ sliderValue: value as number }, () => {
      if (this.state.showImage) {
        this.keys(this.state.value);
      }
    });
  }

  private buildQuery = (baseQuery: SparqlJs.SelectQuery) => (token: string): SparqlJs.SelectQuery => {
    const {
      dataVariable,
      dataTypeVariable,
      aiAsistVariable
    } = this.props;
    
    const bindings: Record<string, any> = {
      [aiAsistVariable!]: Rdf.literal(this.state.sliderValue.toString(), Rdf.iri('http://www.w3.org/2001/XMLSchema#decimal')),
    };

    // If we have an image URL
    if (this.state.imageUrl) {
      bindings[dataVariable!] = Rdf.literal(this.state.imageUrl);
      bindings[dataTypeVariable!] = Rdf.literal('url');
    } 
    // If we have image data from a drop
    else if (this.state.imageData) {
      bindings[dataVariable!] = Rdf.literal(this.state.imageData);
      bindings[dataTypeVariable!] = Rdf.literal('image');
    }
    
    return SparqlClient.setBindings(baseQuery, bindings);
  };

  private getFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = error => reject(error);
    });
  }

  private resizeImageToMaxDimensions(src: string, maxWidth: number, maxHeight: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions preserving aspect ratio
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get resized image as data URL
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    });
  }
}

export default ImageSearchWithSlider;
