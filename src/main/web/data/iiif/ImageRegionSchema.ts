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

import { vocabularies } from 'platform/api/rdf';
import { rso } from '../vocabularies';

import * as Forms from 'platform/components/forms';

export const SubjectTemplate = `${rso.ImageRegion.value}/{{UUID}}`;

export const ImageRegionType = Forms.normalizeFieldDefinition({
  id: 'type',
  xsdDatatype: vocabularies.xsd._string,
  insertPattern: `INSERT { $subject a $value } WHERE {}`,
  selectPattern: `SELECT ?value WHERE { $subject a ?value }`,
});

export const ImageRegionLabel = Forms.normalizeFieldDefinition({
  id: 'label',
  xsdDatatype: vocabularies.xsd._string,
  insertPattern: `INSERT {
    $subject <http://www.researchspace.org/ontology/displayLabel> $value .
  } WHERE {}`,
  selectPattern: `SELECT ?value WHERE {
    $subject <http://www.researchspace.org/ontology/displayLabel> ?value .
  }`,
});

export const ImageRegionBoundingBox = Forms.normalizeFieldDefinition({
  id: 'boundingBox',
  xsdDatatype: vocabularies.xsd._string,
  insertPattern: `INSERT {
    $subject <http://www.researchspace.org/ontology/boundingBox> $value .
  } WHERE {}`,
  selectPattern: `SELECT ?value WHERE {
    $subject <http://www.researchspace.org/ontology/boundingBox> ?value .
  }`,
});

export const ImageRegionValue = Forms.normalizeFieldDefinition({
  id: 'value',
  xsdDatatype: vocabularies.xsd._string,
  insertPattern: `INSERT {
    $subject <http://www.w3.org/1999/02/22-rdf-syntax-ns#value> $value .
  } WHERE {}`,
  selectPattern: `SELECT ?value WHERE {
    $subject <http://www.w3.org/1999/02/22-rdf-syntax-ns#value> ?value .
  }`,
});

export const ImageRegionViewport = Forms.normalizeFieldDefinition({
  id: 'viewport',
  xsdDatatype: vocabularies.xsd._string,
  insertPattern: `INSERT {
    $subject <http://www.researchspace.org/ontology/viewport> $value .
  } WHERE {}`,
  selectPattern: `SELECT ?value WHERE {
    $subject <http://www.researchspace.org/ontology/viewport> ?value.
  }`,
});

export const ImageRegionIsPrimaryAreaOf = Forms.normalizeFieldDefinition({
  id: 'isPrimaryAreaOf',
  xsdDatatype: vocabularies.xsd.anyURI,
  insertPattern: `INSERT {
    $subject <http://www.ics.forth.gr/isl/CRMdig/L49_is_primary_area_of> $value .
  } WHERE {}`,
  selectPattern: `SELECT ?value WHERE {
    $subject <http://www.ics.forth.gr/isl/CRMdig/L49_is_primary_area_of> ?value .
  }`,
});

export const ImageRegionFields: ReadonlyArray<Forms.FieldDefinition> = [
  ImageRegionType,
  ImageRegionLabel,
  ImageRegionBoundingBox,
  ImageRegionValue,
  ImageRegionViewport,
  ImageRegionIsPrimaryAreaOf,
];
