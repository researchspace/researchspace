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

import * as Kefir from 'kefir';
import * as maybe from 'data.maybe';
import * as request from 'platform/api/http';

import { Rdf, turtle, vocabularies } from 'platform/api/rdf';
import * as URI from 'urijs';
import * as _ from 'lodash';

const { VocabPlatform } = vocabularies;

interface SerializedResource {
    data: string;
    format: string;
}

export interface LdpServiceContext {
  readonly repository?: string;
  readonly isDefault?: boolean;
}

export class LdpService {
    protected readonly BASE_CONTAINER: string;
    protected readonly context: LdpServiceContext;

    constructor(container: string, context?: LdpServiceContext) {
      if (!context || context.isDefault) {
        this.context = {repository: 'assets'};
      } else {
        this.context = context;
      }

      if (typeof container !== 'string') {
        throw new Error('Container IRI cannot be null or undefined');
      }
      this.BASE_CONTAINER = container;
    }

    protected getServiceUrl(urlSuffix = '', queryParams: {[param: string]: string | string[]} = {}) {
      const endpoint = `/container${urlSuffix}`;
      const urlQuery = URI.buildQuery(_.assign({repository: this.context.repository}, queryParams));
      return urlQuery ? `${endpoint}?${urlQuery}` : endpoint;
    }

    /**
    * TODO move to different place
    * @param  {Rdf.Iri}      setIri
    * @param  {Rdf.Iri}      visibilityEnum
    * @return {Kefir.Stream}
    */
    public static setVisibility(
      setIri: Rdf.Iri, visibilityEnum: Rdf.Iri, groups: Rdf.Iri[]
    ): Kefir.Property<{}> {
      const resource = Rdf.graph(
        [
          Rdf.triple(
            Rdf.iri(''), VocabPlatform.visibilityItem, setIri
          ),
          Rdf.triple(
            setIri, VocabPlatform.visibility, visibilityEnum
          ),
          ..._.map(groups, group => Rdf.triple(setIri, VocabPlatform.visibleToGroups, group)),
        ]
      );

      return new LdpService(
        VocabPlatform.VisibilityContainer.value
      ).addResource(
        resource, maybe.Nothing<string>()
      );
    }

    public getContainerIRI = (): Rdf.Iri => {
      return Rdf.iri(this.BASE_CONTAINER);
    }

    public getContainer(): Kefir.Property<Rdf.Graph> {
      return this.fetchResource(
        Rdf.iri(this.BASE_CONTAINER)
      );
    }

    public get(resourceIri: Rdf.Iri): Kefir.Property<Rdf.Graph> {
      return this.fetchResource(resourceIri);
    }

    public update(resourceIri: Rdf.Iri, resource: Rdf.Graph): Kefir.Property<Rdf.Iri> {
      return turtle.serialize.serializeGraph(resource).flatMap(
        turtle => this.sendUpdateResourceRequest(resourceIri, {data: turtle, format: 'text/turtle'})
      ).toProperty();
    }

    public options(resourceIri: Rdf.Iri): Kefir.Property<{}> {
        const req = request.options(this.getServiceUrl()).query({ uri: resourceIri.value });
        return Kefir.fromNodeCallback(
          (cb) => req.end(
            (err, res) => cb(err != null ? err.status : null, res.ok ? res.text : null)
          )
        ).toProperty();
    }

    public deleteResource(resourceIri: Rdf.Iri) {
      const req = request
          .del(this.getServiceUrl())
          .query({ uri: resourceIri.value });
      return Kefir.fromNodeCallback(
        (cb) => req.end((err, res) => cb(err, res ? res.text : null))
      ).toProperty();
    }

    public addResource = (
      resource: Rdf.Graph, name = maybe.Nothing<string>()
    ): Kefir.Property<Rdf.Iri> => {
      return turtle.serialize.serializeGraph(resource).flatMap(
        turtle => this.createResourceRequest(
          this.getContainerIRI(),
          {data: turtle, format: 'text/turtle'},
          name
        )
      ).map(location => Rdf.iri(location)).toProperty();
    }

    renameResource(resourceIri: Rdf.Iri, newName: string): Kefir.Property<void> {
      const req = request
        .put(this.getServiceUrl('/rename'))
        .query({uri: resourceIri.value, newName});
      return Kefir.stream<void>(emitter => {
        req.end((err, res) => {
          if (err) {
            emitter.error(err);
          } else {
            emitter.emit(undefined);
          }
          emitter.end();
        });
        return () => req.abort();
      }).toProperty();
    }

