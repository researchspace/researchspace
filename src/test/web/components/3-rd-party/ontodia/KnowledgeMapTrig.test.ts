/**
 * Copyright (c) 2026 ResearchSpace contributors.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { expect } from 'chai';
import * as Reactodia from '@reactodia/workspace';
import * as jsonld from 'jsonld';

import { SparqlUtil } from 'platform/api/sparql';
import { OntodiaContextV1, addLegacyLayoutFields } from 'platform/components/3-rd-party/ontodia/data/DiagramService';
import {
  ESTIMATED_NODE_SIZE,
  KnowledgeMapExportBackend,
  KnowledgeMapImportBackend,
  N3Bindings,
  Quad,
  computeLayout,
  describeImportReport,
  ensureDiagramPositions,
  exportDataFileName,
  exportFileName,
  exportKnowledgeMapDataTrig,
  exportKnowledgeMapTrig,
  importKnowledgeMapTrig,
  iriRef,
  isSafeIri,
  knowledgeMapSlug,
  makeGraphKnowledgeMapQuery,
  parseTrig,
  planImport,
} from 'platform/components/3-rd-party/ontodia/data/KnowledgeMapTrig';

const EX = 'http://example.com/';
const CRM = 'http://www.cidoc-crm.org/cidoc-crm/';
const O = 'http://ontodia.org/schema/v1#';

interface SavedMap {
  label: string;
  diagram: Reactodia.SerializedDiagram;
  iri?: string;
}

class FakeImportBackend implements KnowledgeMapImportBackend {
  readonly saved: SavedMap[] = [];
  readonly existenceChecks: Array<{ iri: string | undefined; graph: string | undefined }> = [];
  constructor(private existingMaps: string[] = [], private existingGraphs: string[] = [], private failSave = false) {}

  knowledgeMapExists(iri: string | undefined, graph: string | undefined) {
    this.existenceChecks.push({ iri, graph });
    return Promise.resolve(this.existingMaps.indexOf(iri) >= 0 || this.existingGraphs.indexOf(graph) >= 0);
  }
  saveKnowledgeMap(label: string, diagram: Reactodia.SerializedDiagram, iri?: string) {
    if (this.failSave) {
      return Promise.reject(new Error('Forbidden'));
    }
    this.saved.push({ label, diagram, iri });
    return Promise.resolve(iri || `${EX}map/${this.saved.length}`);
  }
}

function entityElements(diagram: Reactodia.SerializedDiagram): Reactodia.SerializedEntityElement[] {
  return diagram.layoutData.elements as Reactodia.SerializedEntityElement[];
}

/** A knowledge map as stored in the knowledge map container (RDF diagram format). */
function storedMap(secondPosition: string, extra = ''): string {
  return `
    <${EX}diagram/context> {
      <${EX}diagram> a <${O}Diagram>, <http://www.w3.org/ns/prov#Entity> ;
        <http://www.w3.org/2000/01/rdf-schema#label> "ESWC Series" ;
        <${O}layoutData> _:layout .
      _:layout a <${O}Layout> ; <${O}hasElement> <${EX}e1>, <${EX}e2> ; <${O}hasLink> <${EX}l1> .
      <${EX}e1> a <${O}Element> ; <${O}resource> <${EX}q1> ; <${O}position> _:p1 .
      _:p1 <${O}xCoordValue> 487 ; <${O}yCoordValue> 232 .
      <${EX}e2> a <${O}Element> ; <${O}resource> <${EX}q2> ${secondPosition} .
      <${EX}l1> a <${O}Link> ; <${O}property> <${EX}p> ; <${O}source> <${EX}e1> ; <${O}target> <${EX}e2> .
    }
    ${extra}`;
}

const WITH_POSITION = `; <${O}position> [ <${O}xCoordValue> 10 ; <${O}yCoordValue> 20 ]`;

