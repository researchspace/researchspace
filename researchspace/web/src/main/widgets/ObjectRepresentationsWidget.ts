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
 * @author Mike Kelly <mkelly@britishmuseum.org>
 */

import { Component, createElement, createFactory } from 'react';
import * as D from 'react-dom-factories';
import * as ReactBootstrap from 'react-bootstrap';
import * as classNames from 'classnames';
import { TransitionGroup, CSSTransition } from 'react-transition-group';
import * as maybe from 'data.maybe';
import * as _ from 'lodash';

import {SparqlClient} from 'platform/api/sparql';

import TemplateItem from 'platform/components/ui/template/TemplateItem';
import { Spinner } from 'platform/components/ui/spinner';


const Modal = createFactory(ReactBootstrap.Modal);
const ModalHeader = createFactory(ReactBootstrap.Modal.Header);
const ModalTitle = createFactory(ReactBootstrap.Modal.Title);
const ModalBody = createFactory(ReactBootstrap.Modal.Body);

import '../scss/object-representations-widget.scss';


interface ObjectRepsWidgetProps {
  /**
   * should return 'label', 'imgURL', 'isMainRep' values
   * where 'label' is the entity label, not the image label
   */
  query: string
  /**
   * can be used to format the thumbnail images which display below the large featured image
   */
  template?: string
  context: {[key: string]: string}
  /**
   * optional property to set maximum width of modal full-size representation
   */
  maxModalWidth?: number
}

interface Rep {
  imgURL: string
  loaded: boolean
  width?: number
  height?: number
}

// make all optional to allow for partial updates
interface ObjectRepsWidgetState {
  data?: SparqlClient.SparqlSelectResult
  // main representation image (PX_has_main_representation)
  mainPreviewRep?: Data.Maybe<Rep>
  otherPreviewReps?: Array<Rep>
  // featured representation image (displayed as large image above thumbnails)
  focusedPreviewRep?: Data.Maybe<Rep>
  // current image shown in modal window
  focusedModalRep?: Data.Maybe<Rep>
  modalIsDisplayed?: boolean
  modalNavIsDisplayed?: boolean
  isLoading?: boolean
  imagesAreLoading?: boolean
}

/**
 * ObjectRepresentationsWidget - component to display object representation images.
 *
 * @example
 *
 * <rs-object-representations query='SELECT ?label (bound(?mainRepresentationImage) AS ?isMainRep) (STR(COALESCE(?mainRepresentationImage,?representationImage)) AS ?imgURL)
 * WHERE {
 *        {
 *          ?? rso:displayLabel ?label .
 *        }
 *        UNION {
 *                ?? crm:P138i_has_representation ?representationImage .
 *              }
 *        UNION {
 *                ?? rso:PX_has_main_representation ?mainRepresentationImage .
 *              }
 * }'
 * template='<img class="object-representations__image--rep" src="{{imgURL.value}}"/>'
 * >
 * </rs-object-representations>
 */

export class ObjectRepresentationsWidget extends Component<ObjectRepsWidgetProps, ObjectRepsWidgetState> {

  private allReps: Array<Rep>;
  private entityLabel: String;
  private largestPreviewRepHeight: number;
  private LARGEST_PREVIEW_REP_WIDTH: number;
  private TRANSITION_TIME: number;

  static defaultProps = {
    query: '',
    template: '<img class="object-representations__image--rep" src="{{imgURL.value}}"/>',
    context: {},
    maxModalWidth: 1200
  };

  constructor(props: ObjectRepsWidgetProps, context) {
    super(props, context);
    this.state = {
      modalIsDisplayed: false,
      modalNavIsDisplayed: false,
      isLoading: true,
      imagesAreLoading: true,
      mainPreviewRep: maybe.Nothing<Rep>(),
      focusedPreviewRep: maybe.Nothing<Rep>(),
      focusedModalRep: maybe.Nothing<Rep>(),
    };
    this.allReps = [];
    this.entityLabel = '';
    this.largestPreviewRepHeight = 0;
    this.LARGEST_PREVIEW_REP_WIDTH = 300;
    this.TRANSITION_TIME = 300;
  }

