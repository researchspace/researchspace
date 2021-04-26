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

import * as _ from 'lodash';
import * as Kefir from 'kefir';
import * as maybe from 'data.maybe';
import * as SparqlJs from 'sparqljs';

import { SparqlClient, SparqlUtil, PatternBinder, cloneQuery } from 'platform/api/sparql';
import { Rdf } from 'platform/api/rdf';
import { WrappingError } from 'platform/api/async';

export interface ImageSubarea {
  x: number;
  y: number;
  width: number;
  height: number;
}

// export interface BaseImageOrRegionInfo {
//   iri: Rdf.Iri;
//   imageId: string;
//   isRegion: boolean;
//   boundingBox?: ImageSubarea;
//   viewport?: ImageSubarea;
//   svgContent?: { __html: string };
//   imageIRI: Rdf.Iri;
// }

// type IdBasedImageOrRegionInfo = {imageId: string} & BaseImageOrRegionInfo;
// type ManifestBasedImageOrRegionInfo = {imageApiManifestUrl: string}

// export type ImageOrRegionInfo = IdBasedImageOrRegionInfo | ManifestBasedImageOrRegionInfo;


interface BaseImageOrRegionInfo {
  iri: Rdf.Iri;
  isRegion: boolean;
  boundingBox?: ImageSubarea;
  viewport?: ImageSubarea;
  svgContent?: { __html: string };
  imageIRI: Rdf.Iri;
}
type IdBasedImageOrRegionInfo = {imageId: string} & BaseImageOrRegionInfo;
type ManifestBasedImageOrRegionInfo = {imageApiManifestUrl: string} & BaseImageOrRegionInfo;

export type ImageOrRegionInfo = IdBasedImageOrRegionInfo | ManifestBasedImageOrRegionInfo;

export type ExplicitRegion = {
  bbox?: string
  svg?: string
  viewport?: string
};

const IMAGE_REGION_INFO_QUERY = SparqlUtil.Sparql`
  prefix rso: <http://www.researchspace.org/ontology/>
  prefix crmdig: <http://www.ics.forth.gr/isl/CRMdig/>

  select ?type ?imageID ?area ?bbox ?viewport ?svg ?imageIRI {
    OPTIONAL {
      ?__iri__ a rso:EX_Digital_Image .
      BIND("image" AS ?type)
      BIND(?__iri__ as ?imageIRI)
    }
    OPTIONAL {
      ?__iri__ a rso:EX_Digital_Image_Region;
            rdf:value ?svg.
      ?__iri__ crmdig:L49_is_primary_area_of ?imageIRI .
      BIND("region" AS ?type)
      OPTIONAL { ?__iri__ rso:boundingBox ?bbox }
      OPTIONAL { ?__iri__ rso:viewport ?viewport }
    }
    FILTER(?__imageIdPattern__)
  }
` as SparqlJs.SelectQuery;

const INLINE_REGION_INFO_QUERY = SparqlUtil.Sparql`
select ?type ?imageID ?area ?bbox ?viewport ?svg ?imageIRI {
  BIND(?__iri__ as ?imageIRI) .
  BIND("region" AS ?type)
  FILTER(?__imageIdPattern__)
}
` as SparqlJs.SelectQuery;

const INLINE_IMAGE_INFO_QUERY_MANIFEST = SparqlUtil.Sparql`
select ?type ?manifestUrl ?area ?bbox ?viewport ?svg ?imageIRI {
  BIND(?__iri__ as ?imageIRI) .
  BIND("image" AS ?type)
  FILTER(?__imageApiManifestPattern__)
}
` as SparqlJs.SelectQuery;


