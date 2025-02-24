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
import { MetadataApi } from '../data/metadataApi';
import { ElementModel, LinkModel, sameLink } from '../data/model';

import { EditorController } from '../editor/editorController';
import { DiagramView } from '../diagram/view';
import { LinkDirection } from '../diagram/elements';

import { Cancellation } from '../viewUtils/async';

import { ProgressBar, ProgressState } from '../widgets/progressBar';

import { LinkTypeSelector, LinkValue, validateLinkType } from './linkTypeSelector';

const CLASS_NAME = 'ontodia-edit-form';

export interface Props {
  editor: EditorController;
  view: DiagramView;
  metadataApi: MetadataApi | undefined;
  link: LinkModel;
  source: ElementModel;
  target: ElementModel;
  onChange: (entity: LinkModel) => void;
  onApply: (entity: LinkModel) => void;
  onCancel: () => void;
}

export interface State {
  linkValue?: LinkValue;
  isValidating?: boolean;
}

export class EditLinkForm extends React.Component<Props, State> {
  private validationCancellation = new Cancellation();

  constructor(props: Props) {
    super(props);
    this.state = {
      linkValue: {
        value: { link: props.link, direction: LinkDirection.out },
        validated: true,
        allowChange: true,
      },
    };
  }

  componentDidMount() {
    this.validate();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    const { linkValue } = this.state;
    if (!sameLink(linkValue.value.link, prevState.linkValue.value.link)) {
      this.validate();
    }
    if (linkValue !== prevState.linkValue && linkValue.validated && linkValue.allowChange) {
      this.props.onChange(linkValue.value.link);
    }
  }

  componentWillUnmount() {
    this.validationCancellation.abort();
  }

  private validate() {
    const { editor, link: originalLink } = this.props;
    const {
      linkValue: { value },
    } = this.state;
    this.setState({ isValidating: true });

    this.validationCancellation.abort();
    this.validationCancellation = new Cancellation();
    const signal = this.validationCancellation.signal;

    validateLinkType(editor, value.link, originalLink).then((error) => {
      if (signal.aborted) {
        return;
      }
      this.setState(({ linkValue }) => ({
        linkValue: { ...linkValue, ...error, validated: true },
        isValidating: false,
      }));
    });
  }

  render() {
    const { editor, view, metadataApi, source, target } = this.props;
    const { linkValue, isValidating } = this.state;
    const isValid = !linkValue.error;
    return (
      <div className={CLASS_NAME}>
        <div className={`${CLASS_NAME}__body`}>
          <LinkTypeSelector
            editor={editor}
            view={view}
            metadataApi={metadataApi}
            linkValue={linkValue}
            source={source}
            target={target}
            onChange={(value) =>
              this.setState({
                linkValue: { value, error: undefined, validated: false, allowChange: false },
              })
            }
          />
          {isValidating ? (
            <div className={`${CLASS_NAME}__progress`}>
              <ProgressBar state={ProgressState.loading} height={10} />
            </div>
          ) : null}
          <div className={`${CLASS_NAME}__controls`}>
            <button className="btn btn-default" onClick={this.props.onCancel}>
              Cancel
            </button>
            <button
              className={`btn btn-action ${CLASS_NAME}__apply-button`}
              onClick={() => this.props.onApply(linkValue.value.link)}
              disabled={!isValid || isValidating}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }
}
