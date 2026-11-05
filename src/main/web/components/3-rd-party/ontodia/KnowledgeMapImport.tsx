/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import * as React from 'react';
import * as Kefir from 'kefir';
import * as Reactodia from '@reactodia/workspace';
import * as classnames from 'classnames';

import { Component } from 'platform/api/components';
import { trigger } from 'platform/api/events';
import { Rdf, turtle } from 'platform/api/rdf';
import { SparqlClient } from 'platform/api/sparql';

import { Alert, AlertType } from 'platform/components/ui/alert';
import { Dropzone } from 'platform/components/ui/dropzone';
import Icon from 'platform/components/ui/icon/Icon';
import { Spinner } from 'platform/components/ui/spinner';
import { TemplateItem } from 'platform/components/ui/template';

import * as DiagramService from './data/DiagramService';
import {
  ImportReport,
  KnowledgeMapImportBackend,
  ReportLevel,
  describeImportReport,
  importKnowledgeMapTrig,
  knowledgeMapSlug,
} from './data/KnowledgeMapTrig';
import * as KnowledgeMapImportEvents from './KnowledgeMapImportEvents';

/**
 * Metadata of the knowledge maps, same as the one used by the knowledge map editor
 * (see `rsp:KnowledgeMapOntodiaConfig`).
 */
const DEFAULT_METADATA = `
<> a <http://iflastandards.info/ns/lrm/lrmoo/F2_Expression> ;
   <http://www.cidoc-crm.org/cidoc-crm/P2_has_type> <http://www.researchspace.org/resource/system/vocab/resource_type/knowledge_map> .
`;

export interface KnowledgeMapImportConfig {
  /**
   * Identifier used as the source of the triggered events.
   */
  id?: string;
  /**
   * Accepted file extensions.
   *
   * @default [".trig"]
   */
  accept?: string[];
  /**
   * Drop area content template.
   * Parameters:
   *   - isDragAccept - true when drop is accepted
   *   - isDragReject - true when drop is rejected
   */
  dropAreaTemplate?: string;
  /**
   * Metadata (Turtle) added to every imported knowledge map, `<>` refers to the map.
   * Must be the same as the `metadata` of the knowledge map editor.
   */
  metadata?: string;
}

export type KnowledgeMapImportProps = KnowledgeMapImportConfig;

interface State {
  readonly processing?: string;
  readonly reports: ReadonlyArray<ImportReport>;
}

const CLASS_NAME = 'KnowledgeMapImport';

const ALERT_TYPES: { [level in ReportLevel]: AlertType } = {
  success: AlertType.SUCCESS,
  warning: AlertType.WARNING,
  danger: AlertType.DANGER,
};

/**
 * Imports knowledge maps from TriG files.
 *
 * Only knowledge map graphs (e.g. from `rs-knowledge-map-export`) are imported, each
 * map keeps its IRI; maps that already exist are skipped. Other graphs in the file
 * are not imported and are listed in the report. Maps with nodes without position
 * are laid out automatically.
 *
 * @example
 * <rs-knowledge-map-import id='km-import' drop-area-template='{{> template}}'>
 *   <template id='template'>Drop a *.trig file here</template>
 * </rs-knowledge-map-import>
 */
export class KnowledgeMapImport extends Component<KnowledgeMapImportProps, State> {
  static defaultProps: Partial<KnowledgeMapImportProps> = {
    accept: ['.trig'],
  };

  private unmounted = false;
  private createdMaps: string[] = [];

  constructor(props: KnowledgeMapImportProps, context: any) {
    super(props, context);
    this.state = { reports: [] };
  }

  componentWillUnmount() {
    this.unmounted = true;
    // the dialog was closed without "Close" (e.g. with its close button) after an import:
    // still let the page refresh. If an import is running, it is finished in the background.
    if (this.createdMaps.length > 0 || (this.state.reports.length > 0 && !this.state.processing)) {
      this.finish();
    }
  }

  render() {
    const { processing, reports } = this.state;
    return (
      <div className={CLASS_NAME}>
        {processing ? (
          <div className={`${CLASS_NAME}__processing`}>
            <Spinner />
            <span>Importing {processing}…</span>
          </div>
        ) : reports.length > 0 ? (
          this.renderReports()
        ) : (
          <Dropzone onDropAccepted={this.onDropAccepted} accept={this.props.accept}>
            {(options) =>
              this.props.dropAreaTemplate ? (
                <TemplateItem template={{ source: this.props.dropAreaTemplate, options }} />
              ) : (
                <div className={`${CLASS_NAME}__dropzone-content`}>Drop a *.trig file here or click to select one</div>
              )
            }
          </Dropzone>
        )}
      </div>
    );
  }

