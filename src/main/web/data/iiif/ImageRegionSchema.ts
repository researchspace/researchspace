/**
 * ResearchSpace
 * Copyright (C) 2022-2024, © Kartography Community Interest Company
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
    $subject <http://www.cidoc-crm.org/cidoc-crm/P190_has_symbolic_content> $value .
  } WHERE {}`,
  selectPattern: `SELECT ?value WHERE {
    $subject <http://www.cidoc-crm.org/cidoc-crm/P190_has_symbolic_content> ?value .
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
    $subject <http://www.cidoc-crm.org/extensions/crmdig/L49_is_primary_area_of> $value .
  } WHERE {}`,
  selectPattern: `SELECT ?value WHERE {
    $subject <http://www.cidoc-crm.org/extensions/crmdig/L49_is_primary_area_of> ?value .
  }`,
});

//category the P2_type for SamplingSite
export const ImageRegionRepresentsSamplingSite = Forms.normalizeFieldDefinition({
  id: 'represents',
  xsdDatatype: vocabularies.xsd.anyURI,
  range: '[ "http://www.cidoc-crm.org/cidoc-crm/E26_Physical_Feature", "http://www.researchspace.org/resource/system/vocab/resource_type/sampling_site"]',
  insertPattern: `INSERT {
    $subject <http://www.cidoc-crm.org/cidoc-crm/P138_represents> ?samplingSite .
    ?samplingSite <http://www.cidoc-crm.org/cidoc-crm/P138i_has_representation> $subject .
    $subject <http://www.researchspace.org/ontology/PX_main_represents> ?samplingSite .
    ?samplingSite <http://www.researchspace.org/ontology/PX_has_main_representation> $subject .

    ?samplingSite crm:P56i_is_found_on ?objectSampled . 
    ?objectSampled crm:P56_bears_feature ?samplingSite . 

    ?samplingSite a <http://www.cidoc-crm.org/cidoc-crm/E26_Physical_Feature> .
    ?samplingSite crm:P2_has_type <http://www.researchspace.org/resource/system/vocab/resource_type/sampling_site> .

    ?sampleTaking a <http://www.cidoc-crm.org/extensions/crmsci/S2_Sample_Taking> .
    ?samplingSite crmsci:O3i_was_sample_by ?sampleTaking .
    ?sampleTaking crmsci:O3_sampled_from ?samplingSite .

    ?sampleTaking crmsci:O5_removed ?sample .
    ?sample crmsci:O5i_was_removed_by ?sampleTaking . 
                   
    ?sample a <http://www.cidoc-crm.org/extensions/crmsci/S13_Sample> .
    ?sample crm:P2_has_type <http://www.researchspace.org/resource/system/vocab/resource_type/heritage_sample> .

    ?samplingSite crm:P156_occupies ?samplingPlace .
    ?samplingPlace crm:P156i_is_occupied_by ?samplingSite .
      
    ?sampleTaking crmsci:O4_sampled_at ?samplingPlace .
    ?samplingPlace crmsci:O4i_was_sampling_location_of ?sampleTaking .
    ?samplingPlace a crm:E53_Place .

    ?samplingSite crm:P1_is_identified_by ?samplingSiteAppellation . 
    ?samplingSiteAppellation a crm:E41_Appellation . 
    ?samplingSiteAppellation crm:P2_has_type <http://www.researchspace.org/resource/system/vocab/resource_type/primary_appellation> . 
    ?samplingSiteAppellation crm:P190_has_symbolic_content ?samplingSiteLabel .

    ?samplingPlace crm:P1_is_identified_by ?samplingPlaceAppellation . 
    ?samplingPlaceAppellation a crm:E41_Appellation . 
    ?samplingPlaceAppellation crm:P2_has_type <http://www.researchspace.org/resource/system/vocab/resource_type/primary_appellation> . 
    ?samplingPlaceAppellation crm:P190_has_symbolic_content ?samplingPlaceLabel .

    ?sample crm:P1_is_identified_by ?sampleAppellation . 
    ?sampleAppellation a crm:E41_Appellation . 
    ?sampleAppellation crm:P2_has_type <http://www.researchspace.org/resource/system/vocab/resource_type/primary_appellation> . 
    ?sampleAppellation crm:P190_has_symbolic_content ?sampleLabel .

    ?sampleTaking crm:P1_is_identified_by ?sampleTakingAppellation . 
    ?sampleTakingAppellation a crm:E41_Appellation . 
    ?sampleTakingAppellation crm:P2_has_type <http://www.researchspace.org/resource/system/vocab/resource_type/primary_appellation> . 
    ?sampleTakingAppellation crm:P190_has_symbolic_content ?sampleTakingLabel .
  
  } WHERE {
      BIND(REPLACE(REPLACE(STR(?value), "%20", " "),"%2F", "/") AS ?decoded)
      BIND(STR(?decoded) as ?iriStr)
      FILTER(CONTAINS(?iriStr, "/annotation_label/"))
      BIND(IRI(REPLACE(?iriStr, "^(.*)/annotation_label/.*$", "$1")) AS ?annotationIri)
      BIND(REPLACE(?iriStr, "^.*/annotation_label/(.*)$", "$1") AS ?annotationLabel)

      ?annotationIri rso:PX_main_represents ?objectSampled .

      BIND(IRI(CONCAT(STR($subject),"/sampling_site/",STRUUID())) as ?samplingSite)  
      BIND(URI(CONCAT(STR(?samplingSite),"/place/", STRUUID())) as ?samplingPlace)
      BIND(IRI(CONCAT(STR(?samplingSite),"/sample_taking/",STRUUID())) as ?sampleTaking)
      BIND(IRI(CONCAT(STR(?sampleTaking),"/sample/",STRUUID())) as ?sample)
     
      BIND(CONCAT(STR(?annotationLabel)," Sampling Site") as ?samplingSiteLabel)   
      BIND(CONCAT(STR(?annotationLabel)," Sample Taking") as ?sampleTakingLabel)   
      BIND(CONCAT(STR(?annotationLabel)," Sample") as ?sampleLabel)   
      BIND(CONCAT(STR(?annotationLabel)," Sampling Place") as ?samplingPlaceLabel)

  	  BIND(URI(CONCAT(STR(?samplingSite), "/primary_appellation") ) as ?samplingSiteAppellation)
      BIND(URI(CONCAT(STR(?sampleTaking), "/primary_appellation") ) as ?sampleTakingAppellation)
      BIND(URI(CONCAT(STR(?sample), "/primary_appellation") ) as ?sampleAppellation)
      BIND(URI(CONCAT(STR(?samplingPlace), "/primary_appellation") ) as ?samplingPlaceAppellation)
    }`,
  selectPattern: `SELECT ?value WHERE {
    $subject <http://www.cidoc-crm.org/cidoc-crm/P138_represents> ?value .
    
  }`,
});

/* missing connection with the object or object part */
/* the subject is the image annotation and all the details of that are attached by the other KPs */
/* http://www.cidoc-crm.org/cidoc-crm/E22_Human-Made_Object */
/* http://www.researchspace.org/resource/system/vocab/resource_type/heritage_object */

/*  ?object crm:P56i_is_found_on ?samplingSite . */
/* ?samplingSite crm:P56_bears_feature ?object. */

/* http://www.cidoc-crm.org/cidoc-crm/E26_Physical_Feature */
/* http://www.researchspace.org/resource/system/vocab/resource_type/sampling_site */

/* ?samplingSite crmsci:O3i_was_sample_by ?sampleTaking */
/* ?sampleTaking crmsci:O3_sampled_from ?samplingSite  */

/* http://www.cidoc-crm.org/extensions/crmsci/S2_Sample_Taking */

/* ?sampleTaking crmsci:O5_removed ?sample . */
/* ?sample crmsci:O5i_was_removed_by ?sampleTaking . */

/* http://www.cidoc-crm.org/extensions/crmsci/S13_Sample */
/* http://www.researchspace.org/resource/system/vocab/resource_type/heritage_sample */

/* Add other potential knowledge patterns */

export const ImageRegionFields: ReadonlyArray<Forms.FieldDefinition> = [
  ImageRegionType,
  ImageRegionLabel,
  ImageRegionBoundingBox,
  ImageRegionValue,
  ImageRegionViewport,
  ImageRegionIsPrimaryAreaOf,
  ImageRegionRepresentsSamplingSite
];
