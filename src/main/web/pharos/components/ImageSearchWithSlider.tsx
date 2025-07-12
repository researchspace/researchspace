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
import { FormControl, FormGroup, Button, Dropdown, MenuItem } from 'react-bootstrap';
import * as SparqlJs from 'sparqljs';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

import { Rdf } from 'platform/api/rdf';
import * as turtle from 'platform/api/rdf/formats/turtle';
import { SparqlUtil, SparqlClient, PatternBinder, cloneQuery } from 'platform/api/sparql';
import { Component } from 'platform/api/components';
import { Cancellation } from 'platform/api/async/Cancellation';
import { Action } from 'platform/components/utils';
import { Dropzone } from 'platform/components/ui/dropzone';
import { defaultKeywordSearchConfig, textConfirmsToConfig, luceneTokenize } from "platform/components/shared/KeywordSearchConfig";

import { setSearchDomain } from 'platform/components/semantic/search/commons/Utils';
import { SemanticSimpleSearchBaseConfig } from 'platform/components/semantic/simple-search/Config';
import { SemanticSearchContext, InitialQueryContext } from 'platform/components/semantic/search/web-components/SemanticSearchApi';
import Icon from 'platform/components/ui/icon/Icon';

import * as styles from './ImageSearchWithSlider.scss';
import { SEMANTIC_SEARCH_VARIABLES } from '../../components/semantic/search/config/SearchConfig';

// Maximum dimensions for image resizing while preserving aspect ratio
const MAX_IMAGE_DIMENSION = 700;

export interface DomainConfig {
  /**
   * Display name for the domain
   */
  name: string;
  
  /**
   * URI for the domain (full IRI enclosed in <>)
   */
  uri: string;
  
  /**
   * Whether AI features should be enabled for this domain
   * @default false
   */
  withAi?: boolean;
  
  /**
   * Whether image search features should be enabled for this domain
   * @default false
   */
  withImages?: boolean;
}

export interface BaseConfig<T> extends SemanticSimpleSearchBaseConfig {
  /**
   * Numbered text query templates for AI assist slider = 0 based on domain index
   * e.g., textQuery0, textQuery1, etc.
   */
  [key: `textQuery${number}`]: string;
  
  /**
   * Numbered text query templates for AI assist slider between 0-100 based on domain index
   * e.g., textWithAiQuery0, textWithAiQuery1, etc.
   */
  [key: `textWithAiQuery${number}`]: string;
  
  /**
   * Numbered text query templates for AI assist slider = 100 based on domain index
   * e.g., textAiQuery0, textAiQuery1, etc.
   */
  [key: `textAiQuery${number}`]: string;
  
  /**
   * Numbered image query templates for AI assist slider = 0 based on domain index
   * e.g., imageQuery0, imageQuery1, etc.
   */
  [key: `imageQuery${number}`]: string;
  
  /**
   * Numbered image query templates for AI assist slider between 0-100 based on domain index
   * e.g., imageWithAiQuery0, imageWithAiQuery1, etc.
   */
  [key: `imageWithAiQuery${number}`]: string;
  
  /**
   * Numbered image query templates for AI assist slider = 100 based on domain index
   * e.g., imageAiQuery0, imageAiQuery1, etc.
   */
  [key: `imageAiQuery${number}`]: string;
  
  /**
   * Numbered default query templates based on domain index
   * e.g., defaultQuery0, defaultQuery1, etc.
   */
  [key: `defaultQuery${number}`]: string;

  /**
   * Custom css styles for the input element
   */
  style?: T;

  /**
   * Custom css classes for the input element
   */
  className?: string;

  /**
   * Specify initial search domain category IRI (full IRI enclosed in <>).
   * Required, if component is used together with facets.
   */
  initialDomain?: string;
  
  /**
   * @deprecated Use initialDomain instead
   */
  domain?: string;
  
  /**
   * Array of available domains for the dropdown
   */
  domains?: DomainConfig[];

