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
import { FormGroup, InputGroup, FormControl, Button, Row, Col } from 'react-bootstrap';
import ReactSelect from 'react-select';

import { LocalizedValue } from './FieldEditorState';

export interface Props {
  label: LocalizedValue;
  isRequired: boolean;
  langOptions: Array<{ value: string; label: string; disabled: boolean }>;
  onChangeLabelValue: (value: string) => void;
  onChangeLabelLang: (lang: string) => void;
  onDeleteLabel: () => void;
}

export class FieldEditorLabel extends React.Component<Props, {}> {
  render() {
    const { label, isRequired, langOptions, onChangeLabelValue, onChangeLabelLang, onDeleteLabel } = this.props;
    const { value, lang } = label;
    return (
      <FormGroup>
        <InputGroup>
          <FormControl
            placeholder="Label"
            value={value.value}
            onChange={(e) => {
              const { value: newLabelValue } = e.target as HTMLInputElement;
              onChangeLabelValue(newLabelValue);
            }}
          />
          <div className="input-group-btn" style={{ fontSize: 'inherit', display: 'flex' }}>
            <div className="field-editor__lang-selector-holder">
              <ReactSelect
                value={lang}
                options={langOptions}
                clearable={false}
                onChange={(opt: { value: string }) => onChangeLabelLang(opt.value)}
              />
            </div>
            {!isRequired ? (
              <Button className="field-editor__delete-label-button" onClick={() => onDeleteLabel()}>
                <i className="fa fa-times" />
              </Button>
            ) : null}
          </div>
        </InputGroup>
        {value.error ? (
          <Row className="field-editor__error">
            <Col md={12}>{value.error.message}</Col>
          </Row>
        ) : null}
      </FormGroup>
    );
  }
}
