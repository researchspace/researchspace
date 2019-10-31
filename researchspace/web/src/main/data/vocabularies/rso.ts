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

import { Rdf } from 'platform/api/rdf';

module rso {
  export const _NAMESPACE = 'http://www.researchspace.org/ontology/';
  export const iri = (s: string) => Rdf.iri(_NAMESPACE + s);

  export const targetsRecord = iri('targetsRecord');
  export const targetsField = iri('targetsField');
  export const displayLabel = iri('displayLabel');

  export const PX_asserts = iri('PX_asserts');
  export const PX_asserts_value = iri('PX_asserts_value');
  export const PX_adopted_assertion = iri('PX_adopted_assertion');
  export const PX_is_canonical_value = iri('PX_is_canonical_value');
  export const PX_premise_assertion = iri('PX_premise_assertion');
  export const PX_premise_target = iri('PX_premise_target');
  export const PX_premise_field = iri('PX_premise_field');
  export const PX_premise_target_repository = iri('PX_premise_target_repository');

  export const Alignment = iri('Alignment');
  export const PX_source_terminology = iri('PX_source_terminology');
  export const PX_target_terminology = iri('PX_target_terminology');
  export const PX_exact_match = iri('PX_exact_match');
  export const PX_narrow_match = iri('PX_narrow_match');
  export const PX_match_target = iri('PX_match_target');
  export const PX_match_excludes = iri('PX_match_excludes');

  export const Thing = iri('Thing');
  export const EX_Assertion = iri('EX_Assertion');
  export const EX_Digital_Image = iri('EX_Digital_Image');
  export const EX_Digital_Image_Region = iri('EX_Digital_Image_Region');
  export const viewport = iri('viewport');

  export const AlignmentContainer = iri('Alignment.Container');
  export const AnnotationsContainer = iri('Annotations.Container');
  export const PropositionsContainer = iri('Propositions.Container');
  export const AssertionsContainer = iri('Assertions.Container');
  export const ArgumentsContainer = iri('Arguments.Container');
  export const ImageRegionContainer = iri('ImageRegions.Container');
  export const UserDefinedPagesContainer = iri('UserDefinedPages.Container');
  export const OverlayImageContainer = iri('OverlayImage.Container');
  export const LinkContainer = iri('Link.Container');

  /**
   * When creating overlay image, we're passing source images as params in ldp container call,
   * these are source image, order (int) and opacity (0.0 to 1.0).
   * This is mainly done to preserve order of images and do not use rdf lists
   * {@see LdpOverlayImageService}
   * @type {Rdf.Iri}
     */
  export const OverlayImageSource = iri('Overlay_Image_Source');
  export const OverlayOrder = iri('Overlay_Order');
  export const OverlayOpacity = iri('Overlay_Opacity');

  export const FieldInstance = iri('FieldInstance');
}

export default rso;
