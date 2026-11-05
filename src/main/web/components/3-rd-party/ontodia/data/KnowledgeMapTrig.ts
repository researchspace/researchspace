/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Import and export of knowledge maps as TriG files.
 *
 * Import only handles knowledge map graphs (`ontodia:Diagram` resources and their
 * layout); any other named graph in the file is ignored and reported, data is
 * imported with the RDF upload on the "Data import and download" page instead.
 *
 * Export writes the graph of the knowledge map and, optionally, the named graphs
 * that describe the map and its resources.
 *
 * Everything in this module is independent from the backend, which is passed in
 * as {@link KnowledgeMapImportBackend} / {@link KnowledgeMapExportBackend}, so the
 * workflows can be unit tested.
 */

import * as N3 from 'n3';
import * as Reactodia from '@reactodia/workspace';
import { blockingDefaultLayout } from '@reactodia/workspace/layout-sync';

import { Rdf, turtle } from 'platform/api/rdf';

import { parseDiagramFromTurtle } from './DiagramService';

/** Estimated size of a knowledge map node, used to lay out maps without rendering them. */
export const ESTIMATED_NODE_SIZE = { width: 260, height: 80 };

export const KNOWLEDGE_MAP_DIAGRAM_TYPES: ReadonlyArray<string> = [
  'http://ontodia.org/schema/v1#Diagram',
  // legacy Ontodia diagrams
  'http://www.ontodia.org/schema/v1#diagram',
];

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';
const CRM_SYMBOLIC_CONTENT = 'http://www.cidoc-crm.org/cidoc-crm/P190_has_symbolic_content';
const LDP_CONTAINS = 'http://www.w3.org/ns/ldp#contains';
const CRM_HAS_TYPE = 'http://www.cidoc-crm.org/cidoc-crm/P2_has_type';
const CRM_IS_IDENTIFIED_BY = 'http://www.cidoc-crm.org/cidoc-crm/P1_is_identified_by';
const SKOS_PREF_LABEL = 'http://www.w3.org/2004/02/skos/core#prefLabel';

/**
 * Label properties of the resources on a knowledge map, the same as the `dataLabelProperty`
 * of the knowledge map editor (rsp:KnowledgeMapOntodiaConfig): directly on the resource,
 * or on its appellations (crm:P1_is_identified_by).
 */
const DIRECT_LABEL_PROPERTIES = [RDFS_LABEL, CRM_SYMBOLIC_CONTENT, SKOS_PREF_LABEL];
const APPELLATION_LABEL_PROPERTIES = [CRM_SYMBOLIC_CONTENT, RDFS_LABEL];

const N3Util = N3.Util;

/** Quad in the N3.js string representation; `graph` is '' for the default graph. */
export interface Quad {
  readonly subject: string;
  readonly predicate: string;
  readonly object: string;
  readonly graph: string;
}

/** Parses TriG (or Turtle) into quads. */
export function parseTrig(text: string): Promise<Quad[]> {
  return new Promise((resolve, reject) => {
    const quads: Quad[] = [];
    let done = false;
    N3.Parser().parse(text, (error, triple) => {
      if (done) {
        return;
      }
      if (error) {
        done = true;
        reject(error);
      } else if (triple) {
        quads.push({
          subject: triple.subject,
          predicate: triple.predicate,
          object: triple.object,
          graph: triple.graph || '',
        });
      } else {
        done = true;
        resolve(quads);
      }
    });
  });
}

/** Serializes quads as TriG, grouping quads of the same graph together. */
export function serializeTrig(quads: ReadonlyArray<Quad>): Promise<string> {
  const writer = N3.Writer({ format: 'application/trig' });
  groupByGraph(quads).forEach((graphQuads) => graphQuads.forEach((quad) => writer.addTriple(quad)));
  return new Promise((resolve, reject) => writer.end((error, result) => (error ? reject(error) : resolve(result))));
}

/** Serializes quads as Turtle, i.e. drops graph names. */
export function serializeTurtle(quads: ReadonlyArray<Quad>): Promise<string> {
  const writer = N3.Writer({ format: 'turtle' });
  quads.forEach(({ subject, predicate, object }) => writer.addTriple({ subject, predicate, object }));
  return new Promise((resolve, reject) => writer.end((error, result) => (error ? reject(error) : resolve(result))));
}