export function queryIIIFImageOrRegion(
  imageOrRegion: Rdf.Iri,
  imageIdPattern: string,
  repositories: Array<string>,
  region?: ExplicitRegion
): Kefir.Property<ImageOrRegionInfo> {
  return searchRepositoriesForImage(imageOrRegion, imageIdPattern, repositories, region)
    .flatMap((bindings) => {
      const binding = bindings[0];
      const { type, imageIRI, imageID } = binding;
      if (!type || !imageIRI.isIri()) {
        return Kefir.constantError<any>(`Image or region ${imageOrRegion} not found.`);
      } else if (!imageID || imageID.value.indexOf('/') >= 0) {
        return Kefir.constantError<any>(
          `Invalid image ID '${imageID.value}' ` + `generated from ${imageIRI} using pattern: ${imageIdPattern}`
        );
      }

      if (type.value === 'image') {
        return Kefir.constant<ImageOrRegionInfo>({
          iri: imageOrRegion,
          imageId: imageID.value,
          isRegion: false,
          imageIRI: imageIRI,
        });
      } else if (type.value === 'region') {
        const viewport = maybe.fromNullable(binding['viewport']).chain((b) => parseImageSubarea(b.value));
        const bbox = maybe.fromNullable(binding['bbox']).chain((b) => parseImageSubarea(b.value));
        const svg = maybe.fromNullable(binding['svg']).map((b) => ({ __html: b.value }));
        return Kefir.constant<ImageOrRegionInfo>({
          iri: imageOrRegion,
          imageId: imageID.value,
          isRegion: true,
          viewport: viewport.getOrElse(undefined),
          boundingBox: bbox.getOrElse(undefined),
          svgContent: svg.getOrElse(undefined),
          imageIRI: imageIRI,
        });
      }
    })
    .toProperty();
}
export function queryIIIFImageOrRegionManifestBased(
  imageOrRegion: Rdf.Iri,
  manifestPattern: string,
  repositories: Array<string>,
  region?: ExplicitRegion
): Kefir.Property<ManifestBasedImageOrRegionInfo> {
  console.log("MY: QUERY IIIF IMAGE OR REGION")
  return searchRepositoriesForImageManifestBased(imageOrRegion, manifestPattern, repositories, region)
    .flatMap((bindings) => {
      const binding = bindings[0];
      const { type, imageIRI, manifestUrl } = binding;
      console.log("MY: queryIIIFImageOrRegionManifestBased 1 ",binding)
      if (!type || !imageIRI.isIri() || !manifestUrl.isIri()) {
        return Kefir.constantError<any>(`Image, region or manifest for ${imageOrRegion} not found.`);
      } else if (!manifestUrl) {
        return Kefir.constantError<any>(
          `Invalid image ID '${manifestUrl.value}' ` + `generated from ${imageIRI} using pattern: ${manifestPattern}`
        );
      }

      if (type.value === 'image') {
        return Kefir.constant<ImageOrRegionInfo>({
          iri: imageOrRegion,
          imageApiManifestUrl: manifestUrl.value,
          isRegion: false,
          imageIRI: imageIRI,
        });
      } else if (type.value === 'region') {
        const viewport = maybe.fromNullable(binding['viewport']).chain((b) => parseImageSubarea(b.value));
        const bbox = maybe.fromNullable(binding['bbox']).chain((b) => parseImageSubarea(b.value));
        const svg = maybe.fromNullable(binding['svg']).map((b) => ({ __html: b.value }));
        console.log("MY queryIIIFImageOrRegionManifestBased 2",{
          iri: imageOrRegion,
          imageApiManifestUrl: manifestUrl.value,
          isRegion: true,
          viewport: viewport.getOrElse(undefined),
          boundingBox: bbox.getOrElse(undefined),
          svgContent: svg.getOrElse(undefined),
          imageIRI: imageIRI,
        })
        return Kefir.constant<ImageOrRegionInfo>({
          iri: imageOrRegion,
          imageApiManifestUrl: manifestUrl.value,
          isRegion: true,
          viewport: viewport.getOrElse(undefined),
          boundingBox: bbox.getOrElse(undefined),
          svgContent: svg.getOrElse(undefined),
          imageIRI: imageIRI,
        });
      }
    })
    .toProperty();
}

function searchRepositoriesForImage(
  imageOrRegion: Rdf.Iri, imageIdPattern: string, repositories: Array<string>, region?: ExplicitRegion
) {
  return Kefir.combine(
    repositories.map((repository) => getImageBindings(imageOrRegion, imageIdPattern, repository, region))
  ).flatMap((images) => {
    const imageBindings = _.filter(images, (bindigs) => !SparqlUtil.isSelectResultEmpty(bindigs));
    if (_.isEmpty(imageBindings)) {
      return Kefir.constantError<any>(`Image or region ${imageOrRegion} not found.`);
    } else if (imageBindings.length > 1) {
      return Kefir.constantError<any>(`Multiple images and/or regions ${imageOrRegion} found.`);
    } else {
      return Kefir.constant(imageBindings[0].results.bindings);
    }
  });
}

