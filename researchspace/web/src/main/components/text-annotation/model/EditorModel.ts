/*
 * Copyright (C) 2015-2019, © Trustees of the British Museum
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, you can receive a copy
 * of the GNU Lesser General Public License from http://www.gnu.org/
 */

import * as Immutable from 'immutable';
import { sortBy } from 'lodash';
import * as Slate from 'slate';

import { Rdf } from 'platform/api/rdf';

import * as Schema from './AnnotationSchema';

export const ANNOTATION_RANGE_TYPE = 'rs-annotation-range';
export const ANNOTATION_POINT_TYPE = 'rs-annotation-point';

export type AnnotationData = Immutable.Map<string | number, any>;
export namespace AnnotationData {
  export interface Props {
    iri: Rdf.Iri;
    bodyType: Rdf.Iri | undefined;
    level?: number;
    highlighted?: boolean;
  }
  export function create(props: Props) {
    return Immutable.Map({...props});
  }
  export function set(data: AnnotationData, change: Partial<Props>) {
    return create({...asProps(data), ...change});
  }
  export function asProps(data: AnnotationData) {
    return data.toObject() as Props;
  }
  export function get<K extends keyof Props>(data: AnnotationData, key: K): Props[K] {
    return data.get(key) as Props[K];
  }
}

export type NodeData = Immutable.Map<string | number, any>;
export namespace NodeData {
  export interface Props {
    attributes: { [attributeName: string]: any };
    xpath: string;
  }
  export function create(props: Props) {
    return Immutable.Map(props);
  }
  export function asProps(data: NodeData) {
    return data.toObject() as Props;
  }
  export function get<K extends keyof Props>(data: NodeData, key: K): Props[K] {
    return data.get(key) as Props[K];
  }
  export function set<K extends keyof Props>(
    data: AnnotationData, key: K, value: Props[K]
  ): NodeData {
    return data.set(key, value);
  }
}

export function assignXPaths(document: Slate.Document): Slate.Document {
  function assingXPathToNodes(nodes: Immutable.List<Slate.Node>, parentPath: string) {
    const makeStep = makeChildIndexTracker();
    return nodes.map((node, index) => {
      if (node.object === 'block' || node.object === 'inline') {
        const path = `${parentPath}/${node.type}[${makeStep(node.type)}]`;
        return assingXPathToNode(node, path);
      } else {
        return node;
      }
    });
  }

  type BlockOrInline = Slate.Block | Slate.Inline;
  function assingXPathToNode(node: BlockOrInline, nodePath: string): BlockOrInline {
    let next = node;
    next = next.set('data', NodeData.set(node.data, 'xpath', nodePath)) as BlockOrInline;
    next = next.set('nodes', assingXPathToNodes(next.nodes, nodePath)) as BlockOrInline;
    return next;
  }

  function makeChildIndexTracker(): (nodeType: string) => number {
    const map = new Map<string, number>();
    return (nodeType: string) => {
      const last = map.has(nodeType) ? map.get(nodeType) : 0;
      const next = last + 1;
      map.set(nodeType, next);
      return next;
    };
  }

  const resultNodes = assingXPathToNodes(document.nodes, '');
  return Slate.Document.create({nodes: resultNodes});
}

