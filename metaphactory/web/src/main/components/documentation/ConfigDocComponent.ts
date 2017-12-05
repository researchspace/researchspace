/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import {DOM as D, Component} from 'react';
import {doc} from 'docson';
import * as _ from 'lodash';
import { compose } from 'core.lambda';

import { JsonSchema } from './JsonSchema';
import 'docson/css/docson.css';
import './ConfigDocComponent.scss';

const box: string = require('raw-loader!./templates/box.html');
const signature: string = require('raw-loader!./templates/signature.html');

interface Props {
  type: string;
}

type PropertyTransformer =
  (fn: (key: string, value?: any) => string) => (json: JsonSchema) => JsonSchema;
export default class ConfigDocComponent extends Component<Props, {}>  {

  private container: HTMLElement;

  componentDidMount() {
    this.renderDocson(
      require('../../../../schemas/' + this.props.type + '.json')
    );
  }

  private renderDocson = (jsonSchema: JsonSchema) => {
    doc(
      this.container,
      this.handleProperties(jsonSchema),
      {box: box, signature: signature}
    );
  }

  public render() {
    return D.div(
      {},
      D.div({ref: container => this.container = container}),
      D.span({className: 'typingsRequiredLabel'}, '* - required')
    );
  }

  private transformPropertyName: PropertyTransformer = fn => json  => {
    json.properties = _.mapKeys(json.properties, (val, key: string) => fn(key));
    json.required = _.map(json.required, fn);
    json.propertyOrder = _.map(json.propertyOrder, fn);
    if (json.anyOf) {
      _.forEach(json.anyOf, ({$ref}) => {
        const refName = _.last(_.split($ref, '/'));
        json.definitions[refName] = this.transformPropertyName(fn)(json.definitions[refName]);
      });
    }
    return json;
  }

  private transformPropertyValue: PropertyTransformer = fn => json  => {
    json.properties = _.mapValues(json.properties, (val, key) => fn(key, val));
    if (json.anyOf) {
      _.forEach(json.anyOf, ({$ref}) => {
        const refName = _.last(_.split($ref, '/'));
        json.definitions[refName] = this.transformPropertyValue(fn)(json.definitions[refName]);
      });
    }
    return json;
  }


  private handleClassNameProperty = (key: string) =>
    key === 'className' ? 'class' : key

  private handleStyleValue = (key: string, value: any) => {
    if (key === 'style' && value.$ref === '#/definitions/React.CSSProperties') {
      delete value.$ref;
      value.type = 'string';
    }
    return value;
  }

  private transformJsonToHtmlAttributes = this.transformPropertyName(_.kebabCase);
  private transformClassNameAttribute = this.transformPropertyName(this.handleClassNameProperty);
  private transformStyleAttribute = this.transformPropertyValue(this.handleStyleValue);

  private handleProperties =
    _.reduce<(json: JsonSchema) => JsonSchema, (json: JsonSchema) => JsonSchema>(
      [
        this.transformJsonToHtmlAttributes, this.transformClassNameAttribute,
        this.transformStyleAttribute,
      ],
      (a, b) => compose(a)(b)
    );
}
