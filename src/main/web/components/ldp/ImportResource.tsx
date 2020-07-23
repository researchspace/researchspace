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
import { ReactElement, cloneElement, Children } from 'react';
import {
  FormGroup,
  FormControl,
  InputGroup,
  OverlayTrigger,
  Popover,
  Button,
  Radio,
  ControlLabel,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from 'react-bootstrap';
import * as assign from 'object-assign';

import { Rdf } from 'platform/api/rdf';
import { Component, ComponentContext } from 'platform/api/components';
import { ResourceLinkComponent } from 'platform/api/navigation/components';
import { refresh, navigateToResource } from 'platform/api/navigation';
import { LdpService } from 'platform/api/services/ldp';
import { ResourceLabel } from 'platform/components/ui/resource-label';
import { Spinner } from 'platform/components/ui/spinner/Spinner';

export interface Props {
  /**
   * Explicitly target container IRI, if not specify the best suitable container will be
   * found automatically.
   */
  container?: string;

  /**
   * Force import ignoring warning about dangling resources.
   */
  force?: boolean;

  /**
   * @default reload
   */
  postAction?: 'redirect' | 'reload' | string;
}

interface State {
  show?: boolean;
  wait?: boolean;
  serverError?: string;
  serverDialog?: any;
  serverDone?: any;
  selectedContainer?: string;
}

/**
 * Import LDP resource.
 * Read description of import process in comment to {@see org.researchspace.data.rdf.container.LDPApi.importLDPResource}
 * @example
 *  <mp-ldp-import-resource>
 *      <button class="btn btn-default">Import resource</button>
 *  </mp-ldp-import-resource>
 */
export class ImportResourceComponent extends Component<Props, State> {
  constructor(props: Props, context: ComponentContext) {
    super(props, context);
    this.state = {
      show: false,
      wait: false,
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (!this.state.show && nextState.show) {
      (this.refs['trigger'] as any).show();
    } else if (this.state.show && !nextState.show) {
      (this.refs['trigger'] as any).hide();
    }
    return true;
  }

  private performPostAction = (createdResource: string) => {
    if (!this.props.postAction || this.props.postAction === 'reload') {
      refresh();
    } else if (this.props.postAction === 'redirect') {
      navigateToResource(Rdf.iri(createdResource)).onValue((v) => v);
    } else {
      navigateToResource(Rdf.iri(this.props.postAction)).onValue((v) => v);
    }
  };

  getLDPService() {
    return new LdpService('', this.context.semanticContext);
  }

  importFromText = (text: string) => {
    this.setState({ wait: true });
    const ldpService = this.getLDPService();
    ldpService
      .importFromText(text, this.props.container, this.props.force)
      .onValue(this.onServerResponse)
      .onError(this.onServerError);
  };

  importFromURL = (url: string) => {
    const ldpService = this.getLDPService();
    ldpService
      .importGetTextFromURL(url)
      .flatMap((text) => {
        return ldpService
          .importFromText(text, this.props.container, this.props.force)
          .onValue(this.onServerResponse)
          .onError(this.onServerError);
      })
      .onError(this.onServerError);
  };

  importFromDelayedId = (delayedId: string, containerIRI: string) => {
    const ldpService = this.getLDPService();
    ldpService.importFromDelayedId(delayedId, containerIRI).onValue(this.onServerResponse).onError(this.onServerError);
  };

  onServerResponse = (response) => {
    if (response.status === 202) {
      this.setState({ serverDialog: response.text });
    } else if (response.status === 201) {
      this.setState({ serverDone: response.header['location'], wait: false });
    }
  };

  onServerError = (error) => {
    console.error('Error during import: ' + JSON.stringify(error));
    this.setState({ serverError: error, wait: false });
  };

  public renderContainerList(selectedContainer: string, possibleContainers: any[]) {
    return (
      <FormGroup>
        Select container to import into
        <FormGroup>
          {possibleContainers.map((containerIRI) => (
            <Radio
              name="select-container"
              value={containerIRI['@id']}
              checked={selectedContainer === containerIRI['@id']}
              onChange={() => this.setState({ selectedContainer: containerIRI['@id'] })}
            >
              <span title={containerIRI['@id']}>
                <ResourceLabel iri={containerIRI['@id']} />
              </span>
            </Radio>
          ))}
        </FormGroup>
      </FormGroup>
    );
  }

  public renderContainerMessage(selectedContainer: string, possibleContainers: any[]) {
    if (this.props.container) {
      return (
        <FormGroup>
          Import will be made into <ResourceLinkComponent uri={this.props.container} />
        </FormGroup>
      );
    }

    if (possibleContainers.length === 0) {
      return <FormGroup>Suitable for import container not found</FormGroup>;
    }

    if (possibleContainers.length === 1) {
      return (
        <FormGroup>
          Import will be made into <ResourceLinkComponent uri={possibleContainers[0]['@id']} />
        </FormGroup>
      );
    }

    if (possibleContainers.length > 1) {
      return this.renderContainerList(selectedContainer, possibleContainers);
    }

    return null;
  }

  private renderUnknownObjectsMessage(unknownObjects: any[]) {
    if (unknownObjects.length > 0) {
      return (
        <FormGroup>
          These object IRIs are not present in target DB:
          {unknownObjects.map((objectIRI) => (
            <div>
              <ControlLabel>{objectIRI['@id'] + '\n'}</ControlLabel>
            </div>
          ))}
        </FormGroup>
      );
    }
    return null;
  }

  public renderModal() {
    const { wait, serverDone, serverDialog, serverError, selectedContainer } = this.state;
    if (serverDone) {
      return (
        <Modal
          show={true}
          onHide={() => {
            this.setState({ serverDone: undefined }, () => this.performPostAction(serverDone));
          }}
        >
          <ModalHeader>
            <ModalTitle>Success</ModalTitle>
          </ModalHeader>
          <ModalBody>
            Import successfully done, resource <ResourceLinkComponent uri={serverDone} /> created
          </ModalBody>
        </Modal>
      );
    } else if (serverError) {
      return (
        <Modal
          show={true}
          onHide={() => {
            this.setState({ serverError: undefined });
          }}
        >
          <ModalHeader>
            <ModalTitle>Error</ModalTitle>
          </ModalHeader>
          <ModalBody>Unexpected error during import</ModalBody>
        </Modal>
      );
    } else if (serverDialog) {
      const { delayedImportRequestId, possibleContainers, unknownObjects } = JSON.parse(serverDialog);
      const canProceed =
        (this.props.container || possibleContainers.length > 0) &&
        (this.state.selectedContainer ||
          this.props.container ||
          (!this.props.container && possibleContainers.length === 1));
      const proceedIntoContainer = canProceed
        ? this.state.selectedContainer || this.props.container || possibleContainers[0]['@id']
        : null;

      return (
        <Modal
          show={true}
          onHide={() => {
            this.setState({ serverDialog: undefined });
          }}
        >
          <ModalHeader>
            <ModalTitle>Clarification needed</ModalTitle>
          </ModalHeader>
          <ModalBody>
            {this.renderContainerMessage(selectedContainer, possibleContainers)}
            {this.renderUnknownObjectsMessage(unknownObjects)}
          </ModalBody>
          <ModalFooter>
            <Button
              disabled={!canProceed}
              onClick={() => {
                this.importFromDelayedId(delayedImportRequestId, proceedIntoContainer);
                this.setState({ serverDialog: undefined, selectedContainer: undefined });
              }}
            >
              Proceed
            </Button>
            <Button
              onClick={() => this.setState({ serverDialog: undefined, selectedContainer: undefined, wait: false })}
            >
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      );
    } else if (wait) {
      return (
        <Modal show={true} onHide={() => {}}>
          <ModalBody>
            <Spinner />
          </ModalBody>
        </Modal>
      );
    }

    return null;
  }

  public render() {
    const child = Children.only(this.props.children) as ReactElement<any>;
    const popover = (
      <Popover id="import-resource">
        <FormControl
          type="file"
          className="input-sm"
          onChange={(e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files.length === 1) {
              const file = files[0];
              const fileReader = new FileReader();
              fileReader.onload = (e) => {
                const text = (e.target as any).result;
                this.setState({ show: false });
                this.importFromText(text);
              };
              fileReader.readAsText(file);
            }
          }}
        />
      </Popover>
    );

    return (
      <OverlayTrigger
        ref="trigger"
        trigger={[]}
        placement="bottom"
        rootClose={true}
        overlay={popover}
        onExit={() => {
          this.setState({ show: false });
        }}
      >
        {cloneElement(
          child,
          assign({}, child.props, {
            onClick: () => this.setState({ show: !this.state.show }),
          }),
          ...child.props.children,
          this.renderModal() // OverlayTrigger can have only one child
        )}
      </OverlayTrigger>
    );
  }
}

export default ImportResourceComponent;