function searchRepositoriesForImageManifestBased(
  imageOrRegion: Rdf.Iri, manifestPattern: string, repositories: Array<string>, region?: ExplicitRegion
) {
  return Kefir.combine(
    repositories.map((repository) => getImageBindingsManifestBased(imageOrRegion, manifestPattern, repository, region))
  ).flatMap((images) => {
    const imageBindings = _.filter(images, (bindings) => !SparqlUtil.isSelectResultEmpty(bindings));
    console.log("MY searchRepositoriesForImageManifestBased",imageBindings[0].results.bindings);
    if (_.isEmpty(imageBindings)) {
      return Kefir.constantError<any>(`Image or region ${imageOrRegion} not found.`);
    } else if (imageBindings.length > 1) {
      return Kefir.constantError<any>(`Multiple images and/or regions ${imageOrRegion} found.`);
    } else {
      return Kefir.constant(imageBindings[0].results.bindings);
    }
  });
}

function getImageBindings(
  imageOrRegion: Rdf.Iri,
  imageIdPattern: string,
  repository: string,
  region?: ExplicitRegion
): Kefir.Property<SparqlClient.SparqlSelectResult> {
  let query: SparqlJs.SelectQuery;
  if (region) {
    query =
      SparqlClient.prepareParsedQuery(
        [
          {
            'bbox': Rdf.literal(region.bbox),
            'viewport': Rdf.literal(region.viewport),
            'svg': Rdf.literal(region.svg),
          },
        ]
      )(
        cloneQuery(INLINE_REGION_INFO_QUERY)
      );
  } else {
    query = cloneQuery(IMAGE_REGION_INFO_QUERY);
  }
  let imageIdPatterns: SparqlJs.Pattern[];
  try {
    imageIdPatterns = SparqlUtil.parsePatterns(imageIdPattern, query.prefixes);
  } catch (err) {
    return Kefir.constantError<any>(new WrappingError(`Failed to parse image ID patterns '${imageIdPattern}':`, err));
  }

  new PatternBinder('__imageIdPattern__', imageIdPatterns).sparqlQuery(query);
  const parametrizedQuery = SparqlClient.setBindings(query, { __iri__: imageOrRegion });

  return SparqlClient.select(parametrizedQuery, { context: { repository: repository } });
}

function getImageBindingsManifestBased(
  imageOrRegion: Rdf.Iri,
  manifestPattern: string,
  repository: string,
  region?: ExplicitRegion
): Kefir.Property<SparqlClient.SparqlSelectResult> {
  let query: SparqlJs.SelectQuery;
  if (region) {
    query =
      SparqlClient.prepareParsedQuery(
        [
          {
            'bbox': Rdf.literal(region.bbox),
            'viewport': Rdf.literal(region.viewport),
            'svg': Rdf.literal(region.svg),
          },
        ]
      )(
        cloneQuery(INLINE_IMAGE_INFO_QUERY_MANIFEST)
      );
  } else {
    query = cloneQuery(INLINE_IMAGE_INFO_QUERY_MANIFEST);
  }
  let manifestPatterns: SparqlJs.Pattern[];
  try {
    console.log("MY: query prefixes ",query.prefixes);
    manifestPatterns = SparqlUtil.parsePatterns(manifestPattern, query.prefixes);
    console.log("MY: Manifestpatterns> ",manifestPattern)
  } catch (err) {
    return Kefir.constantError<any>(new WrappingError(`Failed to parse image ID patterns '${manifestPattern}':`, err));
  }
  new PatternBinder('__imageApiManifestPattern__', manifestPatterns).sparqlQuery(query);
  const parametrizedQuery = SparqlClient.setBindings(query, { __iri__: imageOrRegion});
  console.log("MY: parametrizedQuery ",parametrizedQuery)

  return SparqlClient.select(parametrizedQuery, { context: { repository: repository } });
}

export function parseImageSubarea(value: string): Data.Maybe<ImageSubarea> {
  if (!value) {
    return maybe.Nothing<ImageSubarea>();
  }
  const match = /^xywh=([^,]+),([^,]+),([^,]+),([^,]+)$/.exec(value);
  if (!match) {
    return maybe.Nothing<ImageSubarea>();
  }
  return maybe.Just({
    x: parseFloat(match[1]),
    y: parseFloat(match[2]),
    width: parseFloat(match[3]),
    height: parseFloat(match[4]),
  });
}
