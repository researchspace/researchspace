/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import * as fileSaver from 'file-saver';

import { Component } from 'platform/api/components';
import { Rdf } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';
import { addNotification } from 'platform/components/ui/notification';
import { Spinner } from 'platform/components/ui/spinner';

import * as DiagramService from './data/DiagramService';
import {
  KnowledgeMapExportBackend,
  N3Bindings,
  exportFileName,
  exportKnowledgeMapTrig,
  rdfNodeToN3,
} from './data/KnowledgeMapTrig';

export interface KnowledgeMapExportConfig {
  /**
   * IRI of the knowledge map to export.
   */
  iri: string;
  /**
   * Also export the named graphs that describe the map and its resources
   * (authority documents, system configuration, ontologies and other knowledge
   * maps are not included). By default only the graph of the map itself is exported.
   *
   * @default false
   */
  includeData?: boolean;
}

export type KnowledgeMapExportProps = KnowledgeMapExportConfig;

interface State {
  readonly exporting?: boolean;
}

/**
 * Downloads a knowledge map as a TriG file with the graph of the map (its layout),
 * optionally together with the data of the map and its resources, see `include-data`.
 * The map can be imported again with `rs-knowledge-map-import`.
 *
 * @example
 * <rs-knowledge-map-export iri='http://example.com/map'>
 *   <span>Download file</span>
 * </rs-knowledge-map-export>
 *
 * <rs-knowledge-map-export iri='http://example.com/map' include-data=true>
 *   <span>Download file with data</span>
 * </rs-knowledge-map-export>
 */
export class KnowledgeMapExportComponent extends Component<KnowledgeMapExportProps, State> {
  private unmounted = false;

  constructor(props: KnowledgeMapExportProps, context: any) {
    super(props, context);
    this.state = {};
  }

  componentWillUnmount() {
    this.unmounted = true;
  }

  private makeBackend(): KnowledgeMapExportBackend {
    const { repository } = this.context.semanticContext;
    const select = (query: string, repositoryId: string | undefined) =>
      SparqlClient.select(query, { context: { repository: repositoryId } })
        .toPromise()
        .then((result) =>
          result.results.bindings.map((binding) => {
            const row: { [variable: string]: string } = {};
            Object.keys(binding).forEach((variable) => {
              row[variable] = rdfNodeToN3(binding[variable] as Rdf.Node);
            });
            return row as N3Bindings;
          })
        );
    return {
      getDiagram: (iri) => DiagramService.getDiagramByIri(iri, { repository: 'assets' }),
      selectMaps: (query) => select(query, 'assets'),
      selectData: (query) => select(query, repository),
    };
  }

  private onClick = async () => {
    if (this.state.exporting) {
      return;
    }
    this.setState({ exporting: true });
    try {
      const result = await exportKnowledgeMapTrig(this.props.iri, this.makeBackend(), {
        includeData: this.props.includeData === true || (this.props.includeData as unknown) === 'true',
      });
      const blob = new Blob([result.trig], { type: 'application/trig;charset=utf-8' });
      fileSaver.saveAs(blob, exportFileName(result.label));
    } catch (error) {
      addNotification({ level: 'error', message: 'Failed to download the knowledge map' }, error);
    } finally {
      if (!this.unmounted) {
        this.setState({ exporting: false });
      }
    }
  };

  render() {
    return (
      <span className="KnowledgeMapExport" onClick={this.onClick} aria-busy={this.state.exporting}>
        {this.state.exporting ? <Spinner spinnerDelay={0} /> : null}
        {this.props.children}
      </span>
    );
  }
}

export default KnowledgeMapExportComponent;
