/** Copyright (c) 2026 ResearchSpace contributors. SPDX-License-Identifier: AGPL-3.0-or-later */

import { Rdf } from 'platform/api/rdf';

/** Apply an explicitly requested standalone view while retaining the resource context. */
export function getResourcePageView(resource: Rdf.Iri, params: { [key: string]: string }): {
  iri: Rdf.Iri;
  context?: Rdf.Iri;
  params: { [key: string]: string };
} {
  // Existing resource URLs and ThinkingFrames URLs retain their original behavior.
  if (params.resourceView !== 'page' || !params.resourceVisualisationTemplate) {
    return { iri: resource, params };
  }
  return {
    iri: Rdf.iri(params.resourceVisualisationTemplate),
    context: resource,
    params: {
      ...params,
      // Both URL forms (prefixed path and ?uri=...) must give headers the entity.
      uri: resource.value,
      resourceIri: resource.value,
      context: resource.value,
      // The server's urlParam helper treats a nonempty "false" as truthy.
      frame: '',
    },
  };
}
