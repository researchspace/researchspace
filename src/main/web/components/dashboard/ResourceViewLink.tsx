/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */

import * as React from 'react';
import { uniqueId } from 'lodash';

import { SemanticContext, SemanticContextTypes } from 'platform/api/components/SemanticContext';
import { trigger } from 'platform/api/events';
import { Rdf } from 'platform/api/rdf';
import { ResourceLink } from 'platform/api/navigation/components/ResourceLink';
import { navigateToResource } from 'platform/api/navigation/Navigation';
import { ConfigHolder } from 'platform/api/services/config-holder';
import { getResourceConfiguration, getResourceConfigurationValue } from 'platform/api/services/resource-config';

import { AddFrameEvent } from './DashboardEvents';

export interface ResourceViewLinkConfig {
  /** IRI of the linked resource, whose configuration determines its view. */
  iri: string;
  /** Open a dashboard frame or navigate to a standalone resource page. @default "frame" */
  navigation?: 'frame' | 'page';
  /** Optional event source identifier; generated per instance when omitted. */
  id?: string;
  /** Optional dashboard component ID. When omitted, use the globally configured dashboard. */
  target?: string;
  /** Browser target for page mode. @default "_self" */
  linkTarget?: '_self' | '_blank';
  /** Allow dragging the resource in page mode. @default true */
  draggable?: boolean;
  className?: string;
}

interface LinkInput {
  iri: string;
  repository: string;
  target?: string;
  navigation: 'frame' | 'page';
}

interface Destination extends LinkInput {
  resourceConfig: string;
  resourceVisualisationTemplate: string;
}

interface State {
  loading: boolean;
  error?: string;
  destination?: Destination;
}

const AUTHORITY_DOCUMENT = 'http://www.researchspace.org/resource/system/resource_configurations_container/data/Authority_document';
const AUTHORITY_PAGE = 'http://www.researchspace.org/resource/AuthorityDocumentPage';

/**
 * Resolves a resource view using the active semantic-context repository.
 * Frame mode resolves on click. Page mode resolves on mount so the actual href
 * is available for ordinary clicks, new tabs, and copying the link address.
 * Supply the resource label as children in either mode.
 */
export class ResourceViewLink extends React.Component<ResourceViewLinkConfig, State> {
  static contextTypes = SemanticContextTypes;
  context: SemanticContext;

  state: State = { loading: false };
  private readonly sourceId = uniqueId('resource-view-link-');
  private input: LinkInput | undefined;
  private pendingRequest: LinkInput | undefined;

  componentDidMount() { this.updateInput(); }
  componentDidUpdate() { this.updateInput(); }
  componentWillUnmount() { this.pendingRequest = undefined; }

  render() {
    const { loading, error, destination } = this.state;
    const page = this.props.navigation === 'page';
    let link: React.ReactElement<any>;
    if (page && destination && this.matchesInput(destination)) {
      // Keep the resource as the URL/drag target. Page rendering applies its
      // configured template without creating or navigating through a dashboard.
      link = <ResourceLink resource={Rdf.iri(destination.iri)} repository={destination.repository}
        params={{ resourceView: 'page',
          resourceConfig: destination.resourceConfig,
          resourceVisualisationTemplate: destination.resourceVisualisationTemplate }}
        frameNavigation={false} target={this.props.linkTarget || '_self'}
        draggable={this.props.draggable !== false} className={this.props.className}>
        {this.props.children}
      </ResourceLink>;
    } else if (page) {
      // Do not expose a temporary href that would open the wrong view.
      link = <span aria-busy={loading} className={this.props.className}>{this.props.children}</span>;
    } else {
      link = <button type="button" className={this.props.className}
        onClick={this.openResource} disabled={loading} aria-busy={loading}
        style={{ padding: 0, border: 0, background: 'none', color: 'inherit',
          font: 'inherit', textAlign: 'inherit', maxWidth: '100%',
          cursor: loading ? 'wait' : 'pointer' }}>
        {this.props.children}
      </button>;
    }
    return <span className="rs-resource-view-link">
      {link}
      {error ? <span className="text-danger" role="alert"> {error}
        {page ? <button type="button" onClick={this.openResource}>Retry</button> : null}
      </span> : null}
    </span>;
  }

  private getInput(): LinkInput {
    const repository = this.context.semanticContext && this.context.semanticContext.repository;
    return { iri: this.props.iri, repository: (repository && repository.trim()) || 'default',
      target: this.props.target, navigation: this.props.navigation || 'frame' };
  }

  private matchesInput(input: LinkInput): boolean {
    const current = this.getInput();
    return input.iri === current.iri && input.repository === current.repository &&
      input.target === current.target && input.navigation === current.navigation;
  }

  private updateInput() {
    if (this.input && this.matchesInput(this.input)) { return; }
    const previousInput = this.input;
    this.input = this.getInput();
    this.pendingRequest = undefined;
    if (this.input.navigation === 'page') {
      this.resolveResource();
    } else if (previousInput) {
      this.setState({ loading: false, error: undefined, destination: undefined });
    }
  }

  private isCurrentRequest(request: LinkInput): boolean {
    return this.pendingRequest === request && this.matchesInput(request);
  }

  private openResource = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    this.resolveResource();
  };

  private async resolveResource() {
    if (this.pendingRequest) { return; }
    const request = this.getInput();
    this.pendingRequest = request;
    this.setState({ loading: true, error: undefined, destination: undefined });
    try {
      const resourceConfig = await getResourceConfiguration(Rdf.iri(request.iri), request.repository);
      if (!this.isCurrentRequest(request)) { return; }
      const authority = resourceConfig === AUTHORITY_DOCUMENT;
      const resourceVisualisationTemplate =
        getResourceConfigurationValue(resourceConfig, 'resourceVisualisationTemplateIRI') ||
        (authority ? AUTHORITY_PAGE : 'http://www.researchspace.org/resource/ResourceTemplate');
      if (request.navigation === 'page') {
        this.setState({ destination: { ...request, resourceConfig, resourceVisualisationTemplate } });
      } else if (request.target) {
        trigger({ eventType: AddFrameEvent, source: this.props.id || this.sourceId,
          targets: [request.target], data: {
            viewId: authority ? 'authority-list' : 'resource-detailed-visualisation', resourceIri: request.iri,
            resourceConfig, resourceVisualisationTemplate,
          } });
      } else {
        // The configured dashboard handles this URL as a frame when already
        // mounted, or as an initial view when navigating from another page.
        navigateToResource(ConfigHolder.getDashboard(), {
          view: authority ? 'authority-list' : 'resource-detailed-visualisation',
          resource: request.iri, resourceConfig, resourceVisualisationTemplate,
        }, request.repository).onValue(() => {});
      }
    } catch (error) {
      if (this.isCurrentRequest(request)) {
        this.setState({ error: 'Unable to open this resource. Please try again.' });
      }
    } finally {
      if (this.isCurrentRequest(request)) {
        this.pendingRequest = undefined;
        this.setState({ loading: false });
      }
    }
  }
}

export default ResourceViewLink;
