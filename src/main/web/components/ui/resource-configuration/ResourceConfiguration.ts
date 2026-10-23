/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */
import { createElement, ReactElement } from 'react';
import * as Kefir from 'kefir';

import { Rdf } from 'platform/api/rdf';
import { Component } from 'platform/api/components';
import { ErrorNotification } from 'platform/components/ui/notification';
import { TemplateItem } from 'platform/components/ui/template';
import {
  ResourceConfig, getResourceConfigurationBatched, getResourceConfigurationValue,
} from 'platform/api/services/resource-config';

export interface ResourceConfigurationProps {
  /** IRI of the resource whose configuration is resolved. */
  iri: string;
  /**
   * Template rendered once the configuration is known. Receives `iri`,
   * `resourceConfig` (the configuration IRI, undefined when the resource has
   * no known configuration) and, from the configuration: `resourceLabel`,
   * `resourceIcon`, `resourceOntologyClass`, `p2HasType`, `resourceDescription`,
   * `resourceFormIRI`, `resourceVisualisationTemplateIRI` (also as
   * `resourceVisualisationTemplate`) and `resourceDefaultSearchViewType`.
   */
  template: string;
  /** Rendered while the configuration is being resolved. Default: nothing. */
  loadingTemplate?: string;
}

interface State {
  resourceConfig?: string;
  loading: boolean;
  error?: any;
}

const CONFIG_KEYS: Array<keyof ResourceConfig> = [
  'resourceLabel', 'resourceIcon', 'resourceOntologyClass', 'p2HasType', 'resourceDescription',
  'resourceFormIRI', 'resourceVisualisationTemplateIRI', 'resourceDefaultSearchViewType',
];

/**
 * Resolves the resource configuration applying to a resource through the
 * batched configuration service (one request per tick for all instances on
 * the page, server-side cached) and renders a template with the
 * configuration's values. Replaces per-item SPARQL queries in cards.
 *
 * @example
 * <rs-resource-configuration iri='{{iri}}' template='{{> card}}'>
 *   <template id='card'>
 *     {{#if resourceConfig}}<rs-icon icon-name='{{resourceIcon}}'></rs-icon> {{resourceLabel}}{{else}}Unknown{{/if}}
 *   </template>
 * </rs-resource-configuration>
 */
export class ResourceConfiguration extends Component<ResourceConfigurationProps, State> {
  private subscription: Kefir.Subscription | undefined;

  constructor(props: ResourceConfigurationProps, context: any) {
    super(props, context);
    this.state = { loading: true };
  }

  componentDidMount() {
    this.resolve(this.props.iri);
  }

  componentWillReceiveProps(nextProps: ResourceConfigurationProps) {
    if (nextProps.iri !== this.props.iri) {
      this.resolve(nextProps.iri);
    }
  }

  componentWillUnmount() {
    if (this.subscription) { this.subscription.unsubscribe(); }
  }

  private resolve(iri: string) {
    if (this.subscription) { this.subscription.unsubscribe(); }
    this.setState({ loading: true, error: undefined });
    const context = this.context.semanticContext;
    this.subscription = getResourceConfigurationBatched(Rdf.iri(iri), { context }).observe({
      value: (resourceConfig) => this.setState({ resourceConfig, loading: false }),
      error: (error) => this.setState({ error, loading: false }),
    });
  }

  render(): ReactElement<any> {
    const { iri, template, loadingTemplate } = this.props;
    const { resourceConfig, loading, error } = this.state;
    if (error) {
      return createElement(ErrorNotification, { errorMessage: error });
    }
    if (loading) {
      return loadingTemplate ? createElement(TemplateItem, { template: { source: loadingTemplate, options: { iri } } }) : null;
    }
    // a configuration IRI the client has not loaded (e.g. the server's
    // fallback) is treated as "no configuration" so templates fall back
    const known = resourceConfig && getResourceConfigurationValue(resourceConfig, 'resourceLabel') !== undefined;
    const options: { [key: string]: string | undefined } = { iri, resourceConfig: known ? resourceConfig : undefined };
    if (known) {
      for (const key of CONFIG_KEYS) {
        options[key] = getResourceConfigurationValue(resourceConfig, key);
      }
      options.resourceVisualisationTemplate = options.resourceVisualisationTemplateIRI;
    }
    return createElement(TemplateItem, { template: { source: template, options } });
  }
}

export default ResourceConfiguration;