   /**
    * Returns created resource URI.
    */
    public createResourceRequest = (
      containerIri: Rdf.Iri, resource: SerializedResource, name = maybe.Nothing<string>()
    ): Kefir.Property<string> => {
      let req = request
          .post(this.getServiceUrl())
          .query({ uri: containerIri.value})
          .send(resource.data)
          .type(resource.format);
      req = name.map(
        slug => req.set('Slug', slug)
      ).getOrElse(req);
      return Kefir.fromNodeCallback<string>(
        (cb) => req.end((err, res) => cb(err, res ? res.header['location'] : null))
      ).toProperty();
    }

  /**
   * Copy resource into same or specified container and returns new resource URI
   */
    public copyResource(
      resource: Rdf.Iri, targetContainer: Data.Maybe<Rdf.Iri>, name = maybe.Nothing<string>()
    ): Kefir.Property<string> {
      let req = request
        .get(this.getServiceUrl('/copyResource'));
      req = targetContainer.map(target =>
        req.query({source: resource.value, target: target.value})
      ).getOrElse(
        req.query({source: resource.value})
      );
      req = name.map(slug => req.set('Slug', slug)).getOrElse(req);
      return Kefir.fromNodeCallback<string>(cb =>
        req.end((err, res) => cb(err, res ? res.header['location'] : null))
      ).toProperty();
    }

    public sendUpdateResourceRequest(
      resourceUrl: Rdf.Iri, resource: SerializedResource
    ): Kefir.Property<Rdf.Iri> {
      const req = request
          .put(this.getServiceUrl())
          .query({uri: resourceUrl.value})
          .send(resource.data)
          .type(resource.format);
      return Kefir.fromNodeCallback<Rdf.Iri>(
        (cb) => req.end((err, res) => {
          cb(err, res ? Rdf.iri(res.header['location']) : null);
        })
      ).toProperty();
    }

    protected fetchResource(iri: Rdf.Iri): Kefir.Property<Rdf.Graph> {
      return this.getResourceTriples(iri.value, 'text/turtle');
    }


    protected getResourceTriples(resourceUrl: string, format: string): Kefir.Property<Rdf.Graph> {
      return this.getResourceRequest(resourceUrl, format).flatMap(
        res => {
          return turtle.deserialize.turtleToGraph(res);
        }
      ).toProperty();
    }

    public getResourceRequest(resourceUrl: string, format: string): Kefir.Property<string> {
        const req = request
            .get(this.getServiceUrl())
            .query({ uri: resourceUrl})
            .accept(format);
        return Kefir.fromNodeCallback<request.Response>(req.end.bind(req)).toProperty().map(
            res => res.text
        );
    }

    public getExportURL(iris: string[]): string {
      return this.getServiceUrl('/exportResource', {iris: iris});
    }

    public getImportURL(): string {
      return this.getServiceUrl('/importResource');
    }

    public importGetTextFromURL(url: string): Kefir.Property<string> {
      const req = request.get(url);
      return Kefir.fromNodeCallback<string>(
        (cb) => req.end((err, res) => {
          cb(err, res && res.ok ? res.text : null);
        })
      ).toProperty();
    }

    public importFromText(
      text: string, containerIRI?: string, force?: boolean
    ): Kefir.Property<request.Response> {
      let req = request
        .post(this.getImportURL())
        .send(new File([text], 'import.ttl'));
      if (force) {
        req = req.query({force});
      }
      if (containerIRI) {
        req = req.query({containerIRI});
      }
      return Kefir.fromNodeCallback<request.Response>(
        (cb) => req.end((err, res) => {
          cb(err, res);
        })
      ).toProperty();
    }

    public importFromDelayedId(delayedId: string, containerIRI: string): Kefir.Property<request.Response> {
      const req = request
        .post(this.getImportURL())
        // .type('form')
        .query({force: true, delayedId, containerIRI});
      return Kefir.fromNodeCallback<request.Response>(
        (cb) => req.end((err, res) => {
          cb(err, res);
        })
      ).toProperty();
    }
}

export function ldpc(baseUrl: string) {
  return new LdpService(baseUrl);
}

export function slugFromName(name: String) {
  return name.toLowerCase().trim().replace(/[^a-zA-Z0-9~_-]+/g, '-');
}
