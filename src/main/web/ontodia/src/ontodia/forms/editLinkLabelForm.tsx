/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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
import { Link } from '../diagram/elements';
import { DiagramView } from '../diagram/view';

const CLASS_NAME = 'ontodia-edit-form';

export interface Props {
  view: DiagramView;
  link: Link;
  onApply: (label: string) => void;
  onCancel: () => void;
}

export interface State {
  label?: string;
}

export class EditLinkLabelForm extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const label = this.computeLabel();
    this.state = { label };
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.link.typeId !== prevProps.link.typeId) {
      const label = this.computeLabel();
      this.setState({ label });
    }
  }

  private computeLabel(): string {
    const { view, link } = this.props;

    const linkType = view.model.getLinkType(link.typeId);
    const template = view.createLinkTemplate(linkType);
    const { label = {} } = template.renderLink(link);

    const labelTexts = label.attrs && label.attrs.text ? label.attrs.text.text : undefined;
    return labelTexts && labelTexts.length > 0
      ? view.selectLabel(labelTexts).value
      : view.formatLabel(linkType.label, linkType.id);
  }

  render() {
    const { onApply, onCancel } = this.props;
    const { label } = this.state;
    return (
      <div className={CLASS_NAME}>
        <div className={`${CLASS_NAME}__body`}>
          <div className={`${CLASS_NAME}__form-row`}>
            <label>Connection label</label>
            <input
              className="ontodia-form-control"
              value={label}
              onChange={(e) => this.setState({ label: (e.target as HTMLInputElement).value })}
            />
          </div>
          <div className={`${CLASS_NAME}__controls`}>
            <button className="btn btn-default" onClick={() => onCancel()}>
              Cancel
            </button>
            <button
              className={`btn btn-action ${CLASS_NAME}__apply-button`}
              onClick={() => onApply(label)}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }
}