export function mergeInAnnotations(
  doc: Slate.Document, annotations: ReadonlyArray<Schema.Annotation>
): Slate.Document {
  const {xpathToNode, xpathOrder} = findNodeXPaths(doc);
  const nodeKeyToPath = doc.getKeysToPathsTable() as { [key: string]: Slate.Path };

  let annotatedDoc = annotations.reduce((acc: Slate.Document, {iri, selector, bodyType}) => {
    if (selector.type === 'range') {
      const range = getRangeFromSelector(selector, xpathToNode, nodeKeyToPath);
      if (range) {
        return addMarksAtRange(
          acc,
          nodeKeyToPath,
          range,
          ANNOTATION_RANGE_TYPE,
          AnnotationData.create({iri, bodyType})
        );
      } else {
        console.warn(`Cannot find annotation target in the document: `, selector);
      }
    }
    return acc;
  }, doc);

  // sort point annotation in backwards order of appearance in the document
  const pointAnnotations = sortBy(
    annotations.filter(({selector}) => selector.type === 'point'),
    annotation => {
      const {xPath} = annotation.selector as Schema.PointSelector;
      const orderInDocument = xpathOrder.get(xPath);
      return -orderInDocument;
    }
  );
  annotatedDoc = pointAnnotations.reduce((acc: Slate.Document, {iri, selector, bodyType}) => {
    const {xPath, offset} = selector as Schema.PointSelector;
    const node = xpathToNode.get(xPath);
    if (node) {
      const point = getPointFromNodeOffset(node, offset, nodeKeyToPath);
      return insertInlineAtPoint(
        acc, point, ANNOTATION_POINT_TYPE, AnnotationData.create({iri, bodyType})
      );
    }
    console.warn(`Cannot find annotation target in the document: `, selector);
    return acc;
  }, annotatedDoc);

  return annotatedDoc;
}

function findNodeXPaths(doc: Slate.Document): {
  xpathToNode: Map<string, Slate.Block | Slate.Inline>;
  xpathOrder: Map<string, number>;
} {
  const xpathToNode = new Map<string, Slate.Block | Slate.Inline>();
  const xpathOrder = new Map<string, number>();

  function walkNode(node: Slate.Node) {
    if (node.object === 'block' || node.object === 'inline') {
      const xpath = NodeData.get(node.data, 'xpath');
      if (xpath) {
        xpathToNode.set(xpath, node);
        xpathOrder.set(xpath, xpathOrder.size);
      }
    }

    if (node.object !== 'text') {
      (node.nodes as Immutable.List<Slate.Node>).forEach(walkNode);
    }
  }

  walkNode(doc);
  return {xpathToNode, xpathOrder};
}

function getRangeFromSelector(
  selector: Schema.RangeSelector,
  xpathToNode: Map<string, Slate.Block | Slate.Inline>,
  nodeKeyToPath: { [key: string]: Slate.Path },
): Slate.Range | undefined {
  const startNode = xpathToNode.get(selector.start.xPath);
  const endNode = xpathToNode.get(selector.end.xPath);
  if (startNode && endNode) {
    const start = getPointFromNodeOffset(startNode, selector.start.offset, nodeKeyToPath);
    const end = getPointFromNodeOffset(endNode, selector.end.offset, nodeKeyToPath);
    if (start && end) {
      return Slate.Range.create({focus: start, anchor: end});
    }
  }
  return undefined;
}

function getPointFromNodeOffset(
  node: Slate.Block | Slate.Inline,
  offset: number,
  nodeKeyToPath: { [key: string]: Slate.Path },
): Slate.Point | undefined {
  let length = 0
  let lastText: Slate.Text | undefined;
  let text = node.getTexts().find((text, i, nodes) => {
    length += text.text.length;
    lastText = text;
    return length > offset;
  });
  if (offset === length) {
    text = lastText;
  }
  return text ? Slate.Point.create({
    key: text.key,
    path: nodeKeyToPath[text.key],
    offset: offset - length + text.text.length,
  }) : undefined;
}

function incrementLastPathIndex(path: Immutable.List<number>) {
  const index = path.size - 1;
  return path.set(index, path.get(index) + 1);
}

export function addMarksAtRange(
  doc: Slate.Document,
  nodeKeyToPath: { [key: string]: Slate.Path },
  range: Slate.Range,
  markType: string,
  markData: object
): Slate.Document {
  return doc.getTextsAtRange(range).reduce((acc: Slate.Document, text) => {
    const path = nodeKeyToPath[text.key];
    if (range.start.isInNode(text) || range.end.isInNode(text)) {
      const startOffset = range.start.isInNode(text) ? range.start.offset : 0;
      const endOffset = range.end.isInNode(text) ? range.end.offset : text.text.length;
      return acc.addMark(
        path,
        startOffset,
        endOffset - startOffset,
        Slate.Mark.create({type: markType, data: markData})
      ) as Slate.Document;
    } else {
      const start = Slate.Point.create({path, offset: 0});
      return acc.addMark(
        path,
        start.offset,
        start.moveToEndOfNode(text).offset - start.offset,
        Slate.Mark.create({type: markType, data: markData})
      ) as Slate.Document;
    }
  }, doc);
}

