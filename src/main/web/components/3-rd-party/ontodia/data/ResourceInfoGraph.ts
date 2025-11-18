import { Rdf } from 'platform/api/rdf';

const RDFS_LABEL = 'http://www.w3.org/2000/01/rdf-schema#label';

interface ResourceInfoNode {
  '@id': string;
  label?: string;
  [key: string]: any;
}

function isResourceInfoNode(obj: any): obj is ResourceInfoNode {
  return obj && typeof obj === 'object' && '@id' in obj;
}

function processNode(node: ResourceInfoNode, triples: Rdf.Triple[], visited: Set<string>) {
  if (visited.has(node['@id'])) {
    return;
  }
  visited.add(node['@id']);

  const subject = Rdf.iri(node['@id']);

  if (node.label) {
    triples.push(Rdf.triple(subject, Rdf.iri(RDFS_LABEL), Rdf.literal(node.label)));
  }

  for (const key in node) {
    if (key === '@id' || key === 'label') {
      continue;
    }

    const property = node[key];
    if (isResourceInfoNode(property) && property.values && Array.isArray(property.values)) {
      const predicate = Rdf.iri(property['@id']);
      for (const value of property.values) {
        if (isResourceInfoNode(value)) {
          triples.push(Rdf.triple(subject, predicate, Rdf.iri(value['@id'])));
          processNode(value, triples, visited);
        } else if (value && typeof value === 'object' && '@value' in value) {
          triples.push(Rdf.triple(subject, predicate, Rdf.literal(value['@value'])));
        }
      }
    }
  }
}

export function jsonToTriples(json: any): Rdf.Triple[] {
  const triples: Rdf.Triple[] = [];
  if (!isResourceInfoNode(json)) {
    return triples;
  }

  const visited = new Set<string>();
  processNode(json, triples, visited);

  return triples;
}
