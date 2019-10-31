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

import * as classnames from 'classnames';
import * as React from 'react';
import { Badge, Nav, NavItem, Tab } from 'react-bootstrap';

import { Component, ComponentProps } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';

import { TemplateItem } from 'platform/components/ui/template';

import * as Schema from '../model/AnnotationSchema';
import {
  WorkspacePermissions, WorkspaceHandlers, AnnotationBodyType, TextAnnotationTemplateBindings
} from '../model/ComponentModel';

import * as styles from './AnnotationSidebar.scss';

export interface AnnotationSidebarProps {
  className?: string;
  annotationTypes: ReadonlyMap<string, AnnotationBodyType>;
  fallbackTemplate: string;
  annotations: ReadonlyArray<Schema.Annotation>;
  focusedAnnotation?: Rdf.Iri;
  highlightedAnnotations: ReadonlySet<string>;
  permissions: WorkspacePermissions;
  handlers: WorkspaceHandlers;
}

interface State {
  selectedTab?: string;
}

const ALL_TYPES_TAB = 'all';

export class AnnotationSidebar extends Component<AnnotationSidebarProps, State> {
  private annotationList: HTMLElement | null;

  constructor(props: AnnotationSidebarProps, context: any) {
    super(props, context);
    this.state = {
      selectedTab: ALL_TYPES_TAB,
    };
  }

  componentDidUpdate(prevProps: AnnotationSidebarProps) {
    const {focusedAnnotation} = this.props;
    if (focusedAnnotation && !Schema.sameIri(focusedAnnotation, prevProps.focusedAnnotation)) {
      this.scrollAnnotationIntoView(focusedAnnotation);
    }
  }

  render() {
    const {
      className, annotationTypes, annotations, focusedAnnotation, highlightedAnnotations
    } = this.props;
    const {selectedTab} = this.state;
    return (
      <div className={classnames(styles.component, className)}>
        <Tab.Container id='rs-text-annotation-types'
          activeKey={selectedTab}
          // type cast as workaround to wrong React Bootstrap typings
          onSelect={this.onSelectTab as (e: any) => void}>
          <Nav bsStyle='tabs'>
            <NavItem eventKey={ALL_TYPES_TAB} title='All annotations'>all</NavItem>
            {Array.from(annotationTypes.values(), type => {
              const count = countAnnotationForTab(annotations, type.iri.value);
              return (
                <NavItem key={type.iri.value}
                  eventKey={type.iri.value}
                  disabled={count === 0}
                  title={type.label}>
                  <div className={styles.tabHeader}>
                    {type.iconUrl ? (
                      <img className={styles.tabIcon} src={type.iconUrl} />
                    ) : (
                      <span>{type.label}</span>
                    )}
                  </div>
                </NavItem>
              );
            })}
          </Nav>
        </Tab.Container>
        <div className={styles.annotationList} ref={this.onAnnotationListMount}>
          {annotations.map(anno => {
            return this.renderAnnotation(anno, {
              hidden: !shouldRenderInTab(anno, selectedTab),
              focused: Schema.sameIri(anno.iri, focusedAnnotation),
              highlighted: highlightedAnnotations.size === 0
                || highlightedAnnotations.has(anno.iri.value)
            });
          })}
        </div>
      </div>
    );
  }

  private onAnnotationListMount = (annotationList: HTMLElement | null) => {
    this.annotationList = annotationList;
  }

  private onSelectTab = (tabKey: string) => {
    this.setState({selectedTab: tabKey});
  }

  private renderAnnotation(annotation: Schema.Annotation, options: {
    hidden: boolean;
    focused: boolean;
    highlighted: boolean;
  }) {
    const {annotationTypes, fallbackTemplate: defaultTemplate, permissions} = this.props;

    const isPlaceholder = Schema.sameIri(annotation.iri, Schema.PLACEHOLDER_ANNOTATION);

    const bodyType = annotation.bodyType;
    const bodyTypeMetadata = bodyType ? annotationTypes.get(bodyType.value) : undefined;

    const className = classnames(styles.annotation, {
      [styles.focused]: options.focused,
      [styles.highlighted]: options.highlighted,
    });
    return (
      <div key={annotation.iri.value}
        data-annotation-iri={annotation.iri.value}
        className={className}
        style={options.hidden ? {display: 'none'} : undefined}
        onClick={this.onClickInsideAnnotation}>
          {isPlaceholder ? (
            // render placeholder for new annotation
            <div className={styles.newAnnotationPlaceholder}>
              New annotation
            </div>
          ) : null}

          {!isPlaceholder && bodyTypeMetadata ? (
            // render template for existing annotation with known body type
            <TemplateScopeProvider markupTemplateScope={bodyTypeMetadata.templateScope}>
              <TemplateItem key={annotation.renderVersion}
                template={{
                  source: bodyTypeMetadata.template,
                  options: TextAnnotationTemplateBindings.compute(
                    annotation, bodyTypeMetadata, permissions
                  ),
                }}
              />
            </TemplateScopeProvider>
          ) : null}

          {!isPlaceholder && !bodyTypeMetadata ? (
            // render template for existing annotation with unknown body type
            <TemplateItem template={{
              source: defaultTemplate,
              options: TextAnnotationTemplateBindings.compute(
                annotation, bodyTypeMetadata, permissions
              ),
            }} />
          ) : null}
      </div>
    );
  }

  private onClickInsideAnnotation = (e: React.MouseEvent<HTMLElement>) => {
    const {handlers} = this.props;
    const target = e.target;
    if (target instanceof HTMLButtonElement) {
      const iri = target.getAttribute('data-annotation');
      if (iri) {
        if (target.name === 'edit') {
          handlers.beginEditingAnnotation(Rdf.iri(iri));
        } else if (target.name === 'delete') {
          handlers.deleteAnnotation(Rdf.iri(iri));
        }
      }
    }
  }

  private scrollAnnotationIntoView(target: Rdf.Iri) {
    if (!this.annotationList) {
      return;
    }
    const listBounds = this.annotationList.getBoundingClientRect();
    const elements = this.annotationList.children;
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i] as HTMLElement;
      const iri = element.getAttribute('data-annotation-iri');
      if (iri === target.value) {
        const elementBounds = element.getBoundingClientRect();
        const elementTop = elementBounds.top - listBounds.top;
        const listScrollTop = this.annotationList.scrollTop;
        const listScrollBottom = listScrollTop + listBounds.height;
        const isOutsideView = elementTop < listScrollTop
          || (elementTop + elementBounds.height) > listScrollBottom;
        if (isOutsideView) {
          this.annotationList.scrollTop = elementTop;
        }
      }
    }
  }
}

class TemplateScopeProvider extends Component<ComponentProps, {}> {
  render() {
    return React.Children.only(this.props.children);
  }
}

function shouldRenderInTab(annotation: Schema.Annotation, tabKey: string) {
  return tabKey === ALL_TYPES_TAB
    || annotation.bodyType && annotation.bodyType.value === tabKey;
}

function countAnnotationForTab(annotations: ReadonlyArray<Schema.Annotation>, tabKey: string) {
  if (tabKey === ALL_TYPES_TAB) {
    return annotations.length;
  }
  let count = 0;
  for (const anno of annotations) {
    if (anno.bodyType && anno.bodyType.value === tabKey) {
      count++;
    }
  }
  return count;
}