/** Converts a platform RDF term (e.g. a SPARQL result binding) into the N3.js representation. */
export function rdfNodeToN3(node: Rdf.Node): string {
  return turtle.serialize.nodeToN3(node);
}

function groupByGraph(quads: ReadonlyArray<Quad>): Map<string, Quad[]> {
  const result = new Map<string, Quad[]>();
  for (const quad of quads) {
    let graphQuads = result.get(quad.graph);
    if (!graphQuads) {
      graphQuads = [];
      result.set(quad.graph, graphQuads);
    }
    graphQuads.push(quad);
  }
  return result;
}

export interface ImportedDiagram {
  /** IRI of the diagram resource (absent if it is a blank node). */
  readonly iri: string | undefined;
  /** Graph with the diagram data, '' for the default graph. */
  readonly graph: string;
  readonly quads: ReadonlyArray<Quad>;
}

export interface ImportPlan {
  /** Knowledge map diagrams found in the file. */
  readonly diagrams: ReadonlyArray<ImportedDiagram>;
  /** Other graphs of the file, which are not imported ('' is the default graph). */
  readonly otherGraphs: ReadonlyArray<string>;
}

/**
 * Splits the file content into knowledge map diagrams and other graphs.
 *
 * The container hints added by the LDP export (`_:container ldp:contains <diagram>`)
 * are dropped, the diagram is stored through the knowledge map container instead.
 */
export function planImport(quads: ReadonlyArray<Quad>): ImportPlan {
  const diagramSubjects = new Map<string, string>();
  for (const quad of quads) {
    if (quad.predicate === RDF_TYPE && KNOWLEDGE_MAP_DIAGRAM_TYPES.indexOf(quad.object) >= 0) {
      if (!diagramSubjects.has(quad.subject)) {
        diagramSubjects.set(quad.subject, quad.graph);
      }
    }
  }

  const hintSubjects = new Set<string>();
  for (const quad of quads) {
    if (quad.predicate === LDP_CONTAINS && diagramSubjects.has(quad.object) && N3Util.isBlank(quad.subject)) {
      hintSubjects.add(quad.subject);
    }
  }
  const filtered = quads.filter(
    (quad) => !hintSubjects.has(quad.subject) && !(quad.predicate === LDP_CONTAINS && diagramSubjects.has(quad.object))
  );

  const byGraph = groupByGraph(filtered);
  const diagramGraphs = new Set(Array.from(diagramSubjects.values()));
  const diagrams: ImportedDiagram[] = [];
  diagramSubjects.forEach((graph, subject) => {
    diagrams.push({
      iri: N3Util.isIRI(subject) ? subject : undefined,
      graph,
      quads: byGraph.get(graph) || [],
    });
  });
  const otherGraphs = Array.from(byGraph.keys()).filter((graph) => !diagramGraphs.has(graph));
  return { diagrams, otherGraphs };
}

interface Size {
  readonly width: number;
  readonly height: number;
}

/**
 * Computes positions with the default knowledge map layout (force-directed with
 * overlap removal) for nodes of the given (or estimated) size.
 */
export async function computeLayout(
  nodeIds: ReadonlyArray<string>,
  links: ReadonlyArray<{ source: string; target: string }>,
  sizes: ReadonlyMap<string, Size> = new Map()
): Promise<Map<string, { x: number; y: number }>> {
  const positions = new Map<string, { x: number; y: number }>();
  if (nodeIds.length === 0) {
    return positions;
  }
  const rows = Math.ceil(Math.sqrt(nodeIds.length));
  const grid = Reactodia.uniformGrid({
    rows,
    cellSize: { x: ESTIMATED_NODE_SIZE.width * 1.5, y: ESTIMATED_NODE_SIZE.height * 3 },
  });
  const nodes: { [id: string]: Reactodia.LayoutNode } = {};
  const bounds: { [id: string]: Reactodia.Rect } = {};
  nodeIds.forEach((id, index) => {
    const { width, height } = sizes.get(id) || ESTIMATED_NODE_SIZE;
    const { x, y } = grid(index);
    nodes[id] = { types: [] };
    bounds[id] = { x, y, width, height };
  });
  const layoutLinks: Reactodia.LayoutLink[] = links
    .filter((link) => link.source in nodes && link.target in nodes && link.source !== link.target)
    .map((link) => ({ type: '' as Reactodia.LinkTypeIri, source: link.source, target: link.target }));

  const result = await blockingDefaultLayout({ nodes, links: layoutLinks }, { bounds });

  let minX = Infinity;
  let minY = Infinity;
  for (const id of nodeIds) {
    minX = Math.min(minX, result.bounds[id].x);
    minY = Math.min(minY, result.bounds[id].y);
  }
  for (const id of nodeIds) {
    const { x, y } = result.bounds[id];
    positions.set(id, { x: Math.round(x - minX), y: Math.round(y - minY) });
  }
  return positions;
}

