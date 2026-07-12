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
/* WIP */
export const ImageRegionRepresentsVisualItem = Forms.normalizeFieldDefinition({
  id: 'representsVisualItem',
  xsdDatatype: vocabularies.xsd.anyURI,
  range: '[ "http://www.cidoc-crm.org/cidoc-crm/E26_Physical_Feature", "http://www.cidoc-crm.org/cidoc-crm/E36_Visual_Item", "http://www.cidoc-crm.org/cidoc-crm/E37_Mark", "http://www.cidoc-crm.org/cidoc-crm/E34_Inscription"]',
  insertPattern: `INSERT {
    $subject <http://www.cidoc-crm.org/cidoc-crm/P138_represents> ?physicalFeature .
    ?physicalFeature <http://www.cidoc-crm.org/cidoc-crm/P138i_has_representation> $subject .

    $subject <http://www.researchspace.org/ontology/PX_main_represents> ?physicalFeature .
    ?physicalFeature <http://www.researchspace.org/ontology/PX_has_main_representation> $subject .

    $subject <http://www.cidoc-crm.org/cidoc-crm/P138_represents> ?visualItem .
    ?visualItem <http://www.cidoc-crm.org/cidoc-crm/P138i_has_representation> $subject .

    $subject <http://www.researchspace.org/ontology/PX_main_represents> ?visualItem .
    ?visualItem <http://www.researchspace.org/ontology/PX_has_main_representation> $subject .


    ?visualItem a ?rdfType .
    ?visualItem crm:P2_has_type ?p2Type .

    ?visualItem crm:P1_is_identified_by ?visualItemAppellation . 
    ?visualItemAppellation a crm:E41_Appellation . 
    ?visualItemAppellation crm:P2_has_type <http://www.researchspace.org/resource/system/vocab/resource_type/primary_appellation> . 
    ?visualItemAppellation crm:P190_has_symbolic_content ?visualItemLabel .

    # if an object is specified create a physical feature and connect the visual item to it
    ?objectIri crm:P56_bears_feature ?physicalFeature .
    ?physicalFeature crm:P56i_is_found_on ?objectIri .

    ?objectIri crm:P65_shows_visual_item ?visualItem .
    ?visualItem crm:P65i_is_shown_by ?objectIri .

    ?pc130_shows_features_of a crm:PC130_shows_features_of .
    ?physicalFeature crm:P02i_is_range_of ?pc130_shows_features_of .
    ?pc130_shows_features_of crm:P02_has_range ?physicalFeature .

    ?pc130_shows_features_of crm:P01_has_domain ?visualItem .
    ?visualItem crm:P01i_is_domain_of ?pc130_shows_features_of .

    ?physicalFeature a crm:E26_Physical_Feature .
    ?physicalFeature crm:P1_is_identified_by ?physicalFeatureAppellation . 
    ?physicalFeatureAppellation a crm:E41_Appellation . 
    ?physicalFeatureAppellation crm:P2_has_type <http://www.researchspace.org/resource/system/vocab/resource_type/primary_appellation> . 
    ?physicalFeatureAppellation crm:P190_has_symbolic_content ?physicalFeatureLabel .

  } WHERE { 
      BIND(STR(?value) AS ?encoded)
      
      FILTER(CONTAINS(?encoded, "&rdfType="))
      BIND(IRI(REPLACE(?encoded, "^.*&rdfType=([^&]*)&.*$", "$1")) AS ?rdfType)

      OPTIONAL {
        FILTER(CONTAINS(?encoded, "&p2Type="))
        BIND(IRI(REPLACE(?encoded, "^.*&p2Type=([^&]*)&.*$", "$1")) AS ?p2Type)
      }

      OPTIONAL {
        FILTER(CONTAINS(?encoded, "&objectIri="))
        BIND(IRI(REPLACE(?encoded, "^.*&objectIri=([^&]*)&.*$", "$1")) AS ?objectIri)
        # specify the physical feature and connection to the object
        BIND(IRI(CONCAT(STR(?objectIri), "/physical_feature/", STRUUID())) AS ?physicalFeature)
        BIND(IRI(CONCAT(STR(?physicalFeature), "/primary_appellation")) AS ?physicalFeatureAppellation)
        BIND(IRI(CONCAT(STR(?physicalFeature), "/PC130_shows_features_of/",STRUUID())) AS ?pc130_shows_features_of)     
      }

      FILTER(CONTAINS(?encoded, "&annotationLabel="))
      BIND(REPLACE(?encoded, "^.*&annotationLabel=([^&]*)&.*$", "$1") AS ?encodedAnnotationLabel)
  
      BIND(REPLACE(STR(?encodedAnnotationLabel), "%20", " ") AS ?annotationLabel)
      BIND(CONCAT("Physical Feature: ",?annotationLabel) as ?physicalFeatureLabel)
     
      OPTIONAL {
        FILTER(!CONTAINS(?encoded,"E26_Physical_Feature"))
        BIND(IRI(CONCAT(STR($subject),"/visual_item/",STRUUID())) as ?visualItem)  
      }
      
      BIND(IRI(CONCAT(STR(?visualItem),"/primary_appellation",STRUUID())) as ?visualItemAppellation)
      BIND(CONCAT(STRAFTER(STR(?rdfType),"_"),": ",?annotationLabel) as ?visualItemLabel)
    }`,
  selectPattern: `SELECT ?value WHERE {
    $subject <http://www.cidoc-crm.org/cidoc-crm/P138_represents> ?value .
  }`,
});
//category the P2_type for SamplingSite
export const ImageRegionRepresentsSamplingSite = Forms.normalizeFieldDefinition({
  id: 'representsSamplingActivity',
  domain:'http://www.cidoc-crm.org/cidoc-crm/E7_Activity',
  xsdDatatype: vocabularies.xsd.anyURI,
  range: '["http://www.cidoc-crm.org/cidoc-crm/E26_Physical_Feature","http://www.researchspace.org/resource/system/vocab/resource_type/sampling_site"]',
  insertPattern: `INSERT {
    $subject <http://www.cidoc-crm.org/cidoc-crm/P138_represents> ?samplingSite .
    ?samplingSite <http://www.cidoc-crm.org/cidoc-crm/P138i_has_representation> $subject .
    $subject <http://www.researchspace.org/ontology/PX_main_represents> ?samplingSite .
    ?samplingSite <http://www.researchspace.org/ontology/PX_has_main_representation> $subject .

    ?samplingSite crm:P56i_is_found_on ?objectSampled . 
    ?objectSampled crm:P56_bears_feature ?samplingSite . 

    ?sampleTaking crm:P9i_forms_part_of ?activityIri .
    ?activityIri crm:P9_consists_of ?sampleTaking .

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
    ?samplingPlace crm:P2_has_type <http://www.researchspace.org/resource/system/vocab/resource_type/sampling_place> .

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
      BIND(STR(?decoded) as ?decodedStr)

      FILTER(CONTAINS(?decodedStr, "/activity_iri/"))
      # determine examination iri
      BIND(
        STRBEFORE(?decodedStr, "/activity_iri/")
        AS ?iriStr
      )

      BIND(
        IRI(STRAFTER(?decodedStr, "/activity_iri/"))
        AS ?activityIri
      )

      FILTER(CONTAINS(?iriStr, "/annotation_label/"))
      BIND(IRI(REPLACE(?iriStr, "^(.*)/annotation_label/.*$", "$1")) AS ?annotationIri)
      BIND(REPLACE(?iriStr, "^.*/annotation_label/(.*)$", "$1") AS ?annotationLabel)

      ?activityIri crm:P16_used_specific_object ?objectSampled .

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

export const ImageRegionRepresentsXRFMeasurement = Forms.normalizeFieldDefinition({
  id: 'representsXRFMeasurement',
  xsdDatatype: vocabularies.xsd.anyURI,
  range: '[ "http://www.cidoc-crm.org/cidoc-crm/extensions/crmdig/D11_Digital_Measurement_Event", "http://www.researchspace.org/resource/system/vocab/resource_type/measurement_xrf"]',
  insertPattern: `INSERT {
    $subject <http://www.cidoc-crm.org/cidoc-crm/P138_represents> ?measurement .
    ?measurement <http://www.cidoc-crm.org/cidoc-crm/P138i_has_representation> $subject .
    $subject <http://www.researchspace.org/ontology/PX_main_represents> ?measurement .
    ?measurement <http://www.researchspace.org/ontology/PX_has_main_representation> $subject .

    ?measurement crm:P9i_forms_part_of ?examinationIri . 
    ?examinationIri crm:P9_consists_of ?measurement . 

    ?measurement a <http://www.cidoc-crm.org/extensions/crmdig/D11_Digital_Measurement_Event> .
    ?measurement crm:P2_has_type <http://www.researchspace.org/resource/system/vocab/resource_type/measurement_xrf> .

    ?measurement crm:P1_is_identified_by ?measurementAppellation . 
    ?measurementAppellation a crm:E41_Appellation . 
    ?measurementAppellation crm:P2_has_type <http://www.researchspace.org/resource/system/vocab/resource_type/primary_appellation> . 
    ?measurementAppellation crm:P190_has_symbolic_content ?measurementLabel .
  } WHERE {
      BIND(REPLACE(REPLACE(STR(?value), "%20", " "),"%2F", "/") AS ?decoded)
      BIND(STR(?decoded) as ?decodedStr)

      FILTER(CONTAINS(?decodedStr, "/examination_iri/"))
      # determine examination iri
      BIND(
        STRBEFORE(?decodedStr, "/examination_iri/")
        AS ?iriStr
      )

      BIND(
        IRI(STRAFTER(?decodedStr, "/examination_iri/"))
        AS ?examinationIri
      )

      FILTER(CONTAINS(?iriStr, "/annotation_label/"))
      BIND(IRI(REPLACE(?iriStr, "^(.*)/annotation_label/.*$", "$1")) AS ?annotationIri)
      BIND(REPLACE(?iriStr, "^.*/annotation_label/(.*)$", "$1") AS ?annotationLabel)

      BIND(IRI(CONCAT(STR(?examinationIri),"/measurement/",STRUUID())) as ?measurement)           
  	  BIND(URI(CONCAT(STR(?measurement), "/primary_appellation") ) as ?measurementAppellation)
      BIND(CONCAT("XRF Measurement: "," ",?annotationLabel) as ?measurementLabel)
    }`,
  selectPattern: `SELECT ?value WHERE {
    $subject <http://www.cidoc-crm.org/cidoc-crm/P138_represents> ?value .
    
  }`,
});

export const ImageRegionRepresentsDigitalMeasurement = Forms.normalizeFieldDefinition({
  id: 'representsDigitalMeasurement',
  xsdDatatype: vocabularies.xsd.anyURI,
  range: '[ "http://www.cidoc-crm.org/extensions/crmdig/D11_Digital_Measurement_Event", "http://www.researchspace.org/resource/system/vocab/resource_type/measurement_xrf","http://www.researchspace.org/resource/system/vocab/resource_type/measurement_ftir", "http://www.researchspace.org/resource/system/vocab/resource_type/measurement_mft"]',
  insertPattern: `INSERT {
    $subject <http://www.cidoc-crm.org/cidoc-crm/P138_represents> ?measurement .
    ?measurement <http://www.cidoc-crm.org/cidoc-crm/P138i_has_representation> $subject .
    $subject <http://www.researchspace.org/ontology/PX_main_represents> ?measurement .
    ?measurement <http://www.researchspace.org/ontology/PX_has_main_representation> $subject .

    ?measurement crm:P9i_forms_part_of ?examinationIri . 
    ?examinationIri crm:P9_consists_of ?measurement . 

    # Measurement on Full Object
    ?measurement crmsci:O24_measured ?fullObjectIri .
    ?fullObjectIri crmsci:O24i_was_measured_by ?measurement .

    # Measurement on Physical Feature
    ?measurement crmsci:O24_measured ?physicalFeature .
    ?physicalFeature crmsci:O24i_was_measured_by ?measurement .

    ?physicalFeature a crm:E26_Physical_Feature .
    ?physicalFeature crm:P2_has_type <http://www.researchspace.org/resource/system/vocab/resource_type/measurement_site> .
    ?physicalFeature crm:P56i_is_found_on ?objectIri .
    ?objectIri crm:P56_bears_feature ?physicalFeature .

    $subject <http://www.cidoc-crm.org/cidoc-crm/P138_represents> ?physicalFeature .
    ?physicalFeature <http://www.cidoc-crm.org/cidoc-crm/P138i_has_representation> $subject .
    $subject <http://www.researchspace.org/ontology/PX_main_represents> ?physicalFeature .
    ?physicalFeature <http://www.researchspace.org/ontology/PX_has_main_representation> $subject .


    ?physicalFeature crm:P1_is_identified_by ?physicalFeatureAppellation .
    ?physicalFeatureAppellation a crm:E41_Appellation .
    ?physicalFeatureAppellation crm:P2_has_type <http://www.researchspace.org/resource/system/vocab/resource_type/primary_appellation> . 
    ?physicalFeatureAppellation crm:P190_has_symbolic_content ?physicalFeatureLabel .
    
    ?measurement a ?rdfType .
    ?measurement crm:P2_has_type ?p2Type .

    ?measurement crm:P1_is_identified_by ?measurementAppellation . 
    ?measurementAppellation a crm:E41_Appellation . 
    ?measurementAppellation crm:P2_has_type <http://www.researchspace.org/resource/system/vocab/resource_type/primary_appellation> . 
    ?measurementAppellation crm:P190_has_symbolic_content ?measurementLabel .
  } WHERE {
      BIND(STR(?value) AS ?encoded)
      
      FILTER(CONTAINS(?encoded, "&rdfType="))
      BIND(IRI(REPLACE(?encoded, "^.*&rdfType=([^&]*)&.*$", "$1")) AS ?rdfType)

      OPTIONAL {
        FILTER(CONTAINS(?encoded, "&p2Type="))
        BIND(IRI(REPLACE(?encoded, "^.*&p2Type=([^&]*)&.*$", "$1")) AS ?p2Type)
      }
      
      OPTIONAL {
        FILTER(CONTAINS(?encoded, "&examinationIri="))
        BIND(IRI(REPLACE(?encoded, "^.*&examinationIri=([^&]*)&.*$", "$1")) AS ?examinationIri)
      }

      OPTIONAL {
        FILTER(CONTAINS(?encoded, "&objectIri="))
        BIND(IRI(REPLACE(?encoded, "^.*&objectIri=([^&]*)&.*$", "$1")) AS ?objectIri)
      }

      OPTIONAL {
        FILTER(CONTAINS(?encoded, "&measurementOnFullObject="))
        BIND(REPLACE(?encoded, "^.*&measurementOnFullObject=([^&]*)&.*$", "$1") AS ?measurementOnFullObject)
        FILTER(CONTAINS(?encoded, "&objectIri="))
        BIND(IRI(REPLACE(?encoded, "^.*&objectIri=([^&]*)&.*$", "$1")) AS ?fullObjectIri)  
      }

      OPTIONAL {
        FILTER(CONTAINS(?encoded, "&measurementOnObjectPhysicalFeature="))
        BIND(REPLACE(?encoded, "^.*&measurementOnObjectPhysicalFeature=([^&]*)&.*$", "$1") AS ?measurementOnObjectPhysicalFeature)
        FILTER(CONTAINS(?encoded, "&objectIri="))
        BIND(IRI(REPLACE(?encoded, "^.*&objectIri=([^&]*)&.*$", "$1")) AS ?objectIri)
        BIND(IRI(CONCAT(STR(?objectIri), "/physical_feature/", STRUUID())) AS ?physicalFeature)
        BIND(IRI(CONCAT(STR(?physicalFeature), "/primary_appellation")) AS ?physicalFeatureAppellation)
      }

      OPTIONAL {
        FILTER(CONTAINS(?encoded, "&measurementOnObjectSample="))
        BIND(REPLACE(?encoded, "^.*&measurementOnObjectSample=([^&]*)&.*$", "$1") AS ?measurementOnObjectSample)
      }

      FILTER(CONTAINS(?encoded, "&annotationLabel="))
      BIND(REPLACE(?encoded, "^.*&annotationLabel=([^&]*)&.*$", "$1") AS ?encodedAnnotationLabel)
  
      BIND(REPLACE(STR(?encodedAnnotationLabel), "%20", " ") AS ?annotationLabel)
      BIND(CONCAT("Physical Feature: ",?annotationLabel) as ?physicalFeatureLabel)
      BIND(STRBEFORE(?encoded,"&annotationLabel=") as ?iriStr)

      BIND(IRI(?iriStr) AS ?annotationIri)     
      BIND(IRI(CONCAT(STR(?examinationIri),"/measurement/",STRUUID())) as ?measurement)           
  	  BIND(URI(CONCAT(STR(?measurement), "/primary_appellation") ) as ?measurementAppellation)
      BIND(CONCAT("Digital Measurement: ",?annotationLabel) as ?measurementLabel)
    }`,
  selectPattern: `SELECT ?value WHERE {
    $subject <http://www.cidoc-crm.org/cidoc-crm/P138_represents> ?value .
    
  }`,
});

// TODO
// Add representation for Measurement, Mark, Visual Item, and Feature and what else Person, etc.
// How do we model this can we just model it generically and say represents and if one of these other semantic annotation modes it uses the ImageRegionRepresentsEntity?!


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
  ImageRegionRepresentsSamplingSite,
  ImageRegionRepresentsDigitalMeasurement,
  ImageRegionRepresentsVisualItem
];