describe('KnowledgeMapTrig', () => {
  describe('parsing and planning', () => {
    it('keeps graph names and uses an empty name for the default graph', async () => {
      const quads = await parseTrig(`<${EX}a> <${EX}p> <${EX}b> .\n<${EX}g> { <${EX}c> <${EX}p> "x" . }`);
      expect(quads.map((q) => q.graph)).to.deep.equal(['', `${EX}g`]);
    });

    it('rejects invalid files', async () => {
      let failed = false;
      try {
        await parseTrig(`<${EX}a> <${EX}p> .`);
      } catch (e) {
        failed = true;
      }
      expect(failed).to.be.true;
    });

    it('separates knowledge maps from other graphs and drops LDP container hints', async () => {
      const quads = await parseTrig(`
        <${EX}map/context> {
          <${EX}map> a <${O}Diagram> ; <${CRM}P190_has_symbolic_content> "Map" .
        }
        <${EX}container/context> {
          _:hint <http://www.w3.org/ns/ldp#contains> <${EX}map> .
        }
        _:hint a <http://www.w3.org/ns/ldp#Container> .
        <${EX}data> { <${EX}a> <${EX}p> <${EX}b> . }
        <${EX}c> <${EX}p> <${EX}d> .
      `);
      const plan = planImport(quads);
      expect(plan.diagrams).to.have.length(1);
      expect(plan.diagrams[0].iri).to.equal(`${EX}map`);
      expect(plan.diagrams[0].graph).to.equal(`${EX}map/context`);
      expect(plan.otherGraphs).to.deep.equal([`${EX}data`, '']);
    });
  });

  describe('separating maps and data', () => {
    it('separates two knowledge maps in one graph and reports other data next to them', async () => {
      const quads = await parseTrig(`
        <${EX}maps> {
          <${EX}m1> a <${O}Diagram> ; <${O}layoutData> _:l1 .
          _:l1 <${O}hasElement> <${EX}e1> .
          <${EX}e1> <${O}resource> <${EX}a> .
          <${EX}m2> a <${O}Diagram> ; <${O}layoutData> _:l2 .
          _:l2 <${O}hasElement> <${EX}e2> .
          <${EX}e2> <${O}resource> <${EX}b> .
          <${EX}a> <${EX}p> <${EX}b> .
        }
      `);
      const plan = planImport(quads);
      expect(plan.diagrams.map((d) => d.iri)).to.deep.equal([`${EX}m1`, `${EX}m2`]);
      const subjects = (i: number) => Array.from(new Set(plan.diagrams[i].quads.map((q) => q.subject)));
      expect(subjects(0)).to.have.members([`${EX}m1`, plan.diagrams[0].quads[1].object, `${EX}e1`]);
      expect(subjects(1)).not.to.include(`${EX}m1`);
      expect(subjects(1)).to.include(`${EX}e2`);
      // <a> <p> <b> is not part of either map
      expect(plan.otherGraphs).to.deep.equal([`${EX}maps`]);
    });

    it('accepts only plain absolute IRIs in queries', () => {
      expect(isSafeIri('http://example.com/a?b=c#d')).to.be.true;
      expect(isSafeIri('urn:uuid:123')).to.be.true;
      for (const unsafe of [
        'relative/iri',
        'http://x> } SERVICE <http://evil/> {',
        'http://a b',
        'http://a"b',
        '',
        42,
      ]) {
        expect(isSafeIri(unsafe), String(unsafe)).to.be.false;
      }
      expect(() => iriRef('http://x> . ?s ?p ?o')).to.throw();
      expect(() => makeGraphKnowledgeMapQuery('http://x> } }')).to.throw();
      expect(() => SparqlUtil.parseQuery(makeGraphKnowledgeMapQuery(`${EX}graph`))).not.to.throw();
    });
  });

  describe('layout', () => {
    it('lays out nodes with finite, non-overlapping positions', async () => {
      const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
      const links = [
        { source: 'a', target: 'b' },
        { source: 'a', target: 'c' },
        { source: 'c', target: 'd' },
        { source: 'e', target: 'e' },
      ];
      const positions = await computeLayout(ids, links);
      expect(positions.size).to.equal(ids.length);
      const boxes = ids.map((id) => positions.get(id));
      boxes.forEach(({ x, y }) => {
        expect(isFinite(x) && isFinite(y)).to.be.true;
        expect(x >= 0 && y >= 0).to.be.true;
      });
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const overlapX = Math.abs(boxes[i].x - boxes[j].x) < ESTIMATED_NODE_SIZE.width;
          const overlapY = Math.abs(boxes[i].y - boxes[j].y) < ESTIMATED_NODE_SIZE.height;
          expect(overlapX && overlapY, `${ids[i]} overlaps ${ids[j]}`).to.be.false;
        }
      }
    });

    it('lays out diagrams only if a node has no position', async () => {
      const diagram: Reactodia.SerializedDiagram = {
        '@context': Reactodia.DiagramContextV1,
        '@type': 'Diagram',
        layoutData: {
          '@type': 'Layout',
          elements: [
            { '@type': 'Element', '@id': 'e1', iri: `${EX}a`, position: { x: 10, y: 10 } } as any,
            { '@type': 'Element', '@id': 'e2', iri: `${EX}b` } as any,
          ],
          links: [],
        },
        linkTypeOptions: [],
      };
      const result = await ensureDiagramPositions(diagram);
      expect(result.laidOut).to.be.true;
      const [first, second] = entityElements(result.diagram);
      // the position chosen by the user is kept, the new node is placed below it
      expect(first.position).to.deep.equal({ x: 10, y: 10 });
      expect(second.position.x).to.equal(10);
      expect(second.position.y).to.be.at.least(10 + 2 * ESTIMATED_NODE_SIZE.height);
      expect((await ensureDiagramPositions(result.diagram)).laidOut).to.be.false;
    });

    it('lays out all nodes if none has a position', async () => {
      const diagram: Reactodia.SerializedDiagram = {
        '@context': Reactodia.DiagramContextV1,
        '@type': 'Diagram',
        layoutData: {
          '@type': 'Layout',
          elements: ['a', 'b', 'c'].map((id) => ({ '@type': 'Element', '@id': id, iri: `${EX}${id}` } as any)),
          links: [],
        },
        linkTypeOptions: [],
      };
      const result = await ensureDiagramPositions(diagram);
      expect(entityElements(result.diagram).every((e) => e.position && isFinite(e.position.x))).to.be.true;
    });
  });

  describe('import', () => {
    it('imports a knowledge map with its IRI, label and layout', async () => {
      const backend = new FakeImportBackend();
      const report = await importKnowledgeMapTrig(storedMap(WITH_POSITION), 'eswc.trig', backend);
      expect(backend.existenceChecks).to.deep.equal([{ iri: `${EX}diagram`, graph: `${EX}diagram/context` }]);
      const saved = backend.saved[0];
      expect(saved.label).to.equal('ESWC Series');
      expect(saved.iri).to.equal(`${EX}diagram`);
      // only the layout is kept, metadata of the original resource is re-created on save
      expect(Object.keys(saved.diagram).sort()).to.deep.equal(['@context', '@type', 'layoutData', 'linkTypeOptions']);
      expect(entityElements(saved.diagram).find((e) => e.iri === `${EX}q1`).position).to.deep.equal({ x: 487, y: 232 });
      expect(saved.diagram.layoutData.links).to.have.length(1);

      const view = describeImportReport(report);
      expect(view.level).to.equal('success');
      expect(view.paragraphs).to.deep.equal(['Imported knowledge map "ESWC Series".']);
      expect(view.openableMaps).to.deep.equal([{ iri: `${EX}diagram`, label: 'ESWC Series', existing: false }]);
    });

    it('reads a language-tagged label of a knowledge map', async () => {
      const backend = new FakeImportBackend();
      await importKnowledgeMapTrig(
        `<${EX}m/context> {
          <${EX}m> a <${O}Diagram> ; <${CRM}P190_has_symbolic_content> "Roman roads"@en ; <${O}layoutData> _:l .
          _:l a <${O}Layout> ; <${O}hasElement> <${EX}e1> .
          <${EX}e1> a <${O}Element> ; <${O}resource> <${EX}a> ; <${O}position> [ <${O}xCoordValue> 1 ; <${O}yCoordValue> 2 ] .
        }`,
        'm.trig',
        backend
      );
      expect(backend.saved[0].label).to.equal('Roman roads');
    });

    it('lays out a knowledge map with nodes without position', async () => {
      const backend = new FakeImportBackend();
      const report = await importKnowledgeMapTrig(storedMap(''), 'eswc.trig', backend);
      expect(entityElements(backend.saved[0].diagram).every((e) => e.position && isFinite(e.position.x))).to.be.true;
      expect(describeImportReport(report).paragraphs).to.deep.equal([
        'Imported knowledge map "ESWC Series".',
        'Some of its nodes had no position, so an automatic layout was applied.',
      ]);
    });

    it('imports a legacy Ontodia knowledge map', async () => {
      const layout = JSON.stringify({
        layoutData: {
          cells: [
            { type: 'element', id: 'c1', iri: `${EX}a`, position: { x: 5, y: 6 } },
            { type: 'element', id: 'c2', iri: `${EX}b`, position: { x: 50, y: 60 } },
            { type: 'link', id: 'c3', typeId: `${EX}p`, source: { id: 'c1' }, target: { id: 'c2' } },
          ],
        },
        linkSettings: [],
      });
      const backend = new FakeImportBackend();
      const report = await importKnowledgeMapTrig(
        `<${EX}legacy/context> {
          <${EX}legacy> a <http://www.ontodia.org/schema/v1#diagram> ;
            <${CRM}P190_has_symbolic_content> "Old map" ;
            <http://www.ontodia.org/schema/v1#diagramLayoutString> ${JSON.stringify(layout)} .
        }`,
        'old.trig',
        backend
      );
      expect(report.maps[0].status).to.equal('created');
      expect(backend.saved[0].label).to.equal('Old map');
      expect(entityElements(backend.saved[0].diagram).map((e) => e.iri)).to.deep.equal([`${EX}a`, `${EX}b`]);
      expect(backend.saved[0].diagram.layoutData.links).to.have.length(1);
    });

    it('does not import other graphs and says so briefly', async () => {
      const backend = new FakeImportBackend();
      const report = await importKnowledgeMapTrig(
        storedMap(WITH_POSITION, `<${EX}persons> { <${EX}q1> <${EX}p> "x" . } <${EX}a> <${EX}p> <${EX}b> .`),
        'eswc.trig',
        backend
      );
      expect(backend.saved).to.have.length(1);
      const view = describeImportReport(report);
      expect(view.level).to.equal('success');
      expect(view.paragraphs).to.deep.equal([
        'Imported knowledge map "ESWC Series".',
        'Other data in the file was not imported.',
      ]);
    });

    it('does not import a knowledge map that already exists', async () => {
      for (const backend of [
        new FakeImportBackend([`${EX}diagram`]),
        new FakeImportBackend([], [`${EX}diagram/context`]),
      ]) {
        const report = await importKnowledgeMapTrig(storedMap(WITH_POSITION), 'eswc.trig', backend);
        expect(backend.saved).to.have.length(0);
        const view = describeImportReport(report);
        expect(view.level).to.equal('warning');
        expect(view.paragraphs).to.deep.equal([
          'The knowledge map "ESWC Series" already exists, so it was not imported.',
        ]);
        expect(view.openableMaps).to.deep.equal([{ iri: `${EX}diagram`, label: 'ESWC Series', existing: true }]);
      }
    });

    it('reports files without knowledge maps', async () => {
      const report = await importKnowledgeMapTrig(
        `<${EX}g> { <${EX}a> <${EX}p> <${EX}b> . }`,
        'data.trig',
        new FakeImportBackend()
      );
      const view = describeImportReport(report);
      expect(view.level).to.equal('warning');
      expect(view.paragraphs).to.deep.equal(['No knowledge map found in data.trig, nothing was imported.']);
    });

    it('reports maps that could not be saved', async () => {
      const report = await importKnowledgeMapTrig(
        storedMap(WITH_POSITION),
        'eswc.trig',
        new FakeImportBackend([], [], true)
      );
      const view = describeImportReport(report);
      expect(view.level).to.equal('danger');
      expect(view.paragraphs).to.deep.equal(['Failed to import knowledge map "ESWC Series": Forbidden']);
    });

    it('reports files that cannot be read', async () => {
      const report = await importKnowledgeMapTrig('this is not trig', 'broken.trig', new FakeImportBackend());
      const view = describeImportReport(report);
      expect(view.level).to.equal('danger');
      expect(view.paragraphs[0]).to.match(/^broken\.trig could not be read: .*\. Nothing was imported\.$/);
    });

    it('makes slugs that are safe in HTTP headers and IRIs', () => {
      expect(knowledgeMapSlug('Roman roads: Ostia → Rome')).to.equal('Roman_roads_Ostia_Rome');
      expect(knowledgeMapSlug('Café')).to.equal('Cafe');
      expect(knowledgeMapSlug('Ελληνικά')).to.be.undefined;
    });
  });

  describe('export', () => {
    const MAP = `${EX}maps/roman-roads`;
    const MAP_GRAPH = `${MAP}/context`;
    const DATA_GRAPH = `${EX}graph-places`;

    async function makeStoredMap(): Promise<Quad[]> {
      const diagram: any = {
        '@context': OntodiaContextV1['@context'],
        '@id': MAP,
        '@type': 'Diagram',
        layoutData: {
          '@type': 'Layout',
          elements: [
            { '@type': 'Element', '@id': `${EX}e/1`, iri: `${EX}rome`, position: { x: 0, y: 0 } },
            { '@type': 'Element', '@id': `${EX}e/2`, iri: `${EX}ostia`, position: { x: 300, y: 120 } },
          ],
          links: [
            {
              '@type': 'Link',
              '@id': `${EX}l/1`,
              property: `${EX}connectedTo`,
              source: { '@id': `${EX}e/1` },
              target: { '@id': `${EX}e/2` },
            },
          ],
        },
        linkTypeOptions: [],
      };
      diagram[`${CRM}P190_has_symbolic_content`] = 'Roman roads';
      diagram['http://www.w3.org/ns/prov#wasAttributedTo'] = { '@id': `${EX}user/someone` };
      const nquads = await jsonld.toRDF(addLegacyLayoutFields(diagram), { format: 'application/n-quads' });
      return (await parseTrig((nquads as any) as string)).map((q) => ({ ...q, graph: MAP_GRAPH }));
    }

    function graphsInQuery(query: string): string[] {
      const values = /VALUES \?g \{([^}]*)\}/.exec(query);
      return values ? values[1].match(/<[^>]+>/g).map((iri) => iri.slice(1, -1)) : [];
    }

    function makeExportBackend(mapQuads: Quad[], dataQuads: Quad[], dataQueries: string[]): KnowledgeMapExportBackend {
      const rows = (quads: Quad[]): N3Bindings[] =>
        quads.map((q) => ({ g: q.graph, s: q.subject, p: q.predicate, o: q.object }));
      return {
        getDiagram: () =>
          Promise.resolve({
            label: 'Roman roads',
            diagram: {
              '@context': Reactodia.DiagramContextV1,
              '@type': 'Diagram',
              layoutData: {
                '@type': 'Layout',
                elements: [
                  { '@type': 'Element', '@id': 'e1', iri: `${EX}rome`, position: { x: 0, y: 0 } } as any,
                  { '@type': 'Element', '@id': 'e2', iri: `${EX}ostia`, position: { x: 300, y: 120 } } as any,
                ],
                links: [],
              },
              linkTypeOptions: [],
            },
          }),
        selectMaps: (query) => {
          SparqlUtil.parseQuery(query);
          if (query.indexOf('VALUES ?type') >= 0) {
            return Promise.resolve([{ g: MAP_GRAPH }]);
          }
          const graphs = graphsInQuery(query);
          return Promise.resolve(rows(mapQuads.filter((q) => graphs.indexOf(q.graph) >= 0)));
        },
        selectData: (query) => {
          SparqlUtil.parseQuery(query);
          dataQueries.push(query);
          if (query.indexOf('SELECT DISTINCT ?g') >= 0) {
            expect(query).to.contain(`<${EX}rome>`);
            expect(query).to.contain('E32_Authority_Document');
            return Promise.resolve([{ g: DATA_GRAPH }]);
          }
          const graphs = graphsInQuery(query);
          return Promise.resolve(rows(dataQuads.filter((q) => graphs.indexOf(q.graph) >= 0)));
        },
      };
    }

    async function makeDataQuads(): Promise<Quad[]> {
      return parseTrig(`<${DATA_GRAPH}> {
        <${EX}rome> <http://www.w3.org/2000/01/rdf-schema#label> "Rome"@en ; <${EX}connectedTo> <${EX}ostia> .
      }`);
    }

    it('downloads only the graph of the map by default, and it imports again under the same IRI', async () => {
      const dataQueries: string[] = [];
      const exported = await exportKnowledgeMapTrig(
        MAP,
        makeExportBackend(await makeStoredMap(), await makeDataQuads(), dataQueries)
      );
      expect(dataQueries).to.deep.equal([]);
      expect(exported.graphs).to.deep.equal([MAP_GRAPH]);
      expect(exported.trig).not.to.contain('Rome');
      expect(exportFileName(exported.label)).to.equal('Roman-roads.trig');

      const backend = new FakeImportBackend();
      const report = await importKnowledgeMapTrig(exported.trig, 'Roman-roads.trig', backend);
      expect(report.ignoredGraphs).to.deep.equal([]);
      const saved = backend.saved[0];
      expect(saved.iri).to.equal(MAP);
      expect(saved.label).to.equal('Roman roads');
      const elements = entityElements(saved.diagram);
      expect(elements.map((e) => e.iri)).to.have.members([`${EX}rome`, `${EX}ostia`]);
      expect(elements.find((e) => e.iri === `${EX}ostia`).position).to.deep.equal({ x: 300, y: 120 });
      expect(saved.diagram.layoutData.links).to.have.length(1);
      expect(describeImportReport(report).level).to.equal('success');
    });

    it('downloads the data of the map with include data', async () => {
      const dataQueries: string[] = [];
      const exported = await exportKnowledgeMapTrig(
        MAP,
        makeExportBackend(await makeStoredMap(), await makeDataQuads(), dataQueries),
        { includeData: true }
      );
      expect(exported.graphs).to.deep.equal([MAP_GRAPH, DATA_GRAPH]);
      expect(exported.trig).to.contain('"Rome"@en');

      // the map is imported, the data graph is reported as not imported
      const backend = new FakeImportBackend();
      const report = await importKnowledgeMapTrig(exported.trig, 'Roman-roads.trig', backend);
      expect(backend.saved).to.have.length(1);
      expect(report.ignoredGraphs).to.deep.equal([DATA_GRAPH]);
    });

    it('downloads the data shown on the map without layout, with types and labels of all resources', async () => {
      const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
      const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';
      const SKOS_PREF_LABEL = 'http://www.w3.org/2004/02/skos/core#prefLabel';
      const database = (
        await parseTrig(`<${DATA_GRAPH}> {
          <${EX}rome> a <${CRM}E53_Place> ; <${CRM}P2_has_type> <${EX}type/city> ;
            <${RDFS_LABEL}> "Rome" ; <${EX}description> "not a label" ;
            <${CRM}P1_is_identified_by> <${EX}rome/name>, _:identifier ;
            <${EX}connectedTo> <${EX}ostia> ; <${EX}notOnTheMap> <${EX}ostia> .
          <${EX}rome/name> a <${CRM}E41_Appellation> ; <${CRM}P2_has_type> <${EX}type/primary_appellation> ;
            <${CRM}P190_has_symbolic_content> "Roma"@it ; <${EX}note> "not exported" .
          _:identifier a <${CRM}E42_Identifier> .
          <${EX}ostia> a <${CRM}E53_Place> ; <${SKOS_PREF_LABEL}> "Ostia" .
          <${EX}via> a <${CRM}E53_Place> .
        }`)
      ).map((q) => ({ s: q.subject, p: q.predicate, o: q.object }));
      const iris = (text: string) => (text.match(/<[^>]+>/g) || []).map((iri) => iri.slice(1, -1));
      const queries: string[] = [];
      const backend: KnowledgeMapExportBackend = {
        getDiagram: () =>
          Promise.resolve({
            label: 'Roman roads',
            diagram: {
              '@context': Reactodia.DiagramContextV1,
              '@type': 'Diagram',
              layoutData: {
                '@type': 'Layout',
                elements: [
                  { '@type': 'Element', '@id': 'e1', iri: `${EX}rome`, position: { x: 0, y: 0 } } as any,
                  { '@type': 'Element', '@id': 'e2', iri: `${EX}ostia`, position: { x: 300, y: 120 } } as any,
                  // not a plain IRI (e.g. from a crafted file): never written into a query
                  {
                    '@type': 'Element',
                    '@id': 'bad',
                    iri: 'http://x> } SERVICE <http://evil/> {',
                    position: { x: 0, y: 0 },
                  } as any,
                  {
                    '@type': 'ElementGroup',
                    '@id': 'g1',
                    position: { x: 10, y: 400 },
                    items: [{ '@type': 'ElementItem', iri: `${EX}via` }],
                  } as any,
                ],
                links: [
                  {
                    '@type': 'Link',
                    '@id': 'l1',
                    property: `${EX}connectedTo`,
                    source: { '@id': 'e1' },
                    target: { '@id': 'e2' },
                  } as any,
                  // shown on the map but not in the database: not exported
                  {
                    '@type': 'Link',
                    '@id': 'l2',
                    property: `${EX}stale`,
                    source: { '@id': 'e2' },
                    target: { '@id': 'e1' },
                  } as any,
                ],
              },
              linkTypeOptions: [],
            },
          }),
        selectMaps: () => Promise.reject(new Error('the data download does not need the map graph')),
        selectData: (query) => {
          // the queries must be valid SPARQL, the rest of this fake only looks at their text
          SparqlUtil.parseQuery(query);
          queries.push(query);
          if (query.indexOf('VALUES (?s ?p ?o)') >= 0) {
            const tuples = (query.match(/\(<[^)]*>\)/g) || []).map(iris);
            return Promise.resolve(
              database.filter((t) => tuples.some(([s, p, o]) => t.s === s && t.p === p && t.o === o))
            );
          }
          // evaluates the other two queries by what they are meant to return
          const resources = iris(query.substring(query.indexOf('VALUES'), query.indexOf('}')));
          const isLiteral = (value: string) => value.startsWith('"');
          const appellationLabels = [`${CRM}P190_has_symbolic_content`, RDFS_LABEL];
          if (query.indexOf('?appellation') >= 0 || query.indexOf('P1_is_identified_by') >= 0) {
            const labelled = (s: string) => database.some((t) => t.s === s && appellationLabels.indexOf(t.p) >= 0);
            const links = database.filter(
              (t) => resources.indexOf(t.s) >= 0 && t.p === `${CRM}P1_is_identified_by` && labelled(t.o)
            );
            const appellations = links.map((t) => t.o);
            return Promise.resolve([
              ...links,
              ...database.filter(
                (t) =>
                  appellations.indexOf(t.s) >= 0 &&
                  [...appellationLabels, RDF_TYPE, `${CRM}P2_has_type`].indexOf(t.p) >= 0
              ),
            ]);
          }
          const labels = [RDFS_LABEL, `${CRM}P190_has_symbolic_content`, SKOS_PREF_LABEL];
          return Promise.resolve(
            database.filter(
              (t) =>
                resources.indexOf(t.s) >= 0 &&
                ([RDF_TYPE, `${CRM}P2_has_type`].indexOf(t.p) >= 0 || (labels.indexOf(t.p) >= 0 && isLiteral(t.o)))
            )
          );
        },
      };

      const exported = await exportKnowledgeMapDataTrig(MAP, backend);
      expect(exportDataFileName(exported.label)).to.equal('Roman-roads-data.trig');
      expect(exported.graphs).to.deep.equal([`${MAP}/data`]);
      const quads = await parseTrig(exported.trig);
      expect(quads.every((q) => q.graph === `${MAP}/data`)).to.be.true;
      expect(quads.map((q) => `${q.subject} ${q.predicate} ${q.object}`)).to.have.members([
        `${EX}rome ${EX}connectedTo ${EX}ostia`,
        `${EX}rome ${RDF_TYPE} ${CRM}E53_Place`,
        `${EX}rome ${CRM}P2_has_type ${EX}type/city`,
        `${EX}ostia ${RDF_TYPE} ${CRM}E53_Place`,
        `${EX}via ${RDF_TYPE} ${CRM}E53_Place`,
        `${EX}rome ${RDFS_LABEL} "Rome"`,
        `${EX}ostia ${SKOS_PREF_LABEL} "Ostia"`,
        `${EX}rome ${CRM}P1_is_identified_by ${EX}rome/name`,
        `${EX}rome/name ${RDF_TYPE} ${CRM}E41_Appellation`,
        `${EX}rome/name ${CRM}P2_has_type ${EX}type/primary_appellation`,
        `${EX}rome/name ${CRM}P190_has_symbolic_content "Roma"@it`,
      ]);
      expect(queries.some((q) => q.indexOf('P1_is_identified_by') >= 0)).to.be.true;
      expect(exported.trig).not.to.contain('ontodia');
    });
  });
});
