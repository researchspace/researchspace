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

import { createFactory, cloneElement, Children } from 'react';
import * as D from 'react-dom-factories';
import * as ReactBootstrap from 'react-bootstrap';
import * as Kefir from 'kefir';

import { Component } from 'platform/api/components';
import { trigger } from 'platform/api/events';
import { componentToGraph } from 'platform/api/persistence/ComponentPersistence';
import { Rdf } from 'platform/api/rdf';
import { VocabPlatform, rdfs } from 'platform/api/rdf/vocabularies/vocabularies';
import { SetManagementEvents } from 'platform/api/services/ldp-set/SetManagementEvents';
import { ldpc } from 'platform/api/services/ldp';
import { addToDefaultSet } from 'platform/api/services/ldp-set';

import { Spinner } from 'platform/components/ui/spinner/Spinner';
import { isValidChild } from 'platform/components/utils';
import { ResourceLinkComponent } from 'platform/api/navigation/components/ResourceLinkComponent';

const Button = createFactory(ReactBootstrap.Button);
const Modal = createFactory(ReactBootstrap.Modal);
const ModalHeader = createFactory(ReactBootstrap.ModalHeader);
const ModalFooter = createFactory(ReactBootstrap.ModalFooter);
const ModalBody = createFactory(ReactBootstrap.ModalBody);
const FormControl = createFactory(ReactBootstrap.FormControl);
const ResourceLink = createFactory(ResourceLinkComponent);

interface Props {
  id: string;
  component?: any;

  /**
   * `true` if persisted component should be added to the default set of the current user
   *
   * @default false
   */
  addToDefaultSet?: boolean;
}

interface State {
  show: 'hide' | 'editor' | 'saving' | 'success';
  savedIri?: string;
  label?: string;
  description?: string;
}

export class ActionSaveComponent extends Component<Props, State> {
  static defaultProps: Partial<Props> = {
    addToDefaultSet: false,
  };

  constructor(props: Props, context: any) {
    super(props, context);
    this.state = { show: 'hide' };
  }

  onClick = () => {
    this.setState({ show: 'editor' });
  }

  onSave = () => {
    this.setState({ show: 'saving' });

    const componentGraph = componentToGraph({
      component: this.props.component,
      componentRoot: Rdf.iri(''),
      parentTemplateScope: this.appliedTemplateScope,
      semanticContext: this.context.semanticContext,
    });

    const { label, description } = this.state;
    const { graph } = addLabelAndDescription(componentGraph, label, description);

    ldpc(VocabPlatform.PersistedComponentContainer.value)
      .addResource(graph)
      .flatMap((res) => (this.props.addToDefaultSet ? addToDefaultSet(res, this.props.id) : Kefir.constant(res)))
      .onValue((resourceIri) => {
        trigger({ eventType: SetManagementEvents.ItemAdded, source: this.props.id });
        this.setState({ show: 'success', savedIri: resourceIri.value });
      });
  }

  onCancel = () => {
    this.setState({
      show: 'hide',
      savedIri: undefined,
      label: undefined,
      description: undefined,
    });
  }

  renderModal() {
    switch (this.state.show) {
      case 'editor':
        return Modal(
          { show: true, onHide: this.onCancel },
          ModalHeader({}, 'Save visualization'),
          ModalBody(
            {},
            'Label:',
            FormControl({
              value: this.state.label ? this.state.label : '',
              onChange: (e) => {
                const newValue = (e.target as any).value;
                this.setState({ label: newValue });
              },
            }),
            'Description:',
            FormControl({
              type: 'textarea',
              value: this.state.description ? this.state.description : '',
              onChange: (e) => {
                const newValue = (e.target as any).value;
                this.setState({ description: newValue });
              },
            })
          ),
          ModalFooter(
            {},
            Button({ disabled: !this.state.label, onClick: this.onSave }, 'OK'),
            Button({ onClick: this.onCancel }, 'Cancel')
          )
        );
      case 'saving':
        return Modal(
          { show: true, onHide: this.onCancel },
          ModalHeader({}, 'Saving in progress'),
          ModalBody({}, Spinner())
        );
      case 'success':
        return Modal(
          { show: true, onHide: this.onCancel },
          ModalHeader({}, 'Success'),
          ModalBody({}, 'Visualization ', ResourceLink({ uri: this.state.savedIri }), 'has been saved successfully!'),
          ModalFooter({}, Button({ onClick: this.onCancel }, 'OK'))
        );
      case 'hide':
        return null;
    }
  }

  render() {
    if (isValidChild(this.props.children)) {
      const child = Children.only(this.props.children);
      return cloneElement(
        child,
        { ...child.props, onClick: this.onClick },
        ...child.props.children,
        this.renderModal()
      );
    }
    return Button(
      {
        title: 'Save into default set',
        onClick: this.state.show == 'hide' ? this.onClick : undefined,
      },
      D.i({ className: 'fa fa-save' }),
      this.renderModal()
    );
  }
}

function addLabelAndDescription(
  { pointer, graph }: Rdf.PointedGraph,
  label: string | undefined,
  description: string | undefined
): Rdf.PointedGraph {
  let triples = graph.triples;
  if (label) {
    triples = triples.add(Rdf.triple(pointer, rdfs.label, Rdf.literal(label)));
  }
  if (description) {
    triples = triples.add(Rdf.triple(pointer, rdfs.comment, Rdf.literal(description)));
  }
  return Rdf.pg(pointer, Rdf.graph(triples));
}

export default ActionSaveComponent;
