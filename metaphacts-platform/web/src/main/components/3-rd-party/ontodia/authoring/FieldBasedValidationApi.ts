/*
 * Copyright (C) 2015-2019, metaphacts GmbH
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

import {
  ValidationApi, ElementError, LinkTypeIri, PropertyTypeIri, ElementTypeIri,
  LinkModel, LinkError, ValidationEvent, Element, DiagramModel,
} from 'ontodia';

import * as Kefir from 'kefir';
import * as SparqlJs from 'sparqljs';

import { Rdf } from 'platform/api/rdf';
import { xsd } from 'platform/api/rdf/vocabularies';
import { SparqlClient, SparqlUtil } from 'platform/api/sparql';

import {
  FieldValue, FieldDefinition, checkCardinalityAndDuplicates, CompositeValue, ErrorKind
} from 'platform/components/forms';
import { collectErrors } from 'platform/components/forms/static/FormErrors';
import { tryBeginValidation } from 'platform/components/forms/FormModel';

import { EntityMetadata } from './OntodiaEntityMetadata';
import {
  fetchInitialModel, getEntityMetadata, applyEventsToCompositeValue
} from './OntodiaPersistenceCommon';

export class FieldBasedValidationApi implements ValidationApi {
  constructor(private entityMetadata: Map<string, EntityMetadata>) {}

  validate(e: ValidationEvent): Promise<Array<ElementError | LinkError>> {
    const {target, state, outboundLinks, model} = e;
    const metadata = getEntityMetadata(target, this.entityMetadata);
    const linkByType = new Map<LinkTypeIri, LinkModel[]>();
    const errors: (ElementError | LinkError)[] = [];

    if (metadata === undefined && state.elements.has(target.id)) {
      errors.push({
        type: 'element',
        target: target.id,
        message: `Metadata are not defined for the '${target.types}' types`,
      });
      return Promise.resolve(errors);
    }

    const checkLinksStreams: Promise<void>[] = [];
    // Validate related links
    outboundLinks.forEach(linkModel => {
      if (!linkByType.has(linkModel.linkTypeId)) { linkByType.set(linkModel.linkTypeId, []) }
      linkByType.get(linkModel.linkTypeId).push(linkModel);

      const definition = metadata.fieldByIri.get(linkModel.linkTypeId);
      if (definition) {
        const checkDomainPromise =
          oneOfCheckedTypeAreDescendantOrEqual(definition.domain, target.types).then(
            meetsDomainLimitation => {
              if (!meetsDomainLimitation) {
                const domainStr = definition.domain.map(({value}) => value).join(', ');
                errors.push({
                  type: 'link',
                  target: linkModel,
                  message: `The source element should have one of the types '${domainStr}'`,
                });
              }
            }
          );
        checkLinksStreams.push(checkDomainPromise);

        const linkTarget = getTargetOfLinkModel(model, linkModel);
        if (linkTarget) {
          const checkRangePromise =
            oneOfCheckedTypeAreDescendantOrEqual(definition.range, linkTarget.data.types).then(
              meetsRangeLimitation => {
                if (!meetsRangeLimitation) {
                  const rangeStr = definition.range.map(({value}) => value).join(', ');
                  errors.push({
                    type: 'link',
                    target: linkModel,
                    message: `The target element should have one of the types '${rangeStr}'`,
                  });
                }
              }
            );
          checkLinksStreams.push(checkRangePromise);
        }
      }
    });

    const domainRangePromise = Promise.all(checkLinksStreams);

    // Validate related elements
    const compositeStream = fetchInitialModel(Rdf.iri(target.id), metadata).map(initialModel =>
      applyEventsToCompositeValue({
        elementIri: target.id,
        state,
        metadata,
        initialModel,
      })
    );

    const streamsOfChanges = compositeStream.map(composite => {
      if (FieldValue.isEmpty(composite)) {
        return [];
      }

      const emptyComposite = CompositeValue.set(composite, {
        errors: composite.errors.clear(),
        fields: composite.fields.clear(),
      })

      return composite.fields.map((fieldState, fieldId) => {
        const definition = composite.definitions.get(fieldId);
        if (!definition) { return; }

        return tryBeginValidation(
          definition,
          emptyComposite,
          composite
        );
      }).filter(stream => Boolean(stream)).toArray();
    });

    const changesStreams = streamsOfChanges.flatMap(change => {
      if (change.length === 0) {
        return Kefir.constant([]);
      } else {
        const zippedChanges = Kefir.zip(change);
        return zippedChanges;
      }
    });

    const releveantCompositeStream = Kefir.combine([compositeStream, changesStreams]).map(([composite, changesStreams]) => {
      if (FieldValue.isEmpty(composite)) {
        return undefined;
      }
      let validated = composite;
      for (const change of changesStreams) {
          validated = change(validated);
      }
      return validated;
    });

    const relatedElementsPromise = releveantCompositeStream.map(relevantComposit => {
      if (relevantComposit) {
        const collectedErrors: CollectedError[] = [];
        collectErrors([], relevantComposit, collectedErrors);

        collectedErrors.forEach(({message, path}) => {
          errors.push({
            type: 'element',
            target: target.id,
            message: message,
            propertyType: path.join('/') as PropertyTypeIri,
          });
        });

        relevantComposit.fields.forEach((fieldState, fieldId) => {
          const definition = relevantComposit.definitions.get(fieldId);
          checkCardinalityAndDuplicates(fieldState.values, definition).forEach(({message}) => {
            if (isLinkTypeDefinition(definition)) {
              const links = linkByType.get(definition.iri as LinkTypeIri);
              if (links) {
                links.forEach(link => {
                  errors.push({
                    type: 'link',
                    target: link,
                    message,
                  });
                })
              }
            }
            errors.push({
              type: 'element',
              target: target.id,
              message,
              propertyType: definition.iri as PropertyTypeIri,
            });
          });
        });
      }
      return errors;
    }).toPromise();

    return domainRangePromise.then(() => {
      return relatedElementsPromise;
    }).catch(e => {
      const error: ElementError = {
        type: 'element',
        target: target.id,
        message:  `Next error has appeared during the validation process: ${e.message}`,
      }
      return [error];
    });
  }
}

interface CollectedError {
  readonly path: ReadonlyArray<string>;
  readonly kind: ErrorKind;
  readonly message: string;
}

function isLinkTypeDefinition(definition: FieldDefinition) {
  return xsd.anyURI.equals(definition.xsdDatatype);
}

function getTargetOfLinkModel(model: DiagramModel, linkModel: LinkModel): Element | undefined {
  const link = model.links.find(link => link.data === linkModel);
  if (link) {
    return model.targetOf(link);
  } else {
    return undefined;
  }
}

export function oneOfCheckedTypeAreDescendantOrEqual(
  targetTypeIris: ReadonlyArray<Rdf.Iri>,
  availableTypes: ElementTypeIri[]
): Promise<boolean> {
  const queryStr = `ASK WHERE {
    ?domain rdfs:subClassOf* ?targetDomain .
  }`;
  let query: SparqlJs.AskQuery = SparqlUtil.parseQuerySync<SparqlJs.AskQuery>(queryStr);

  query = SparqlClient.prepareParsedQuery(
    targetTypeIris.map(targetTypeIri => ({'targetDomain': targetTypeIri}))
  )(query);
  query = SparqlClient.prepareParsedQuery(
    availableTypes.map(type => ({'domain': Rdf.iri(type)}))
  )(query) as SparqlJs.AskQuery;

  return SparqlClient.ask(query).toPromise();
}