  /**
   * If true, domain selection will be disabled and locked to the initial domain
   * @default false
   */
  lockDomain?: boolean;

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
  aiAsistVariable: string;

  /**
   * Marks on the slider. Object with keys as slider values and values as mark labels.
   * Example: { 0: 'Metadata', 50: ' ', 100: 'Visual Similarity' }
   * @default undefined
   */
  marks?: Record<number, string> | { text: Record<number, string>, image: Record<number, string> };

  /**
   * Default value for the slider when the component is first rendered
   * @default min value (0 if not specified)
   */
  defaultSliderValue?: number;

  /**
   * A flag determining whether any special Lucene syntax will be escaped.
   * When `false` lucene syntax in the user input is not escaped.
   *
   * @default true
   */
  escapeLuceneSyntax?: boolean;

  /**
   * Minimum number of input characters that triggers the search.
   *
   * @default 3
   */
  minSearchTermLength?: number;
  
  /**
   * A flag determining whether the user input is tokenized by whitespace into words postfixed by `*`.
   * E.g. the search for `Hello World` becomes `Hello* World*`.
   *
   * @default true
   */
  tokenizeLuceneQuery?: boolean;

  /**
   * If tokenizeLuceneQuery is true this parameter can be used to
   * filter out tokens that a shorter then specified lenght.
   * 
   * So if minTokenLength=3, and input string is "an apple",
   * then only "apple*" will be propagated to the query.
   * 
   * @default 3
   */
  minTokenLength?: number;
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

  /**
   * Variable name for the search term in the query
   * @default '__token__'
   */
  searchTermVariable?: string;
}

interface ImageSearchWithSliderProps extends BaseConfig<React.CSSProperties> {
  dataVariable?: string;
  dataTypeVariable?: string;
  searchTermVariable?: string;
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
  isImageMode: boolean; // Whether we're in image mode (true) or keyword mode (false)
  selectedDomainIndex: number; // Index of the currently selected domain
  withAi: boolean; // Whether AI features are enabled for the current domain
  withImages: boolean; // Whether image features are enabled for the current domain
}

class ImageSearchWithSliderInner extends React.Component<InnerProps, State> {
  private componentCancellation: Cancellation;
  private activeStreamCancellation: Cancellation;

  static defaultProps: Partial<ImageSearchWithSliderProps> = {
    placeholder: 'Enter image URL, keyword, or drop an image file',
    className: "input-image-search",
    dataVariable: '__data__',
    dataTypeVariable: '__dataType__',
    searchTermVariable: '__token__',
    aiAsistVariable: '__aiAssist__',
    debounce: 300,
    min: 0,
    max: 100,
    step: 1,
    ...defaultKeywordSearchConfig
  };

  private keys: Action<string>;

  constructor(props: InnerProps) {
    super(props);
    const value = props.initialInput || '';
    const isImageMode = value === 'dndFile' || value.startsWith('http');
    
    // Find the initial domain index
    const initialDomainUri = props.initialDomain || props.domain;
    let selectedDomainIndex = 0;
    let withAi = false;
    let withImages = false;
    
    if (props.domains && props.domains.length > 0) {
      // If domains are provided, find the matching domain
      const domainIndex = props.domains.findIndex(d => d.uri === initialDomainUri);
      if (domainIndex !== -1) {
        selectedDomainIndex = domainIndex;
        withAi = !!props.domains[domainIndex].withAi;
        withImages = !!props.domains[domainIndex].withImages;
      } else {
        // Use the first domain if no match is found
        withAi = !!props.domains[0].withAi;
        withImages = !!props.domains[0].withImages;
      }
    }
    
    this.state = {
      value: value === 'dndFile' ? '' : value,
      sliderValue: props.defaultSliderValue !== undefined ? props.defaultSliderValue : (props.min || 0),
      showImage: false,
      isImageMode: isImageMode,
      selectedDomainIndex,
      withAi,
      withImages
    };

    this.keys = Action<string>(value === 'dndFile' ? '' : value);

    this.componentCancellation = new Cancellation();
    this.activeStreamCancellation = this.componentCancellation.derive();
  }