  private renderReports() {
    const openable: Array<{ iri: string; label: string; existing: boolean }> = [];
    const alerts = this.state.reports.map((report, index) => {
      const view = describeImportReport(report);
      openable.push(...view.openableMaps);
      return (
        <Alert key={index} alert={ALERT_TYPES[view.level]} message="">
          {view.paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </Alert>
      );
    });
    return (
      <div className={`${CLASS_NAME}__report`}>
        {alerts}
        <div className={classnames(`${CLASS_NAME}__actions`, 'btn-inline-container')}>
          {openable.map(({ iri, label, existing }) => (
            <button key={iri} className="btn btn-action btn-textAndIcon" onClick={() => this.openMap(iri)}>
              <Icon iconType="rounded" iconName="hub" symbol={true} />
              <span>{existing ? `Open existing map "${label}"` : `Open knowledge map "${label}"`}</span>
            </button>
          ))}
          <button className="btn btn-default" onClick={this.onImportAnother}>
            Import another file
          </button>
          <button className="btn btn-default" onClick={this.onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  private onDropAccepted = async (files: ReadonlyArray<File>) => {
    const reports: ImportReport[] = [];
    const backend = this.makeBackend();
    for (const file of files) {
      if (!this.unmounted) {
        this.setState({ processing: file.name });
      }
      let report: ImportReport;
      try {
        const text = await readFileAsText(file);
        report = await importKnowledgeMapTrig(text, file.name, backend);
      } catch (error) {
        report = {
          fileName: file.name,
          parseError: error && error.message ? error.message : String(error),
          maps: [],
          ignoredGraphs: [],
        };
      }
      reports.push(report);
    }

    const created = reports
      .map((report) => report.maps.filter((map) => map.status === 'created' && map.iri).map((map) => map.iri))
      .reduce((acc, iris) => acc.concat(iris), [] as string[]);
    this.createdMaps.push(...created);
    if (created.length > 0) {
      trigger({
        eventType: KnowledgeMapImportEvents.KnowledgeMapImportSuccess,
        source: this.props.id,
        data: { resourceIris: created },
      });
    }
    if (this.unmounted) {
      // closed while importing: nobody will click "Close", so finish right away
      this.finish();
    } else {
      this.setState({ processing: undefined, reports });
    }
  };

  private onImportAnother = () => {
    this.setState({ reports: [] });
  };

  private onClose = () => {
    this.finish();
  };

  private openMap(iri: string) {
    trigger({
      eventType: 'Dashboard.AddFrame',
      source: this.props.id,
      targets: ['thinking-frames'],
      data: { viewId: 'knowledge-map', resourceIri: iri },
    });
    this.finish();
  }

  private finish() {
    trigger({
      eventType: KnowledgeMapImportEvents.KnowledgeMapImportDone,
      source: this.props.id,
      data: { resourceIris: this.createdMaps.slice() },
    });
    this.createdMaps = [];
    if (!this.unmounted) {
      this.setState({ reports: [] });
    }
  }

  private makeBackend(): KnowledgeMapImportBackend {
    const metadata = parseMetadata(this.props.metadata || DEFAULT_METADATA);
    return {
      knowledgeMapExists: (iri, graph) => {
        const patterns = [
          iri ? `{ ?container <http://www.w3.org/ns/ldp#contains> <${iri}> }` : undefined,
          graph ? `{ GRAPH <${graph}> { ?s ?p ?o } }` : undefined,
        ].filter((pattern) => pattern);
        if (patterns.length === 0) {
          return Promise.resolve(false);
        }
        return SparqlClient.ask(`ASK { ${patterns.join(' UNION ')} }`, {
          context: { repository: 'assets' },
        }).toPromise();
      },
      saveKnowledgeMap: async (label: string, diagram: Reactodia.SerializedDiagram, iri?: string) => {
        const triples = await metadata;
        // keep the IRI of imported maps; otherwise use a slug that is safe in an
        // HTTP header and an IRI (the server makes it unique)
        const slug = iri || knowledgeMapSlug(label) || 'knowledge_map';
        const saved = await DiagramService.saveDiagram(label, diagram, triples, slug).toPromise();
        return saved.value;
      },
    };
  }
}

function parseMetadata(metadata: string): Promise<ReadonlyArray<Rdf.Triple>> {
  return turtle.deserialize
    .turtleToTriples(metadata)
    .flatMapErrors((error) => Kefir.constantError<any>(new Error(`Invalid knowledge map metadata: ${error}`)))
    .toPromise();
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export default KnowledgeMapImport;
