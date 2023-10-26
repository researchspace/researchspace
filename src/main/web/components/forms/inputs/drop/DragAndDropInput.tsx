/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as React from 'react';
import * as Immutable from 'immutable';
import * as uuid from 'uuid';
import * as _ from 'lodash';

import { Rdf } from 'platform/api/rdf';
import { listen } from 'platform/api/events';
import { Cancellation } from 'platform/api/async';

import { DropArea } from 'platform/components/dnd/DropArea';
import { Draggable } from 'platform/components/dnd';

import { TemplateItem } from 'platform/components/ui/template';
import { FieldValue, AtomicValue } from '../../FieldValues';
import {
  MultipleValuesInput,
  MultipleValuesProps,
} from '../MultipleValuesInput';

import { createDropAskQueryForField } from '../../ValidationHelpers';
import { NestedModalForm, tryExtractNestedForm } from '../NestedModalForm';

import { RemoveItemEvent } from './DragAndDropInputEvents';
import * as styles from './DragAndDropInput.scss';


export interface DragAndDropInputProps extends MultipleValuesProps {
  /**
   * Element id that is used in event system.
   * If not specified random UUID is generated instead.
   */
  id?: string

  /**
   * Template that is rendered when dragged item can be accepted by the input.
   *
   * Available variables:
   *  * canCreateNew - if there is nested semantic-form that can be used to create/edit entity
   */
  dropAreaTemplate?: string;

  /**
   * Template for placeholder card.
   *
   * @default
   * <div class='DragAndDropInput--placeholderContainer'>
   *    Drop item here
   *    {{#if canCreateNew}}
   *      or click to create a new item
   *    {{/if}}
   * </div>
   *
   */
  placeholderItemTemplate?: string;

  /**
   * Template for value item card.
   *
   * Available variables:
   *  * iri - iri string of the current value
   *  * inputId - current input id, can be used to trigger events on the input
   */
  itemTemplate?: string

  nestedFormTemplate?: string
}

interface State {
  /**
   * We track if item that is already inside droppable area is dragged to disable the area.
   */
  draggingItem: boolean;

  /**
   * true if nested form is currently in open state.
   */
  nestedFormOpen: boolean;

  /**
   * Component id, automatically generated if not propagated from props.
   */
  id: string;

  nestedForm?: React.ReactElement<any>;
}

/**
 *
 */
export class DragAndDropInput extends MultipleValuesInput<DragAndDropInputProps, State> {
  private cancelation = new Cancellation();

  static defaultProps: Partial<DragAndDropInputProps> = {
    dropAreaTemplate: '<span>Drop item here to add it</span>',
    placeholderItemTemplate: `
      <div class='DragAndDropInput--placeholderContainer'>
        Drop item here
        {{#if canCreateNew}}
          or click to create a new item
        {{/if}}
      </div>
    `,
    itemTemplate: `
        {{#> rsp:itemCardTemplate width=125 height=165 cardMargin=4 footer-paddingY=7 footer-paddingX=8}}
          {{#*inline "additionalActions"}}
            <div class="rs-default-card__hover-icon">
              <mp-event-trigger type='Form.DragAndDropInput.RemoveItem' targets='["{{inputId}}"]' data='{"iri": "{{iri}}"}'>
                <button type="button" class="rs-button" title="Remove Value">
                  <i class="rs-icon rs-icon-delete_round"></i>
                </button>
              </mp-event-trigger>
            </div>
          {{/inline}}
        {{/rsp:itemCardTemplate}}
    `
  }

  private htmlElement = React.createRef<HTMLDivElement>();

  constructor(props: DragAndDropInputProps, context: any) {
    super(props, context);
    this.state = {
      draggingItem: false,
      nestedFormOpen: false,
      id: this.props.id || uuid.v4(),
    };
  }

  componentDidMount() {
    this.cancelation
      .map(
        listen({
          eventType: RemoveItemEvent,
          target: this.state.id,
        })
      )
      .onValue((event) => this.onRemoveItem(event.data.iri));

    tryExtractNestedForm(this.props.children, this.context, this.props.nestedFormTemplate)
        .then(nestedForm => {
          if (nestedForm != undefined) {
            this.setState({nestedForm});
          }
        });
  }