  componentDidMount() {
    setSearchDomain(this.getCurrentDomainUri(), this.props.context);
    this.initialize(this.props);
    this.initializeFromProps();
  }

  componentWillReceiveProps(props: InnerProps) {
    const { context } = props;
    if (context.searchProfileStore.isJust && context.domain.isNothing) {
      setSearchDomain(this.getCurrentDomainUri(), context);
    }
  }

  private initializeFromProps = () => {
    const { initialInput } = this.props;
    const { withImages } = this.state;
    
    // Only process image inputs if images are enabled for this domain
    if (withImages) {
      if (initialInput === 'dndFile' && window['dndFile']) {
        // Handle file instance initialization with resizing
        const fileInstance = window['dndFile'];
        this.getFileAsBase64(fileInstance).then((base64Data: string) => {
          this.resizeImageToMaxDimensions(base64Data, MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION).then((resizedData: string) => {
            this.setState({ 
              imageData: resizedData, 
              imageUrl: undefined,
              value: 'Initial image data',
              showImage: true,
              isImageMode: true
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
              showImage: true,
              isImageMode: true
            }, () => {
              this.keys(this.state.value);
            });
          });
        });
      } else if (initialInput && initialInput.startsWith('http')) {
        // For URLs, we don't resize the image
        this.setState({ 
          imageUrl: initialInput, 
          imageData: undefined, 
          value: initialInput,
          showImage: true,
          isImageMode: true
        }, () => {
          this.keys(this.state.value);
        });
      } else if (initialInput) {
        // For text input, just set the value
        this.setState({
          value: initialInput,
          isImageMode: false
        }, () => {
          this.keys(initialInput);
        });
      }
    } else if (initialInput) {
      // If images are not enabled, treat all inputs as text
      this.setState({
        value: initialInput,
        isImageMode: false
      }, () => {
        this.keys(initialInput);
      });
    }
  };
  
  /**
   * Get the URI of the currently selected domain
   */
  private getCurrentDomainUri = (): string => {
    const { domains, initialDomain, domain } = this.props;
    
    if (domains && domains.length > 0) {
      // If domains are provided, use the selected domain
      return domains[this.state.selectedDomainIndex].uri;
    }
    
    // Fallback to initialDomain or domain
    return initialDomain || domain || '';
  }
  
  /**
   * Handle domain selection change
   */
  private handleDomainChange = (index: number) => {
    if (index === this.state.selectedDomainIndex) {
      return; // No change
    }
    
    const { domains, lockDomain } = this.props;
    if (!domains || index >= domains.length || lockDomain) {
      return; // Invalid index or domain is locked
    }
    
    // Get the new domain settings
    const newDomain = domains[index];
    const newWithAi = !!newDomain.withAi;
    const newWithImages = !!newDomain.withImages;

    // Prepare state updates, considering current image state
    const stateChanges: Partial<State> = {
      selectedDomainIndex: index,
      withAi: newWithAi,
      withImages: newWithImages
    };

    if (this.state.isImageMode) { // An image is currently active
      if (!newWithImages) {
        // New domain does NOT support images, clear image
        stateChanges.imageUrl = undefined;
        stateChanges.imageData = undefined;
        stateChanges.showImage = false;
        stateChanges.isImageMode = false;
        stateChanges.value = ''; // Clear the value as well
      }
      // If newWithImages is true, image state (imageUrl, imageData, showImage, isImageMode, value) 
      // is preserved because these fields are not added to stateChanges,
      // and setState will merge, keeping their existing values from this.state.
    }
    // If not in image mode (text search), this.state.value (the text) is preserved by default
    // as stateChanges.value is not set in this branch.

    // Update state with new domain settings and potentially modified image/value state
    this.setState(stateChanges, () => {
      this.props.context.setBaseQuery(Maybe.Nothing());
    
      // Set the new domain in the search context
      setSearchDomain(newDomain.uri, this.props.context);
    
      // After state update, trigger search based on the new state.
      // this.state now reflects the changes made by setState.
      if (this.state.value === '') {
        // If value was explicitly cleared (e.g. image removed and new domain doesn't support images, or user cleared text)
        this.keys('');
      } else if (!_.isEmpty(this.state.value) &&
                 (this.state.isImageMode || textConfirmsToConfig(this.state.value, this.props))) {
        // If value is non-empty and valid (either current image mode or conforming text)
        this.keys(this.state.value);
      }
      // If value is non-empty but not valid for search (e.g. text that doesn't meet min length),
      // this.keys() is not called, preserving the existing behavior.
    
      // Re-initialize with the new domain (it will use the updated this.state)
      this.initialize(this.props);
    });
  }