/**
 * Keeps only the layout part of a parsed diagram, dropping metadata of the
 * original resource (provenance, label, types) which is re-created on save.
 */
export function cleanImportedDiagram(diagram: Reactodia.SerializedDiagram): Reactodia.SerializedDiagram {
  return {
    '@context': diagram['@context'],
    '@type': 'Diagram',
    layoutData: diagram.layoutData,
    linkTypeOptions: diagram.linkTypeOptions || [],
  };
}

function hasPosition(element: Reactodia.SerializedElement): boolean {
  const position = (element as { position?: { x?: unknown; y?: unknown } }).position;
  return Boolean(
    position &&
      typeof position.x === 'number' &&
      typeof position.y === 'number' &&
      isFinite(position.x) &&
      isFinite(position.y)
  );
}

/**
 * Applies the default layout to the whole diagram if any of its elements
 * has no position.
 */
export async function ensureDiagramPositions(
  diagram: Reactodia.SerializedDiagram
): Promise<{ diagram: Reactodia.SerializedDiagram; laidOut: boolean }> {
  const elements = diagram.layoutData?.elements || [];
  if (elements.every(hasPosition)) {
    return { diagram, laidOut: false };
  }
  const ids = elements.map((element) => element['@id']);
  const sizes = new Map<string, Size>();
  for (const element of elements) {
    const size = element.elementState?.[Reactodia.TemplateProperties.ElementSize] as Size | undefined;
    if (size && typeof size.width === 'number' && typeof size.height === 'number') {
      sizes.set(element['@id'], size);
    }
  }
  const links = (diagram.layoutData.links || [])
    .map((link) => ({ source: link.source?.['@id'], target: link.target?.['@id'] }))
    .filter((link) => link.source && link.target);
  const positions = await computeLayout(ids, links, sizes);
  const laidOutElements = elements.map((element) => ({ ...element, position: positions.get(element['@id']) }));
  return {
    diagram: { ...diagram, layoutData: { ...diagram.layoutData, elements: laidOutElements } },
    laidOut: true,
  };
}

/** Returns IRIs of all resources placed on a diagram (including grouped elements). */
export function getDiagramResourceIris(diagram: Reactodia.SerializedDiagram): string[] {
  const iris = new Set<string>();
  const visit = (element: any) => {
    if (element && typeof element.iri === 'string') {
      iris.add(element.iri);
    }
    if (element && Array.isArray(element.items)) {
      element.items.forEach(visit);
    }
  };
  (diagram.layoutData?.elements || []).forEach(visit);
  return Array.from(iris);
}

function findLabel(quads: ReadonlyArray<Quad>, subject: string | undefined): string | undefined {
  if (!subject) {
    return undefined;
  }
  for (const predicate of [CRM_SYMBOLIC_CONTENT, RDFS_LABEL]) {
    const quad = quads.find((q) => q.subject === subject && q.predicate === predicate && N3Util.isLiteral(q.object));
    if (quad) {
      return N3Util.getLiteralValue(quad.object);
    }
  }
  return undefined;
}

/**
 * Returns a slug for the IRI of a new knowledge map that is safe to send as HTTP
 * header and to use in an IRI, or `undefined` if nothing is left of the label.
 */