export function insertInlineAtPoint(
  doc: Slate.Document,
  point: Slate.Point,
  inlineType: string,
  inlineData: object
): Slate.Document {
  let changed = doc.splitNode(point.path, point.offset, undefined) as Slate.Document;
  const splitPoint = incrementLastPathIndex(point.path as Immutable.List<number>);
  return changed.insertNode(
    splitPoint,
    Slate.Inline.create({type: inlineType, data: inlineData})
  ) as Slate.Document;
}

export function updateAnnotationLevels(doc: Slate.Document): Slate.Document {
  const levels = findAnnotationLevels(doc);
  return mapAnnotations(doc, data => {
    const iri = AnnotationData.get(data, 'iri');
    const annotation = levels.get(iri.value);
    return annotation && typeof annotation.level === 'number'
      ? AnnotationData.set(data, {level: annotation.level})
      : data;
  });
}

interface ComputedAnnotation {
  iri: Rdf.Iri;
  level: number | undefined;
}

function findAnnotationLevels(doc: Slate.Document): Map<string, ComputedAnnotation> {
  const map = new Map<string, ComputedAnnotation>();

  function walkNode(node: Slate.Node) {
    if (node.object === 'text') {
      node.getLeaves().forEach(walkLeaf);
    } else if (node.object === 'inline' && node.type === ANNOTATION_POINT_TYPE) {
      const iri = AnnotationData.get(node.data, 'iri');
      map.set(iri.value, {iri, level: undefined});
    } else {
      walkNodes(node.nodes as Immutable.List<Slate.Node>);
    }
  }

  function walkLeaf(leaf: Slate.Leaf) {
    const occupiedLevels: boolean[] = [];
    leaf.marks.forEach(mark => {
      if (mark.type === ANNOTATION_RANGE_TYPE) {
        const iri = AnnotationData.get(mark.data, 'iri');
        const annotation = map.get(iri.value);
        if (annotation) {
          occupiedLevels[annotation.level] = true;
        }
      }
    });
    leaf.marks.forEach(mark => {
      if (mark.type === ANNOTATION_RANGE_TYPE) {
        const iri = AnnotationData.get(mark.data, 'iri');
        if (!map.has(iri.value)) {
          const level = findUnoccupiedLevel(occupiedLevels);
          occupiedLevels[level] = true;
          map.set(iri.value, {iri, level});
        }
      }
    });
  }

  function walkNodes(nodes: Immutable.List<Slate.Node>) {
    nodes.forEach(walkNode);
  }

  function findUnoccupiedLevel(occupied: boolean[]): number {
    for (let i = 0; i < occupied.length; i++) {
      if (!occupied[i]) {
        return i;
      }
    }
    return occupied.length;
  }

  walkNode(doc);
  return map;
}

export function highlightAnnotations(
  doc: Slate.Document,
  annotationIris: ReadonlySet<string>,
): Slate.Document {
  return mapAnnotations(doc, data => {
    const iri = AnnotationData.get(data, 'iri');
    const highlighted = AnnotationData.get(data, 'highlighted');
    const isTarget = annotationIris.has(iri.value);
    return isTarget === Boolean(highlighted)
      ? data : AnnotationData.set(data, {highlighted: isTarget});
  });
}

export function deleteAnnotation(doc: Slate.Document, annotationIri: Rdf.Iri): Slate.Document {
  return mapAnnotations(doc, data => {
    const iri = AnnotationData.get(data, 'iri');
    return iri.equals(annotationIri) ? null : data;
  });
}

