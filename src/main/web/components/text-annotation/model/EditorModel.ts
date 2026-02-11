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
    return Immutable.Map({ ...props });
  }
  export function set(data: AnnotationData, change: Partial<Props>) {
    return create({ ...asProps(data), ...change });
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
  export function set<K extends keyof Props>(data: AnnotationData, key: K, value: Props[K]): NodeData {
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
  return Slate.Document.create({ nodes: resultNodes });
}

/**
 * Create native Slate Annotations from schema annotations.
 * Returns an Immutable.Map<string, Slate.Annotation> for use on Value.annotations.
 */
export function mergeInAnnotations(
  doc: Slate.Document,
  annotations: ReadonlyArray<Schema.Annotation>
): Immutable.Map<string, Slate.Annotation> {
  const { xpathToNode } = findNodeXPaths(doc);
  const nodeKeyToPath = doc.getKeysToPathsTable() as { [key: string]: Slate.Path };

  const result: { [key: string]: Slate.Annotation } = {};
  let keyCounter = 0;

  for (const { iri, selector, bodyType } of annotations) {
    if (selector.type === 'range') {
      const range = getRangeFromSelector(selector, xpathToNode, nodeKeyToPath);
      if (range) {
        const annotationKey = `annotation-${keyCounter++}`;
        result[annotationKey] = Slate.Annotation.create({
          key: annotationKey,
          type: ANNOTATION_RANGE_TYPE,
          data: AnnotationData.create({ iri, bodyType }),
          anchor: range.anchor,
          focus: range.focus,
        });
      } else {
        console.warn(`Cannot find annotation target in the document: `, selector);
      }
    } else if (selector.type === 'point') {
      const { xPath, offset } = selector as Schema.PointSelector;
      const node = xpathToNode.get(xPath);
      if (node) {
        const point = getPointFromNodeOffset(node, offset, nodeKeyToPath);
        if (point) {
          const annotationKey = `annotation-${keyCounter++}`;
          result[annotationKey] = Slate.Annotation.create({
            key: annotationKey,
            type: ANNOTATION_POINT_TYPE,
            data: AnnotationData.create({ iri, bodyType }),
            anchor: point,
            focus: point,
          });
        }
      } else {
        console.warn(`Cannot find annotation target in the document: `, selector);
      }
    }
  }

  return Slate.Annotation.createMap(result);
}

function findNodeXPaths(
  doc: Slate.Document
): {
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
  return { xpathToNode, xpathOrder };
}

function getRangeFromSelector(
  selector: Schema.RangeSelector,
  xpathToNode: Map<string, Slate.Block | Slate.Inline>,
  nodeKeyToPath: { [key: string]: Slate.Path }
): Slate.Range | undefined {
  const startNode = xpathToNode.get(selector.start.xPath);
  const endNode = xpathToNode.get(selector.end.xPath);
  if (startNode && endNode) {
    const start = getPointFromNodeOffset(startNode, selector.start.offset, nodeKeyToPath);
    const end = getPointFromNodeOffset(endNode, selector.end.offset, nodeKeyToPath);
    if (start && end) {
      return Slate.Range.create({ focus: start, anchor: end });
    }
  }
  return undefined;
}

function getPointFromNodeOffset(
  node: Slate.Block | Slate.Inline,
  offset: number,
  nodeKeyToPath: { [key: string]: Slate.Path }
): Slate.Point | undefined {
  let length = 0;
  let lastText: Slate.Text | undefined;
  let text = node.getTexts().find((text, i, nodes) => {
    length += text.text.length;
    lastText = text;
    return length > offset;
  });
  if (offset === length) {
    text = lastText;
  }
  return text
    ? Slate.Point.create({
        key: text.key,
        path: nodeKeyToPath[text.key] as Immutable.List<number>,
        offset: offset - length + text.text.length,
      })
    : undefined;
}

/**
 * Compute annotation stacking levels and return updated annotations map.
 */
export function updateAnnotationLevels(
  annotations: Immutable.Map<string, Slate.Annotation>
): Immutable.Map<string, Slate.Annotation> {
  const levels = findAnnotationLevels(annotations);
  return annotations.map((annotation) => {
    const data = annotation.data as AnnotationData;
    const iri = AnnotationData.get(data, 'iri');
    const computed = levels.get(iri.value);
    if (computed && typeof computed.level === 'number') {
      return annotation.setProperties({
        key: annotation.key,
        type: annotation.type,
        data: AnnotationData.set(data, { level: computed.level }),
      }) as Slate.Annotation;
    }
    return annotation;
  }) as Immutable.Map<string, Slate.Annotation>;
}

interface ComputedAnnotation {
  iri: Rdf.Iri;
  level: number | undefined;
}

/**
 * Compute stacking levels for overlapping annotations based on their positions.
 * Two annotations overlap if their ranges intersect.
 */
function findAnnotationLevels(
  annotations: Immutable.Map<string, Slate.Annotation>
): Map<string, ComputedAnnotation> {
  const map = new Map<string, ComputedAnnotation>();

  // Convert annotations to a sortable list with computed anchors
  type AnnotationEntry = {
    iri: Rdf.Iri;
    isCollapsed: boolean;
    anchorKey: string;
    anchorOffset: number;
    focusKey: string;
    focusOffset: number;
  };

  const entries: AnnotationEntry[] = [];
  annotations.forEach((annotation) => {
    const data = annotation.data as AnnotationData;
    const iri = AnnotationData.get(data, 'iri');
    entries.push({
      iri,
      isCollapsed: annotation.isCollapsed,
      anchorKey: annotation.anchor.key,
      anchorOffset: annotation.anchor.offset,
      focusKey: annotation.focus.key,
      focusOffset: annotation.focus.offset,
    });
  });

  // Point annotations don't need levels
  for (const entry of entries) {
    if (entry.isCollapsed) {
      map.set(entry.iri.value, { iri: entry.iri, level: undefined });
    }
  }

  // For range annotations, assign levels greedily
  // Sort by anchor position to process in document order
  const rangeEntries = entries.filter((e) => !e.isCollapsed);
  const occupiedLevels: Map<string, number> = new Map(); // iri -> level

  for (const entry of rangeEntries) {
    if (!map.has(entry.iri.value)) {
      // Find the lowest unoccupied level
      const usedLevels = new Set(
        Array.from(occupiedLevels.values())
      );
      let level = 0;
      while (usedLevels.has(level)) {
        level++;
      }
      occupiedLevels.set(entry.iri.value, level);
      map.set(entry.iri.value, { iri: entry.iri, level });
    }
  }

  return map;
}

/**
 * Update annotation data to mark specific annotations as highlighted.
 */
export function highlightAnnotations(
  annotations: Immutable.Map<string, Slate.Annotation>,
  annotationIris: ReadonlySet<string>
): Immutable.Map<string, Slate.Annotation> {
  return mapAnnotations(annotations, (data) => {
    const iri = AnnotationData.get(data, 'iri');
    const highlighted = AnnotationData.get(data, 'highlighted');
    const isTarget = annotationIris.has(iri.value);
    return isTarget === Boolean(highlighted) ? data : AnnotationData.set(data, { highlighted: isTarget });
  });
}

/**
 * Remove an annotation from the annotations map.
 */
export function deleteAnnotation(
  annotations: Immutable.Map<string, Slate.Annotation>,
  annotationIri: Rdf.Iri
): Immutable.Map<string, Slate.Annotation> {
  return annotations.filter((annotation) => {
    const data = annotation.data as AnnotationData;
    const iri = AnnotationData.get(data, 'iri');
    return !iri.equals(annotationIri);
  }) as Immutable.Map<string, Slate.Annotation>;
}

/**
 * Map over annotation data in the annotations map.
 * If mapper returns null, the annotation is removed.
 */
function mapAnnotations(
  annotations: Immutable.Map<string, Slate.Annotation>,
  mapper: (data: AnnotationData) => AnnotationData | null
): Immutable.Map<string, Slate.Annotation> {
  return annotations
    .map((annotation) => {
      const data = annotation.data as AnnotationData;
      const mappedData = mapper(data);
      if (mappedData === null) {
        return null;
      }
      if (mappedData === data) {
        return annotation;
      }
      return annotation.setProperties({ key: annotation.key, type: annotation.type, data: mappedData }) as Slate.Annotation;
    })
    .filter((annotation) => annotation !== null) as Immutable.Map<string, Slate.Annotation>;
}

export function createDecorationsForRange(
  doc: Slate.Document,
  range: Slate.Range,
  markType: string
): Immutable.List<Slate.Decoration> {
  // split range into separate decoration for each text to avoid
  // marking the whole block when selection crosses block boundaries
  return doc.getTextsAtRange(range).map((text) => {
    if (range.start.isInNode(text) || range.end.isInNode(text)) {
      return Slate.Decoration.create({
        anchor: range.start.isInNode(text) ? range.start : range.start.moveToStartOfNode(text).normalize(doc),
        focus: range.end.isInNode(text) ? range.end : range.end.moveToEndOfNode(text).normalize(doc),
        type: markType,
      });
    } else {
      const path = doc.getPath(text.key) as Immutable.List<number>;
      const start = Slate.Point.create({ key: text.key, path, offset: 0 });
      return Slate.Decoration.create({
        anchor: start,
        focus: start.moveToEndOfNode(text).normalize(doc),
        type: markType,
      });
    }
  });
}

export function setValueProps(
  value: Slate.Value,
  props: {
    document?: Slate.Document;
    selection?: Slate.Selection;
    annotations?: Immutable.Map<string, Slate.Annotation>;
  }
) {
  const {
    document = value.document,
    selection = value.selection,
    annotations = value.annotations,
  } = props;
  return Slate.Value.create({ document, selection, annotations });
}

/**
 * Sort schema annotations by the order they first appear in the annotations map.
 */
export function sortAnnotationsByFirstOccurence(
  slateAnnotations: Immutable.Map<string, Slate.Annotation>,
  schemaAnnotations: ReadonlyArray<Schema.Annotation>
): Schema.Annotation[] {
  // Build order map from slate annotations (first key wins for each iri)
  const order = new Map<string, number>();
  let counter = 0;
  slateAnnotations.forEach((annotation) => {
    const data = annotation.data as AnnotationData;
    const iri = AnnotationData.get(data, 'iri');
    if (!order.has(iri.value)) {
      order.set(iri.value, counter++);
    }
  });
  const result = [...schemaAnnotations];
  result.sort((a, b) => {
    const i = order.get(a.iri.value);
    const j = order.get(b.iri.value);
    return i < j ? -1 : i > j ? 1 : 0;
  });
  return result;
}

/**
 * Update annotation data for a specific annotation IRI.
 */
export function updateAnnotation(
  annotations: Immutable.Map<string, Slate.Annotation>,
  target: Rdf.Iri,
  annotation: Schema.Annotation
): Immutable.Map<string, Slate.Annotation> {
  return mapAnnotations(annotations, (data) => {
    const iri = AnnotationData.get(data, 'iri');
    return iri.equals(target) ? AnnotationData.set(data, { iri: annotation.iri, bodyType: annotation.bodyType }) : data;
  });
}

export function extractTextFragment(doc: Slate.Document, range: Slate.Range): string {
  return doc
    .getFragmentAtRange(range)
    .getBlocks()
    .map((b) => b.text)
    .join(' ');
}