export function knowledgeMapSlug(label: string): string | undefined {
  const slug = (label || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || undefined;
}

export function fileBaseName(fileName: string): string {
  const base = fileName.replace(/\.[^./\\]+$/, '');
  return base || fileName;
}

/** Backend operations needed by the import, see {@link importKnowledgeMapTrig}. */
export interface KnowledgeMapImportBackend {
  /**
   * Returns `true` if the knowledge map is already stored: its IRI is in a container
   * or the named graph of the map already exists.
   */
  knowledgeMapExists(iri: string | undefined, graph: string | undefined): Promise<boolean>;
  /** Stores a new knowledge map and returns its IRI; `iri` is the IRI to keep, if any. */
  saveKnowledgeMap(label: string, diagram: Reactodia.SerializedDiagram, iri?: string): Promise<string>;
}

export type MapImportStatus = 'created' | 'exists' | 'failed';

export interface MapImportReport {
  readonly label: string;
  readonly iri?: string;
  readonly status: MapImportStatus;
  /** `true` if some nodes had no position and the layout was computed. */
  readonly laidOut?: boolean;
  readonly error?: string;
}

export interface ImportReport {
  readonly fileName: string;
  readonly parseError?: string;
  readonly maps: ReadonlyArray<MapImportReport>;
  /** Graphs of the file that are not knowledge maps and were not imported ('' is the default graph). */
  readonly ignoredGraphs: ReadonlyArray<string>;
}

function errorMessage(error: any): string {
  if (!error) {
    return 'Unknown error';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error.response && typeof error.response.text === 'string' && error.response.text) {
    return error.response.text;
  }
  return error.message || String(error);
}

/**
 * Imports the knowledge maps of a TriG file, see module description.
 */
export async function importKnowledgeMapTrig(
  text: string,
  fileName: string,
  backend: KnowledgeMapImportBackend
): Promise<ImportReport> {
  let quads: Quad[];
  try {
    quads = await parseTrig(text);
  } catch (error) {
    return { fileName, parseError: errorMessage(error), maps: [], ignoredGraphs: [] };
  }
  const plan = planImport(quads);
  const maps: MapImportReport[] = [];
  for (const diagram of plan.diagrams) {
    maps.push(await importDiagram(diagram, fileName, backend));
  }
  return { fileName, maps, ignoredGraphs: plan.otherGraphs };
}

async function importDiagram(
  imported: ImportedDiagram,
  fileName: string,
  backend: KnowledgeMapImportBackend
): Promise<MapImportReport> {
  let label = findLabel(imported.quads, imported.iri) || fileBaseName(fileName);
  try {
    if (await backend.knowledgeMapExists(imported.iri, imported.graph || undefined)) {
      return { label, iri: imported.iri, status: 'exists' };
    }
    const parsed = await parseDiagramFromTurtle(await serializeTurtle(imported.quads)).toPromise();
    label = parsed.label || label;
    const { diagram, laidOut } = await ensureDiagramPositions(cleanImportedDiagram(parsed.diagram));
    const iri = await backend.saveKnowledgeMap(label, diagram, imported.iri);
    return { label, iri, status: 'created', laidOut };
  } catch (error) {
    return { label, iri: imported.iri, status: 'failed', error: errorMessage(error) };
  }
}

export type ReportLevel = 'success' | 'warning' | 'danger';

export interface ReportView {
  readonly level: ReportLevel;
  readonly paragraphs: ReadonlyArray<string>;
  /** Maps that can be opened from the report. */
  readonly openableMaps: ReadonlyArray<{ iri: string; label: string; existing: boolean }>;
}

/** Turns an import report into the messages shown to the user. */
export function describeImportReport(report: ImportReport): ReportView {
  const { fileName } = report;
  if (report.parseError) {
    return {
      level: 'danger',
      paragraphs: [`${fileName} could not be read: ${report.parseError}. Nothing was imported.`],
      openableMaps: [],
    };
  }

  const paragraphs: string[] = [];
  let level: ReportLevel = 'success';
  const raise = (to: ReportLevel) => {
    if (to === 'danger' || (to === 'warning' && level === 'success')) {
      level = to;
    }
  };
  const openableMaps: Array<{ iri: string; label: string; existing: boolean }> = [];

  if (report.maps.length === 0) {
    paragraphs.push(`No knowledge map found in ${fileName}, nothing was imported.`);
    raise('warning');
  }
  for (const map of report.maps) {
    switch (map.status) {
      case 'created':
        paragraphs.push(`Imported knowledge map "${map.label}".`);
        if (map.laidOut) {
          paragraphs.push('Some of its nodes had no position, so an automatic layout was applied.');
        }
        if (map.iri) {
          openableMaps.push({ iri: map.iri, label: map.label, existing: false });
        }
        break;
      case 'exists':
        paragraphs.push(`The knowledge map "${map.label}" already exists, so it was not imported.`);
        if (map.iri) {
          openableMaps.push({ iri: map.iri, label: map.label, existing: true });
        }
        raise('warning');
        break;
      case 'failed':
        paragraphs.push(`Failed to import knowledge map "${map.label}": ${map.error}`);
        raise('danger');
        break;
    }
  }

  if (report.maps.length > 0 && report.ignoredGraphs.length > 0) {
    paragraphs.push('Other data in the file was not imported.');
  }

  return { level, paragraphs, openableMaps };
}

/**
 * SPARQL query returning the named graphs to include in an export with data:
 * graphs that describe the map or its resources, excluding authority documents,
 * system configuration, ontologies and other knowledge maps (they have their own export).
 */
export function makeExportGraphsQuery(mapIri: string, resourceIris: ReadonlyArray<string>, mapGraph: string): string {
  const values = [mapIri, ...resourceIris].map((iri) => `<${iri}>`).join(' ');
  return `
PREFIX crm: <http://www.cidoc-crm.org/cidoc-crm/>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
SELECT DISTINCT ?g WHERE {
  VALUES ?subject { ${values} }
  GRAPH ?g { ?subject ?p ?o }
  FILTER(?g != <${mapGraph}>)
  FILTER(!STRSTARTS(STR(?g), "http://www.researchspace.org/resource/system/"))
  FILTER NOT EXISTS { ?g a crm:E32_Authority_Document }
  FILTER NOT EXISTS { GRAPH ?g { ?ontology a owl:Ontology } }
  FILTER NOT EXISTS { GRAPH ?g { ?diagram a <${KNOWLEDGE_MAP_DIAGRAM_TYPES[0]}> } }
  FILTER NOT EXISTS { GRAPH ?g { ?legacyDiagram a <${KNOWLEDGE_MAP_DIAGRAM_TYPES[1]}> } }
}`;
}

/** SPARQL query returning all quads of the given graphs. */
export function makeGraphsContentQuery(graphs: ReadonlyArray<string>): string {
  return `SELECT ?g ?s ?p ?o WHERE {
  VALUES ?g { ${graphs.map((g) => `<${g}>`).join(' ')} }
  GRAPH ?g { ?s ?p ?o }
}`;
}

/** SPARQL query returning the named graph(s) that store the diagram resource. */
export function makeDiagramGraphQuery(mapIri: string): string {
  const types = KNOWLEDGE_MAP_DIAGRAM_TYPES.map((type) => `<${type}>`).join(' ');
  return `SELECT DISTINCT ?g WHERE {
  VALUES ?type { ${types} }
  GRAPH ?g { <${mapIri}> a ?type }
}`;
}

/** SPARQL result row with values in the N3.js string representation. */
export type N3Bindings = { readonly [variable: string]: string };

/** Backend operations needed by the export, see {@link exportKnowledgeMapTrig}. */
export interface KnowledgeMapExportBackend {
  getDiagram(iri: string): Promise<{ label: string; diagram: Reactodia.SerializedDiagram }>;
  /** Runs a SELECT query against the repository with knowledge maps. */
  selectMaps(query: string): Promise<ReadonlyArray<N3Bindings>>;
  /** Runs a SELECT query against the repository with the data. */
  selectData(query: string): Promise<ReadonlyArray<N3Bindings>>;
}

export interface KnowledgeMapExport {
  readonly label: string;
  /** Exported named graphs, the knowledge map graph first. */
  readonly graphs: ReadonlyArray<string>;
  readonly trig: string;
}

/**
 * Exports a knowledge map as TriG: the graph of the map itself and, with `includeData`,
 * the named graphs that describe the map and its resources (see {@link makeExportGraphsQuery}).
 * The knowledge map can be imported again with {@link importKnowledgeMapTrig}.
 */
export async function exportKnowledgeMapTrig(
  mapIri: string,
  backend: KnowledgeMapExportBackend,
  options: { includeData?: boolean } = {}
): Promise<KnowledgeMapExport> {
  const { label, diagram } = await backend.getDiagram(mapIri);
  const mapGraphs = (await backend.selectMaps(makeDiagramGraphQuery(mapIri))).map((row) => row['g']);
  if (mapGraphs.length === 0) {
    throw new Error(`Knowledge map ${mapIri} not found`);
  }
  const mapGraph = mapGraphs[0];

  const dataGraphs = new Set<string>();
  if (options.includeData) {
    const resourceIris = getDiagramResourceIris(diagram);
    for (const batch of resourceIris.length > 0 ? chunk(resourceIris, 100) : [[]]) {
      const rows = await backend.selectData(makeExportGraphsQuery(mapIri, batch, mapGraph));
      rows.forEach((row) => dataGraphs.add(row['g']));
    }
    dataGraphs.delete(mapGraph);
  }

  const toQuad = (row: N3Bindings): Quad => ({
    graph: row['g'],
    subject: row['s'],
    predicate: row['p'],
    object: row['o'],
  });
  const quads: Quad[] = (await backend.selectMaps(makeGraphsContentQuery([mapGraph]))).map(toQuad);
  const orderedDataGraphs = Array.from(dataGraphs).sort();
  for (const batch of chunk(orderedDataGraphs, 50)) {
    (await backend.selectData(makeGraphsContentQuery(batch))).forEach((row) => quads.push(toQuad(row)));
  }

  return {
    label,
    graphs: [mapGraph, ...orderedDataGraphs],
    trig: await serializeTrig(quads),
  };
}

/** A statement shown as a link on a knowledge map. */
export interface DiagramStatement {
  readonly subject: string;
  readonly predicate: string;
  readonly object: string;
}

/**
 * Returns the statements shown as links on a diagram: the property of each link between
 * the resources of its source and target elements (for grouped links, of each item).
 */
export function getDiagramStatements(diagram: Reactodia.SerializedDiagram): DiagramStatement[] {
  const iriById = new Map<string, string>();
  for (const element of (diagram.layoutData?.elements || []) as any[]) {
    if (element && typeof element.iri === 'string') {
      iriById.set(element['@id'], element.iri);
    }
  }
  const statements = new Map<string, DiagramStatement>();
  const add = (subject: string | undefined, predicate: string | undefined, object: string | undefined) => {
    if (subject && predicate && object) {
      statements.set(`${subject} ${predicate} ${object}`, { subject, predicate, object });
    }
  };
  for (const link of (diagram.layoutData?.links || []) as any[]) {
    if (!link || typeof link.property !== 'string') {
      continue;
    }
    if (Array.isArray(link.items)) {
      for (const item of link.items) {
        add(item.sourceIri, link.property, item.targetIri);
      }
    } else {
      add(iriById.get(link.source?.['@id']), link.property, iriById.get(link.target?.['@id']));
    }
  }
  return Array.from(statements.values());
}

/** Named graph with the data of a knowledge map in a data download. */
export function knowledgeMapDataGraph(mapIri: string): string {
  return `${mapIri}/data`;
}

/** SPARQL query returning which of the given statements are in the database. */
export function makeExistingStatementsQuery(statements: ReadonlyArray<DiagramStatement>): string {
  const values = statements.map((st) => `(<${st.subject}> <${st.predicate}> <${st.object}>)`).join('\n    ');
  return `SELECT DISTINCT ?s ?p ?o WHERE {
  VALUES (?s ?p ?o) {
    ${values}
  }
  ?s ?p ?o .
}`;
}

const iriList = (iris: ReadonlyArray<string>) => iris.map((iri) => `<${iri}>`).join(' ');

/**
 * SPARQL query returning the rdf:type and crm:P2_has_type values and the labels
 * (see {@link DIRECT_LABEL_PROPERTIES}) of the given resources.
 */
export function makeResourceTypesQuery(resourceIris: ReadonlyArray<string>): string {
  return `SELECT DISTINCT ?s ?p ?o WHERE {
  VALUES ?s { ${iriList(resourceIris)} }
  {
    VALUES ?p { <${RDF_TYPE}> <${CRM_HAS_TYPE}> }
    ?s ?p ?o .
  } UNION {
    VALUES ?p { ${iriList(DIRECT_LABEL_PROPERTIES)} }
    ?s ?p ?o .
    FILTER(isLiteral(?o))
  }
}`;
}

/**
 * SPARQL query returning the appellations of the given resources with their labels and
 * types (e.g. the primary appellation): the statements linking resource and appellation,
 * and the label, rdf:type and crm:P2_has_type values of each appellation.
 */
export function makeResourceAppellationsQuery(resourceIris: ReadonlyArray<string>): string {
  // the variables of each UNION branch are bound inside the branch: a BIND of a variable
  // from outside the branch would be evaluated before that variable is bound
  const hasLabel = (variable: string) =>
    `FILTER EXISTS { VALUES ?labelProperty { ${iriList(
      APPELLATION_LABEL_PROPERTIES
    )} } ${variable} ?labelProperty ?anyLabel }`;
  return `SELECT DISTINCT ?s ?p ?o WHERE {
  {
    VALUES ?s { ${iriList(resourceIris)} }
    VALUES ?p { <${CRM_IS_IDENTIFIED_BY}> }
    ?s ?p ?o .
    ${hasLabel('?o')}
  } UNION {
    VALUES ?resource { ${iriList(resourceIris)} }
    ?resource <${CRM_IS_IDENTIFIED_BY}> ?s .
    VALUES ?p { ${iriList(APPELLATION_LABEL_PROPERTIES)} <${RDF_TYPE}> <${CRM_HAS_TYPE}> }
    ?s ?p ?o .
    ${hasLabel('?s')}
  }
}`;
}

/**
 * Exports the data shown on a knowledge map, without its layout:
 *   - the statements shown as links (if they are in the database)
 *   - the rdf:type and crm:P2_has_type values of every resource on the map, including the
 *     types not shown on the map
 *   - the labels of every resource, directly on it or through its appellations (with the
 *     labels and types of the appellations)
 * Everything is written into one named graph, {@link knowledgeMapDataGraph}.
 */
export async function exportKnowledgeMapDataTrig(
  mapIri: string,
  backend: KnowledgeMapExportBackend
): Promise<KnowledgeMapExport> {
  const { label, diagram } = await backend.getDiagram(mapIri);
  const graph = knowledgeMapDataGraph(mapIri);
  const quads = new Map<string, Quad>();
  const add = (row: N3Bindings) => {
    const quad: Quad = { subject: row['s'], predicate: row['p'], object: row['o'], graph };
    quads.set(`${quad.subject} ${quad.predicate} ${quad.object}`, quad);
  };
  for (const batch of chunk(getDiagramStatements(diagram), 100)) {
    (await backend.selectData(makeExistingStatementsQuery(batch))).forEach(add);
  }
  for (const batch of chunk(getDiagramResourceIris(diagram), 100)) {
    (await backend.selectData(makeResourceTypesQuery(batch))).forEach(add);
    (await backend.selectData(makeResourceAppellationsQuery(batch))).forEach(add);
  }
  return {
    label,
    graphs: quads.size > 0 ? [graph] : [],
    trig: await serializeTrig(Array.from(quads.values())),
  };
}

/** File name for an exported knowledge map. */
export function exportFileName(label: string): string {
  const base = (label || 'knowledge-map')
    .trim()
    .replace(/[\s\\/:*?"<>|#%&{}$!'@+`=^~\[\]();,]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'knowledge-map'}.trig`;
}

/** File name for the data of an exported knowledge map. */
export function exportDataFileName(label: string): string {
  return exportFileName(label).replace(/\.trig$/, '-data.trig');
}

export function chunk<T>(items: ReadonlyArray<T>, size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}