  render() {
    const { placeholder, style, className, min, max, step, domains, lockDomain, marks } = this.props;
    const { withAi, withImages, selectedDomainIndex, isImageMode } = this.state;

    let sliderMarks: Record<number, string> | undefined;
    if (marks) {
      if ('text' in marks && 'image' in marks) {
        sliderMarks = isImageMode ? marks.image : marks.text;
      } else {
        sliderMarks = marks as Record<number, string>;
      }
    }
    
    return (
      <div className={styles.imageSearchWithSlider}>
        {/* Domain selection dropdown */}
        {domains && domains.length > 0 && (
          <div className={styles.domainSelector}>
            <Dropdown id="domain-selector" disabled={lockDomain}>
              <Dropdown.Toggle>
                {domains[selectedDomainIndex].name}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {domains.map((domain, index) => (
                  <MenuItem 
                    key={domain.uri} 
                    eventKey={index}
                    active={index === selectedDomainIndex}
                    onSelect={() => this.handleDomainChange(index)}
                    disabled={lockDomain}
                  >
                    {domain.name}
                  </MenuItem>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </div>
        )}
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
              <Icon className={styles.searchButton} iconType='rounded ' iconName='search' symbol onClick={this.handleSearch} />
              {/* Only show dropzone if images are enabled for this domain */}
              {withImages && (
                <Dropzone
                  accept={"image/*"}
                  onDropAccepted={this.handleDrop}
                  className={styles.imageDropzone}
                  disabled={!withImages}
                >
                  <div className={styles.dropzoneContent}>
                    <Icon iconType='rounded ' iconName='add_photo_alternate' symbol />
                  </div>
                </Dropzone>
              )}
            </div>
          )}
        </div>
        {/* Only show slider if AI is enabled for this domain */}
        <div className={`${styles.sliderField} ${withAi ? '' : 'disabled'}`}>
          <div className={styles.sliderLabel}>AI assist</div>
          <div className={styles.sliderFieldSliderContainer}>
            <Slider
              min={min}
              max={max}
              step={step}
              value={this.state.sliderValue}
              onChange={this.onSliderChange}
              included={false}
              marks={sliderMarks}
              disabled={!withAi}
            />
          </div>
        </div>
      </div>
    );
  }

  private initialize = (props: InnerProps) => {
    // Cancel streams from the previous initialize call and get a new token for this call
    this.activeStreamCancellation = this.componentCancellation.deriveAndCancel(this.activeStreamCancellation);

    // Handle image search (starts with http or has image data)
    const imageQueryProp = this.keys.$property
      .debounce(this.props.debounce)
      .filter((value) => value.startsWith('http') || value === 'Dropped image' || value === 'Initial image data')
      .map(this.buildImageQuery())
      .filter((q) => q !== null);

    // Handle keyword search (doesn't start with http)
    const keywordQueryProp = this.keys.$property
      .filter((value) => !value.startsWith('http') && value !== 'Dropped image' && value !== 'Initial image data')
      .filter((value) => textConfirmsToConfig(value, this.props))
      .debounce(this.props.debounce)
      .map(this.buildKeywordQuery())
      .filter((q) => q !== null);

    // Handle empty input - use default query if available and slider is 0
    const defaultQueryProp = this.keys.$property
      .filter((value) => _.isEmpty(value))
      .filter(() => this.state.sliderValue === 0 || !this.state.withAi)
      .map(this.buildDefaultQuery())
      .filter((q) => q !== null);

    // Merge all query streams
    const initializers = [imageQueryProp, keywordQueryProp, defaultQueryProp];

    // Map the merged stream through the active cancellation token
    this.activeStreamCancellation.map(Kefir.merge(initializers))
      .onValue((q) => {
        this.props.context.setBaseQuery(Maybe.Just(q));
      });
  };

  componentWillUnmount() {
    this.componentCancellation.cancelAll();
  }

  private onKeyPress = (event: React.FormEvent<FormControl>) => {
    const newValue = (event.target as any).value;
    const isImageMode = newValue.startsWith('http');
    
    this.setState({ 
      value: newValue,
      isImageMode: isImageMode
    }, () => {
      // For keyword search, trigger search on each keystroke
      if (!isImageMode && textConfirmsToConfig(newValue, this.props)) {
        this.keys(newValue);
      } else if (_.isEmpty(newValue)) {
        // If input is empty, clear the query
        this.keys('');
      }
    });
  }

  private handleSearch = () => {
    const { value, withImages } = this.state;
    
    if (value.startsWith('http')) {
      // Only allow image URLs if images are enabled for this domain
      if (withImages) {
        // For URLs, we don't resize the image
        this.setState({ 
          imageUrl: value, 
          imageData: undefined, 
          showImage: true,
          isImageMode: true
        }, () => {
          this.keys(this.state.value);
        });
      } else {
        // If images are not enabled, treat as text search
        this.setState({
          isImageMode: false
        }, () => {
          this.keys(value);
        });
      }
    } else if (!_.isEmpty(value)) {
      // For keyword search, just trigger the search
      this.keys(value);
    }
  };

  private handleDrop = (files: File[]) => {
    // Only process dropped files if images are enabled for this domain
    if (!this.state.withImages) {
      console.warn('Image upload is not enabled for this domain');
      return;
    }
    
    if (files && files.length > 0) {
      const file = files[0];
      this.getFileAsBase64(file).then((base64Data: string) => {
        // Resize the image to max dimensions
        this.resizeImageToMaxDimensions(base64Data, MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION).then((resizedData: string) => {
          this.setState({ 
            imageData: resizedData, 
            imageUrl: undefined,
            value: 'Dropped image',
            showImage: true,
            isImageMode: true
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
            showImage: true,
            isImageMode: true
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
      showImage: false,
      isImageMode: false
    }, () => {
      // Notify that the query should be cleared
      this.keys('');
    });
  };

  private onSliderChange = (value: number | number[]) => {
    this.setState({ sliderValue: value as number }, () => {
      // Trigger search if we have a valid input
      if ((this.state.isImageMode && this.state.showImage) || 
          (!this.state.isImageMode && !_.isEmpty(this.state.value) && 
           textConfirmsToConfig(this.state.value, this.props))) {
        this.keys(this.state.value);
      }
    });
  }

  private buildImageQuery = () => (token: string): SparqlJs.SelectQuery | null => {
    // If images are not enabled for this domain, return null
    if (!this.state.withImages) {
      console.error('Image search is not enabled for this domain');
      return null;
    }
    
    const { selectedDomainIndex, sliderValue, withAi } = this.state;
    
    // Determine which image query to use based on AI slider value
    let imageQueryStr: string | undefined;
    
    if (withAi && sliderValue === 100) {
      // Use AI-only image query
      const imageAiQueryKey = `imageAiQuery${selectedDomainIndex}` as `imageAiQuery${number}`;
      imageQueryStr = this.props[imageAiQueryKey];
    } else if (withAi && sliderValue > 0 && sliderValue < 100) {
      // Use mixed AI image query
      const imageWithAiQueryKey = `imageWithAiQuery${selectedDomainIndex}` as `imageWithAiQuery${number}`;
      imageQueryStr = this.props[imageWithAiQueryKey];
    } else {
      // Use standard image query (slider = 0 or AI disabled)
      const imageQueryKey = `imageQuery${selectedDomainIndex}` as `imageQuery${number}`;
      imageQueryStr = this.props[imageQueryKey];
    }
    
    if (!imageQueryStr) {
      console.error('No appropriate image query available for the current settings');
      return null;
    }
    
    // Parse the selected query
    const baseQuery = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(imageQueryStr);
    
    const {
      dataVariable,
      dataTypeVariable,
      aiAsistVariable
    } = this.props;
    
    const bindings: Record<string, any> = {};

    // Bind domain
    bindings[SEMANTIC_SEARCH_VARIABLES.DOMAIN_VAR] = Rdf.fullIri(this.getCurrentDomainUri());

    // Only add AI assist value if AI is enabled for this domain
    if (withAi && sliderValue > 0) {
      bindings[aiAsistVariable!] = Rdf.literal(sliderValue.toString(), Rdf.iri('http://www.w3.org/2001/XMLSchema#decimal'));
    }

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

  private buildKeywordQuery = () => (token: string): SparqlJs.SelectQuery | null => {
    const { selectedDomainIndex, sliderValue, withAi } = this.state;
    
    // Determine which text query to use based on AI slider value
    let textQueryStr: string | undefined;
    
    if (withAi && sliderValue === 100) {
      // Use AI-only text query
      const textAiQueryKey = `textAiQuery${selectedDomainIndex}` as `textAiQuery${number}`;
      textQueryStr = this.props[textAiQueryKey];
    } else if (withAi && sliderValue > 0 && sliderValue < 100) {
      // Use mixed AI text query
      const textWithAiQueryKey = `textWithAiQuery${selectedDomainIndex}` as `textWithAiQuery${number}`;
      textQueryStr = this.props[textWithAiQueryKey];
    } else {
      // Use standard text query (slider = 0 or AI disabled)
      const textQueryKey = `textQuery${selectedDomainIndex}` as `textQuery${number}`;
      textQueryStr = this.props[textQueryKey];
    }
    
    if (!textQueryStr) {
      console.error('No appropriate text query available for the current settings');
      return null;
    }
    
    const {
      searchTermVariable,
      aiAsistVariable, 
      escapeLuceneSyntax,
      tokenizeLuceneQuery, 
      minTokenLength
    } = this.props;
    
    // Define the QLever text search namespace
    const TEXT_SEARCH_NS = 'https://qlever.cs.uni-freiburg.de/textSearch/';
    const TEXT_SEARCH_CONTAINS = turtle.serialize.nodeToN3(Rdf.iri(TEXT_SEARCH_NS + 'contains')) as SparqlJs.Term;
    const TEXT_SEARCH_ENTITY = turtle.serialize.nodeToN3(Rdf.iri(TEXT_SEARCH_NS + 'entity')) as SparqlJs.Term;
    const TEXT_SEARCH_WORD = turtle.serialize.nodeToN3(Rdf.iri(TEXT_SEARCH_NS + 'word')) as SparqlJs.Term;
    const TEXT_SEARCH_SCORE = turtle.serialize.nodeToN3(Rdf.iri(TEXT_SEARCH_NS + 'score')) as SparqlJs.Term;

    // Get keywords from the token
    const keywords = luceneTokenize(token, escapeLuceneSyntax, tokenizeLuceneQuery, minTokenLength);
        
    // Create triples for each keyword
    const parsedPattern = keywords.map((keyword: string, i) => {
      // Build triples for the SERVICE block
      const allTriplesForBgp: any = [];

      const containsNode = turtle.serialize.nodeToN3(Rdf.bnode());
      const textVariable = `?text_${i}`;
      // ?text textSearch:contains [textSearch:word "keyword*" ; textSearch:score ?score] .
      allTriplesForBgp.push({
        subject: textVariable,
        predicate: TEXT_SEARCH_CONTAINS,
        object: containsNode
      });
      
      allTriplesForBgp.push({
        subject: containsNode,
        predicate: TEXT_SEARCH_WORD,
        object: turtle.serialize.nodeToN3(Rdf.literal(keyword)) // keyword already contains *
      });
      
      allTriplesForBgp.push({
        subject: containsNode,
        predicate: TEXT_SEARCH_SCORE,
        object: `?text_score_${i}`
      });


      // Add the entity search pattern: ?text textSearch:contains [textSearch:entity ?subject] .
      const entityNode = turtle.serialize.nodeToN3(Rdf.bnode());
      allTriplesForBgp.push({
        subject: textVariable,
        predicate: TEXT_SEARCH_CONTAINS,
        object: entityNode
      });
      
      allTriplesForBgp.push({
        subject: entityNode,
        predicate: TEXT_SEARCH_ENTITY,
        object: '?subject'
      });
      
      // Create the BGP pattern
      const bgpPattern = {
        type: 'bgp',
        triples: allTriplesForBgp
      };
      
      // Create the SERVICE pattern
      return {
        type: 'service',
        name: turtle.serialize.nodeToN3(Rdf.iri(TEXT_SEARCH_NS)),
        silent: false,
        patterns: [bgpPattern]
      };
    });
    
    // Replace score SUM variable
    const scoreSum = keywords.map((keyword: string, i: number) => `SUM(?text_score_${i})`).join(' + ');
    textQueryStr = textQueryStr.replaceAll('?__textScoreSumPattern__', scoreSum);
    // Parse the selected query
    const baseQuery = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(textQueryStr);

    // Apply the pattern using PatternBinder
    new PatternBinder('__textPattern__', parsedPattern).sparqlQuery(baseQuery);
    
    // Create bindings
    const bindings: Record<string, any> = {
      [SEMANTIC_SEARCH_VARIABLES.DOMAIN_VAR]: Rdf.fullIri(this.getCurrentDomainUri()),

      // Bind the search term variable to actual user input
      // we propagate it as is to similarity search
      [searchTermVariable!]: Rdf.literal(token),
    };
    
    // Only add AI assist value if AI is enabled for this domain and slider > 0
    if (withAi && sliderValue > 0) {
      bindings[aiAsistVariable] = Rdf.literal(sliderValue.toString(), Rdf.iri('http://www.w3.org/2001/XMLSchema#decimal'));
    }

    console.log(
      'Building keyword query with bindings:',)
      console.log(parsedPattern)
    console.log(
      SparqlClient.setBindings(baseQuery, bindings)
  );
    
    return SparqlClient.setBindings(baseQuery, bindings);
  };

  private buildDefaultQuery = () => (): SparqlJs.SelectQuery | null => {
    const { selectedDomainIndex } = this.state;
    
    // Get the default query for the current domain
    const defaultQueryKey = `defaultQuery${selectedDomainIndex}` as `defaultQuery${number}`;
    const defaultQueryStr = this.props[defaultQueryKey];
    
    if (!defaultQueryStr) {
      console.error('No default query available for the current domain');
      return null;
    }
    
    // Parse the default query
    const baseQuery = SparqlUtil.parseQuerySync<SparqlJs.SelectQuery>(defaultQueryStr);
    
    // Create bindings
    const bindings: Record<string, any> = {
      [SEMANTIC_SEARCH_VARIABLES.DOMAIN_VAR]: Rdf.fullIri(this.getCurrentDomainUri()),
    };
    
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
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        // Get resized image as data URL
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    });
  }
}

export default ImageSearchWithSlider;