  componentDidMount() {
    this.executeQuery(this.props);
  }

  private executeQuery(props: ObjectRepsWidgetProps) {
    const IS_MAIN_REP = 'isMainRep';
    const IMG_URL = 'imgURL';
    const LABEL = 'label';
    let mainPreviewRep = maybe.Nothing<Rep>();
    let focusedPreviewRep = maybe.Nothing<Rep>();
    let otherPreviewReps: Array<Rep> = [];


    SparqlClient.select(props.query).onValue(
      res => {
        _.forEach(
          res.results.bindings,
          binding => {
            if (mainPreviewRep.isNothing && binding[IS_MAIN_REP].value === 'true') {
              mainPreviewRep = maybe.Just({imgURL: binding[IMG_URL].value, loaded: false});
              focusedPreviewRep = maybe.Just({imgURL: binding[IMG_URL].value, loaded: false});
            } else {
              if (binding[IMG_URL]) {
                otherPreviewReps.push({imgURL: binding[IMG_URL].value, loaded: false});
              }
            }
            if (binding[LABEL]) {
              this.entityLabel = binding[LABEL].value;
            }
          }
        );
        if (mainPreviewRep.isNothing && otherPreviewReps.length) {
          mainPreviewRep = maybe.Just(otherPreviewReps.shift());
          focusedPreviewRep = mainPreviewRep;
        }
        if (mainPreviewRep.isNothing && otherPreviewReps.length === 0) {
          this.setState({imagesAreLoading: false});
        } else {
          // Monitor load status of images
          if (mainPreviewRep.isJust) {
            this.addToAllReps(mainPreviewRep.get().imgURL);
          }
          if (otherPreviewReps.length) {
            _.forEach(otherPreviewReps, (otherRep) => {
              this.addToAllReps(otherRep.imgURL);
            });
          }
        }
        this.setState({
          data: res,
          modalIsDisplayed: false,
          isLoading: false,
          mainPreviewRep: mainPreviewRep,
          otherPreviewReps: otherPreviewReps,
          focusedPreviewRep: focusedPreviewRep,
          focusedModalRep: focusedPreviewRep,
        });
      }
    );
  }

  render() {
    return D.div(
      { className: 'object-representations modal-container' },
      ...(this.state.isLoading ? [createElement(Spinner)] : this.getContents())
    );
  }

  private getContents() {
    if (this.state.mainPreviewRep.isJust) {
      return [
        this.createFocusedImageRepresentation(),
        this.createThumbnails(),
        this.createModal(),
        this.state.imagesAreLoading ? createElement(Spinner) : null,
      ];
    } else {
      return [];
    }
  }

  private createFocusedImageRepresentation() {
    // This is the large featured image
    // Set container div height to largest of all images,
    // so that thumbnails don't move about on image transitions
    let focused = this.state.focusedPreviewRep.get().imgURL;
    let style = {
      height: this.largestPreviewRepHeight + 'px',
    };

    return D.div(
      {
        title: 'Click to view full-size image',
        className: 'object-representations__image--focused',
        style: style,
        onClick: this.showModal.bind(this),
        onLoad: this.handleImageChanges,
      },
      createElement(TransitionGroup,
        {
          key: 'image-focused-transition-group',
        },
        createElement(CSSTransition,
          {
            key: focused,
            classNames: 'cross-fade',
            timeout: {
              enter: this.TRANSITION_TIME,
              exit: this.TRANSITION_TIME,
            }
          },
          D.img({
            className: 'image--focused',
            src: focused,
            key: focused,
          })
        )
      )
    );
  }