function mapAnnotations(
  doc: Slate.Document,
  mapper: (data: AnnotationData) => AnnotationData | null
): Slate.Document {
  const levels = findAnnotationLevels(doc);

  function mapNode(node: Slate.Node): Slate.Node | null {
    if (node.object === 'text') {

      const mappedLeaves = node.getLeaves().map(mapLeaf);
      return node.setLeaves(mappedLeaves);
    } else if (node.object === 'inline' && node.type === ANNOTATION_POINT_TYPE) {
      const mappedData = mapper(node.data);
      if (mappedData === null) {
        return null;
      } else {
        return mappedData === node.data ? node : node.set('data', mappedData) as Slate.Inline;
      }
    } else if (node.nodes.size > 0) {
      const mappedNodes = (node.nodes as Immutable.List<Slate.Node>)
        .map(mapNode).filter(node => node !== null);
      return node.set('nodes', mappedNodes) as Slate.Node;
    }
    return node;
  }

  function mapLeaf(leaf: Slate.Leaf) {
    let updated = leaf;
    leaf.marks.forEach(mark => {
      if (mark.type === ANNOTATION_RANGE_TYPE) {
        const mappedData = mapper(mark.data);
        if (mappedData === null) {
          updated = updated.removeMark(mark);
        } else if (mappedData !== mark.data) {
          updated = updated.updateMark(mark, Slate.Mark.create({
            type: ANNOTATION_RANGE_TYPE,
            data: mappedData,
          }));
        }
      }
    });
    return updated;
  }

  return mapNode(doc) as Slate.Document;
}

export function createDecorationsForRange(
  doc: Slate.Document, range: Slate.Range, markType: string
): Immutable.List<Slate.Decoration> {
  // split range into separate decoration fro each text to avoid
  // marking the whole block when selection crosses block boundaries
  return doc.getTextsAtRange(range).map(text => {
    if (range.start.isInNode(text) || range.end.isInNode(text)) {
      return Slate.Decoration.create({
        anchor: range.start.isInNode(text)
          ? range.start
          : range.start.moveToStartOfNode(text).normalize(doc),
        focus: range.end.isInNode(text)
          ? range.end
          : range.end.moveToEndOfNode(text).normalize(doc),
        mark: Slate.Mark.create({type: markType}),
      });
    } else {
      const path = doc.getPath(text.key);
      const start = Slate.Point.create({key: text.key, path, offset: 0});
      return Slate.Decoration.create({
        anchor: start,
        focus: start.moveToEndOfNode(text).normalize(doc),
        mark: Slate.Mark.create({type: markType}),
      });
    }
  });
}

export function setValueProps(value: Slate.Value, props: {
  document?: Slate.Document;
  selection?: Slate.Selection;
  decorations?: Immutable.List<Slate.Decoration>;
}) {
  const {
    document = value.document,
    selection = value.selection,
    decorations = value.decorations,
  } = props;
  return Slate.Value.create({document, selection, decorations});
}

export function sortAnnotationsByFirstOccurence(
  doc: Slate.Document,
  annotations: ReadonlyArray<Schema.Annotation>
): Schema.Annotation[] {
  const order = new Map<string, number>();
  mapAnnotations(doc, data => {
    order.set(AnnotationData.get(data, 'iri').value, order.size);
    return data;
  });
  const result = [...annotations];
  result.sort((a, b) => {
    const i = order.get(a.iri.value);
    const j = order.get(b.iri.value);
    return (
      i < j ? -1 :
      i > j ? 1 :
      0
    );
  });
  return result;
}

export function updateAnnotation(
  doc: Slate.Document,
  target: Rdf.Iri,
  annotation: Schema.Annotation
): Slate.Document {
  return mapAnnotations(doc, data => {
    const iri = AnnotationData.get(data, 'iri');
    return iri.equals(target)
      ? AnnotationData.set(data, {iri: annotation.iri, bodyType: annotation.bodyType})
      : data;
  });
}

export function extractTextFragment(doc: Slate.Document, range: Slate.Range): string {
  return doc.getFragmentAtRange(range).getBlocks().map(b => b.text).join(' ');
}
