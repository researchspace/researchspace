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
import { Popover, OverlayTrigger } from 'react-bootstrap';
import * as classnames from 'classnames';

import { Rdf } from 'platform/api/rdf';
import { Component } from 'platform/api/components';
import { ResourceLink } from 'platform/api/navigation/components';

import { Spinner } from 'platform/components/ui/spinner';

import { getPreferredLabel } from '../FieldDefinition';
import { DataState, FieldError } from '../FieldValues';
import { MultipleValuesProps } from './MultipleValuesInput';

export interface ValidationMessagesProps {
  errors: Immutable.List<FieldError>;
}

const VALIDATION_CLASS = 'semantic-form-validation-messages';

export class ValidationMessages extends Component<ValidationMessagesProps, {}> {
  render() {
    const errorClassName = `${VALIDATION_CLASS}__error`;
    return (
      <ul className={VALIDATION_CLASS}>
        {this.props.errors.map((err, index) => (
          <li
            key={index}
            className={classnames(errorClassName, `${errorClassName}--${FieldError.kindToString(err.kind)}`)}
          >
            {err.message}
          </li>
        ))}
      </ul>
    );
  }
}

const DECORATOR_CLASS = 'semantic-form-input-decorator';

export class InputDecorator extends Component<MultipleValuesProps, {}> {
  static defaultProps: Partial<MultipleValuesProps> = {
    renderHeader: true,
  };

  render() {
    const { renderHeader, errors } = this.props;
    const className = classnames(DECORATOR_CLASS, {
      [`${DECORATOR_CLASS}--with-header`]: renderHeader,
    });
    return (
      <div className={className}>
        {renderHeader ? this.renderHeader() : null}
        {this.props.children}
        <ValidationMessages errors={errors} />
      </div>
    );
  }

  private renderHeader() {
    const { definition, dataState, label } = this.props;
    const isRequired = definition.minOccurs !== 0;
    const isReady = dataState === DataState.Ready;
    return (
      <div className={`${DECORATOR_CLASS}__header`}>
        {(definition.label && definition.label.length) || label ? (
          <ResourceLink resource={Rdf.iri(definition.iri)} draggable={false} target='_blank'>
            <span className={`${DECORATOR_CLASS}__label`}>
              {label ? label : getPreferredLabel(definition.label)}
              {isRequired ? <span className={`${DECORATOR_CLASS}__label-required`} title="Required field" />: null}
            </span>
          </ResourceLink>
        ) : null}
        {definition.description ? (
          <OverlayTrigger
            trigger={['hover', 'focus']}
            overlay={<Popover id="tooltip">{definition.description}</Popover>}
          >
            <sup className={`${DECORATOR_CLASS}__description-icon`} />
          </OverlayTrigger>
        ) : null}
        {isReady ? null : (
          <Spinner className={`${DECORATOR_CLASS}__spinner`} spinnerDelay={1000} messageDelay={30000} />
        )}
      </div>
    );
  }
}