  private createThumbnails() {
    return createElement(TransitionGroup,
      {
        key: 'image-thumbs-transition-group',
      },
      createElement(CSSTransition,
        {
          key: 'object-representations__images',
          classNames: 'fade-in',
          appear: true,
          timeout: {
            appear: this.TRANSITION_TIME,
            enter: this.TRANSITION_TIME,
            exit: this.TRANSITION_TIME,
          }
        },
        D.div(
          {
            key: 'object-representations__images',
            className: 'object-representations__images',
          },
          // Thumbnail for main representation, which is always the first thumbnail
          // Don't bother showing it if there aren't any other thumbnails
          this.state.otherPreviewReps.length ?
            createElement(TemplateItem, {
              key: 'main-rep-thumb',
              template: {
                source: this.props.template,
                options: {imgURL: {value: this.state.mainPreviewRep.get().imgURL}},
              },
              componentProps: {
                className: classNames({
                  'object-representations__image--active':
                    (this.state.mainPreviewRep.get().imgURL === this.state.focusedPreviewRep.get().imgURL),
                  'object-representations__image':
                    (this.state.mainPreviewRep.get().imgURL !== this.state.focusedPreviewRep.get().imgURL),
                }),
                onClick: () => this.updateFocusedImage(this.state.mainPreviewRep.get().imgURL),
                onLoad: this.handleImageChanges,
              },
            }) : null,
          // Thumbnails for other representations
          this.state.otherPreviewReps.map((res, i) => {
            return createElement(TemplateItem, {
              key: 'other-rep-thumb-' + i,
              template: {
                source: this.props.template,
                options: {imgURL: {value: res.imgURL}},
              },
              componentProps: {
                className: classNames({
                  'object-representations__image--active':
                    (this.state.focusedPreviewRep.get().imgURL === res.imgURL),
                  'object-representations__image':
                    (this.state.focusedPreviewRep.get().imgURL !== res.imgURL),
                }),
                onClick: () => this.updateFocusedImage(res.imgURL),
                onLoad: this.handleImageChanges,
              },
            });
          })
        )
      )
    );
  }

  private createModal() {
    let fullSizeImgURL = this.state.focusedModalRep.isJust ? this.state.focusedModalRep.get().imgURL : '';
    let modalStyle = {
      width:  this.state.focusedModalRep.isJust ? this.state.focusedModalRep.get().width + 2 + 'px' : '0',
      overflow: 'hidden',
      margin: 'auto',
      paddingLeft: '0',
    };

    return Modal(
      {
        style: modalStyle as any,
        dialogClassName: 'object-representations-modal',
        show: this.state.modalIsDisplayed,
        onHide: this.hideModal.bind(this),
        onMouseEnter: this.showModalNav,
        onMouseLeave: this.hideModalNav,
        onKeyUp: this.handleModalKeyEvents,
      },
      ModalHeader(
        { closeButton: true},
        ModalTitle({}, this.entityLabel)
      ),
      ModalBody(
        {},
        createElement(TransitionGroup,
          {
            key: 'modal-nav-transition-group',
            className: 'object-representations-modal__body',
            style: {
              width: this.state.focusedModalRep.isJust ? `${this.state.focusedModalRep.get().width}px` : '0px',
              height: this.state.focusedModalRep.isJust ? `${this.state.focusedModalRep.get().height}px` : '0px',
            },
          },
          this.state.modalNavIsDisplayed ? [
            createElement(CSSTransition,
              {
                key: 'left',
                classNames: 'fade-in',
                appear: true,
                leave: true,
                timeout: {
                  appear: this.TRANSITION_TIME,
                  enter: this.TRANSITION_TIME,
                  exit: this.TRANSITION_TIME,
                }
              },
              D.span({
                className: 'object-representations-modal__nav fa fa-chevron-circle-left',
                onClick: this.prevModalImage.bind(this)
              })
            ),
            createElement(CSSTransition,
              {
                key: 'right',
                classNames: 'fade-in',
                appear: true,
                leave: true,
                timeout: {
                  appear: this.TRANSITION_TIME,
                  enter: this.TRANSITION_TIME,
                  exit: this.TRANSITION_TIME,
                }
              },
              D.span({
                className: 'object-representations-modal__nav fa fa-chevron-circle-right',
                onClick: this.nextModalImage.bind(this)
              })
            ),
          ] : []
        ),
        D.img({
          src: fullSizeImgURL,
          style: {
            width: this.state.focusedModalRep.isJust ? `${this.state.focusedModalRep.get().width}px` : '0px'
          }
        }),
      ) // end modal body
    ); // end modal
  }

