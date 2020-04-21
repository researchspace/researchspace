/**
 * ResearchSpace
 * Copyright (C) 2015-2020, © Trustees of the British Museum
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
import * as _ from 'lodash';
import * as Immutable from 'immutable';
import * as Maybe from 'data.maybe';
import { FormControl, FormGroup, ControlLabel, Button, InputGroup } from 'react-bootstrap';

import { Rdf } from 'platform/api/rdf';
import { navigateToResource } from 'platform/api/navigation';
import { Component } from 'platform/api/components';
import { getOverlaySystem } from 'platform/components/ui/overlay';
import { OverlayDialog } from 'platform/components/ui/overlay/OverlayDialog';
import { SelectionActionComponent } from 'platform/components/ui/selection/SelectionActionComponent';
import { MenuProps } from 'platform/components/ui/selection/SelectionActionProps';

import { AlignmentService } from './AlignmentService';
import { AlignmentMatch, AlignmentMetadata } from './AlignmentNodeModel';
import { serializeAlignment } from './Serialization';

import * as styles from './AlignmentTool.scss';

export interface CreateAlignmentActionProps extends MenuProps {
  selection: Array<string>;
}

export const ACTION_DIALOG_REF = 'dialog-action';

interface DialogProps {
  state: AlignmentMetadata;
}

class CreateAlignmentDialog extends React.Component<DialogProps, AlignmentMetadata> {
  constructor(props: DialogProps, context) {
    super(props, context);
    this.state = this.props.state;
  }

  render() {
    return (
      <OverlayDialog
        show={true}
        title="New Alignment"
        type="modal"
        onHide={() => getOverlaySystem().hide(ACTION_DIALOG_REF)}
      >
        <FormGroup>
          <ControlLabel>IRI</ControlLabel>
          <FormControl
            type="text"
            placeholder="alignment IRI (optional)"
            value={this.state.iri.map((i) => i.value).getOrElse('')}
            onChange={(event) => {
              const value = ((event.target as any) as HTMLInputElement).value;
              if (_.isEmpty(value)) {
                this.setState({ iri: Maybe.Nothing<Rdf.Iri>() });
              } else {
                this.setState({ iri: Maybe.Just(Rdf.iri(value)) });
              }
            }}
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>label*</ControlLabel>
          <FormControl
            type="text"
            placeholder="label"
            value={this.state.label}
            onChange={(event) =>
              this.setState({
                label: ((event.target as any) as HTMLInputElement).value,
              })
            }
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>description*</ControlLabel>
          <FormControl
            type="text"
            placeholder="description"
            value={this.state.description}
            onChange={(event) =>
              this.setState({
                description: ((event.target as any) as HTMLInputElement).value,
              })
            }
          />
        </FormGroup>
        <FormGroup>
          <ControlLabel>Source</ControlLabel>
          <InputGroup>
            <FormControl type="text" readOnly={true} value={this.state.source.value} />
            <InputGroup.Button>
              <Button
                className={styles.swapTerminologies}
                title="Swap source and target terminologies"
                onClick={this.swapTerminologies}
              >
                <span className="fa fa-exchange fa-flip-vertical"></span>
              </Button>
            </InputGroup.Button>
          </InputGroup>
        </FormGroup>
        <FormGroup>
          <ControlLabel>Target</ControlLabel>
          <FormControl type="text" value={this.state.target.value} readOnly={true} />
        </FormGroup>
        <FormGroup>
          <Button onClick={this.onCreate}>Create</Button>
        </FormGroup>
      </OverlayDialog>
    );
  }

  onCreate = () => {
    const service = new AlignmentService(this.context.semanticContext);
    const emptyState = {
      matches: Immutable.Map<string, ReadonlyArray<AlignmentMatch>>(),
      metadata: this.state,
    };
    const alignment = serializeAlignment(emptyState);

    service
      .addResource(
        alignment,
        this.state.iri.map((i) => i.value)
      )
      .flatMap((alignmentIri) => {
        return navigateToResource(alignmentIri, {}, 'assets');
      })
      .onValue(() => {
        /**/
      });
  };

  private swapTerminologies = () => this.setState(({ source, target }) => ({ source: target, target: source }));
}

type ActionState = AlignmentMetadata;

export class CreateAlignmentAction extends Component<CreateAlignmentActionProps, ActionState> {
  constructor(props: CreateAlignmentActionProps, context: any) {
    super(props, context);
    this.state = {
      iri: Maybe.Nothing<Rdf.Iri>(),
      source: null,
      target: null,
      label: '',
      description: '',
    };
  }
  componentWillReceiveProps(props: CreateAlignmentActionProps) {
    this.setState({
      source: Rdf.iri(props.selection[0]),
      target: Rdf.iri(props.selection[1]),
    });
  }

  render() {
    const selection = this.props.selection;
    const disabled = selection.length < 2;
    return (
      <SelectionActionComponent
        title="Align"
        disabled={disabled}
        selection={selection}
        closeMenu={this.props.closeMenu}
        onAction={this.onAction}
      />
    );
  }

  onAction = (selection: Array<string>) => {
    getOverlaySystem().show(ACTION_DIALOG_REF, <CreateAlignmentDialog state={this.state} />);
  };
}
export default CreateAlignmentAction;