  render() {
    const canCreateNew = !_.isEmpty(this.state.nestedForm);
    return (
      <div className={styles.holder} ref={this.htmlElement}>
        {
          this.props.readonly ? this.renderItems(false) :
          (
            <React.Fragment>
              <DropArea
                shouldReactToDrag={() => !this.state.draggingItem && this.props.definition.maxOccurs != this.props.values.filter(v => !FieldValue.isEmpty(v)).size}
                query={createDropAskQueryForField(this.props.definition)}
                onDrop={this.onDrop}
                dropMessage={this.dropMessage()}
              >
                {this.renderItems(canCreateNew)}
                {canCreateNew ? <div style={{display: 'none'}}>{this.props.children}</div>  : null}
              </DropArea>
              {
                this.state.nestedFormOpen ? (
                  <NestedModalForm
                    definition={this.props.definition}
                    onSubmit={this.onNestedFormSubmit}
                    onCancel={() => this.setState({ nestedFormOpen: false })}
                    parent={this.htmlElement}
                  >
                    {this.state.nestedForm}
                  </NestedModalForm>
                ): null
              }
            </React.Fragment>
          )
        }
      </div>
    );
  }

  private isEmpty() {
    return this.props.values.isEmpty() || this.props.values.every(FieldValue.isEmpty);
  }

  private dropMessage = () => <TemplateItem template={{ source: this.props.dropAreaTemplate }} />;

  private renderPlaceholderCard = (canCreateNew: boolean) => {
    const componentProps =
      canCreateNew ? { onClick: this.onCreateNew } : {};
    return (
      <TemplateItem
        template={{
          source: this.props.placeholderItemTemplate,
          options: {
            canCreateNew
          }
        }}
        componentProps={componentProps}
      />
    );
  }

  private renderItems(canCreateNew: boolean) {
    const className =
      this.props.renderHeader === false ?
      `${styles.itemArea} ${styles['itemArea--no-header']}` : styles.itemArea ;

    const shouldRenderPlacheldorCard =
      !this.props.readonly &&
      (this.props.values.filter(v => !FieldValue.isEmpty(v)).size < this.props.definition.maxOccurs);

    return (
      <div className={className}>
        {
          this.props.values.map(v => {
            if (FieldValue.isAtomic(v) && v.value.isIri) {
              return (
                <Draggable iri={v.value.value}
                  key={v.value.value}
                  onDragStart={this.onItemDragStart}
                  onDragEnd={this.onItemDragEnd}
                >
                  <div>
                    <TemplateItem
                      template={{
                        source: this.props.itemTemplate,
                        options: { iri: v.value.value, inputId: this.state.id }
                      }}
                    />
                  </div>
                </Draggable>
              );
            } else if (FieldValue.isEmpty(v)) {
              return null;
            } else {
              throw new Error('Only atomic IRI values are supported by DragAndDropInput');
            }
          })
        }
        {shouldRenderPlacheldorCard ? this.renderPlaceholderCard(canCreateNew) : null}
      </div>
    );
  }

  private onCreateNew = () => {
    this.setState((state) => ({ nestedFormOpen: !state.nestedFormOpen }));
  }

  private onNestedFormSubmit = (value: AtomicValue) => {
    this.setState({ nestedFormOpen: false });
    this.addAndValidate(value);
  };


  private onDrop = (iri: Rdf.Iri) => {
    const exists =
      this.props.values.findIndex(
        v => FieldValue.isAtomic(v) && v.value.isIri() && v.value.equals(iri)
      ) >= 0;
    if (!exists) {
      const value = FieldValue.fromLabeled({ value: iri });
      this.addAndValidate(value);
    }
  }

  private addAndValidate = (value: AtomicValue) => {
    const values = this.isEmpty() ? Immutable.List<FieldValue>([value]) : this.props.values.push(value);
    const { updateValues, handler } = this.props;
    updateValues(({ errors }) => handler.validate({ values, errors }));
  }

  private onRemoveItem = (iriString: string) => {
    const iri = Rdf.iri(iriString);
    const itemIndex =
      this.props.values.findIndex(
        v => FieldValue.isAtomic(v) && v.value.isIri() && v.value.equals(iri)
      );
    const values = this.props.values.remove(itemIndex)
    const { updateValues, handler } = this.props;
    updateValues(({ errors }) => handler.validate({ values, errors }));

  }

  private onItemDragStart = () => this.setState({ draggingItem: true });
  private onItemDragEnd = () => this.setState({ draggingItem: false });
}

export default DragAndDropInput;