  private updateFocusedImage(url) {
    let newFocusedRep = _.find(this.allReps, rep => rep.imgURL === url);
    this.setState(
      {
        focusedPreviewRep: maybe.Just(newFocusedRep),
        focusedModalRep: maybe.Just(newFocusedRep),
      }
    );
  }

  private handleImageChanges = (e) => {
    let aspectRatio = e.target.offsetHeight / e.target.offsetWidth;
    if (this.LARGEST_PREVIEW_REP_WIDTH * aspectRatio > this.largestPreviewRepHeight) {
      this.largestPreviewRepHeight = this.LARGEST_PREVIEW_REP_WIDTH * aspectRatio;
    }
    this.setImageLoaded(e);
    this.setState({imagesAreLoading: !this.allImagesAreLoaded()});
  };

  private setImageLoaded(e) {
    const maxHeight = window.innerHeight - 50;
    _.forEach(this.allReps, (rep) => {
      if (rep.imgURL === e.target.currentSrc) {
        rep.loaded = true;
        rep.width = e.target.naturalWidth <= this.props.maxModalWidth? e.target.naturalWidth: this.props.maxModalWidth;
        rep.height = rep.width / (e.target.naturalWidth / e.target.naturalHeight);
        if (rep.height > maxHeight) {
          rep.height = maxHeight;
          rep.width = rep.height / (e.target.naturalHeight / e.target.naturalWidth);
        }

        if (rep.imgURL === this.state.focusedPreviewRep.get().imgURL) {
          let newFocusedRep = this.state.focusedPreviewRep.get();
          newFocusedRep.width = rep.width;
          newFocusedRep.height = rep.height;
          this.setState({ focusedPreviewRep: maybe.Just(newFocusedRep) })
        }
        return false;
      }
    });
  }

  private addToAllReps(url) {
    if ( !_.some(this.allReps, ['imgURL', url]) ) {
      this.allReps.push({
        imgURL: url,
        loaded: false,
      });
    }
  }

  private allImagesAreLoaded() {
    return _.every(this.allReps, ['loaded', true]);
  }

  private hideModal() {
    this.setState(
      {
        modalIsDisplayed: false,
        focusedModalRep: this.state.focusedPreviewRep,
      }
    );
  }

  private showModal() {
    this.setState({modalIsDisplayed: true});
  }

  private showModalNav = () => {
    if (this.state.modalNavIsDisplayed === false && this.allReps.length > 1) {
      this.setState({modalNavIsDisplayed: true});
    }
  };

  private hideModalNav = () => {
    this.setState({modalNavIsDisplayed: false});
  };

  private nextModalImage() {
    if (this.allReps.length > 1) {
      let index = _.findIndex(this.allReps, {'imgURL': this.state.focusedModalRep.get().imgURL});
      if (index !== -1) {
        let nextIndex = (index === this.allReps.length - 1) ? 0 : index + 1;
        this.setState({
          focusedModalRep: maybe.Just(this.allReps[nextIndex]),
        });
      }
    }
  };

  private prevModalImage() {
    if (this.allReps.length > 1) {
      let index = _.findIndex(this.allReps, {'imgURL': this.state.focusedModalRep.get().imgURL});
      if (index !== -1) {
        let prevIndex = (index === 0) ? this.allReps.length - 1 : index - 1;
        this.setState({
          focusedModalRep: maybe.Just(this.allReps[prevIndex]),
        });
      }
    }
  };

  private handleModalKeyEvents = (e) => {
    if (e.keyCode === 37) {
      this.prevModalImage();
    } else if (e.keyCode === 39) {
      this.nextModalImage();
    } else if (e.keyCode === 27 ) {
      this.hideModalNav();
    }
  }

}

export type c = ObjectRepresentationsWidget;
export const c = ObjectRepresentationsWidget;
export const f = createFactory(c);
export default c;
