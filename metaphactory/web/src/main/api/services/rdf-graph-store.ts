/*
 * Copyright (C) 2015-2017, metaphacts GmbH
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

import * as request from 'superagent';
import * as Kefir from 'kefir';
import * as fileSaver from 'file-saver';

import { Rdf, turtle } from 'platform/api/rdf';
import { SparqlUtil } from 'platform/api/sparql';

export const GRAPH_STORE_SERVICEURL = '/rdf-graph-store';

class GraphStoreService {
    public createGraph(targetGraph: Rdf.Iri, graphData: Rdf.Graph): Kefir.Property<Rdf.Iri> {
        return turtle.serialize.serializeGraph(graphData).flatMap(
            (turtle: string) => this.createGraphRequest(targetGraph, turtle)
        ).map(location => Rdf.iri(<string>location)).toProperty();
    }

    private createGraphRequest(targetGraph: Rdf.Iri, turtleString: string): Kefir.Property<string> {
      const req = request
          .post(GRAPH_STORE_SERVICEURL)
          .query({ uri: targetGraph.value})
          .send(turtleString)
          .type('text/turtle');

      return Kefir.fromNodeCallback(
        (cb) => req.end((err, res) => cb(err, res ? res.header['location'] : null))
      ).toProperty();
    }

    public updateGraph(targetGraph: Rdf.Iri, graphData: Rdf.Graph): Kefir.Property<Rdf.Iri> {
        return turtle.serialize.serializeGraph(graphData).flatMap(
            (turtle: string) => this.createGraphRequest(targetGraph, turtle)
        ).map(location => Rdf.iri(<string>location)).toProperty();
    }

    public updateGraphRequest(
        targetGraph: Rdf.Iri, turtleString: string
    ): Kefir.Property<string> {
      const req = request
          .put(GRAPH_STORE_SERVICEURL)
          .query({ uri: targetGraph.value})
          .send(turtleString)
          .type('text/turtle');

      return Kefir.fromNodeCallback(
        (cb) => req.end((err, res) => cb(err, res ? res.header['location'] : null))
      ).toProperty();
    }

    public createGraphFromFile(
        targetGraph: Rdf.Iri,
        keepSourceGraphs: boolean,
        file: File, contentType: string,
        progressCB: (percent: number) => void
    ): Kefir.Property<boolean> {

        const req = request.post(GRAPH_STORE_SERVICEURL)
            .query({ graph: targetGraph.value, keepSourceGraphs: keepSourceGraphs })
            .type(contentType)
            .send(file)
            .on('progress',
            (e) => progressCB(<number>e.percent)
            );

        return Kefir.fromNodeCallback(
            (cb) => req.end((err, res: request.Response) => {
                cb(this.errorToString(err), res.ok ? true : null);
            })
        ).toProperty();
    }

  public updateGraphFromFile(
      targetGraph: Rdf.Iri, file: File, contentType: string, progressCB: (percent: number) => void
    ): Kefir.Property<boolean> {

    const req = request.put(GRAPH_STORE_SERVICEURL)
        .query({ graph: targetGraph.value })
        .type(contentType)
        .send(file)
        .on('progress',
          (e) => progressCB(<number>e.percent)
        );

      return Kefir.fromNodeCallback(
        (cb) => req.end((err, res: request.Response) => {
          cb(this.errorToString(err), res.ok ? true : null);
        })
      ).toProperty();
  }

  getGraph(targetGraph: Rdf.Iri): Kefir.Property<Rdf.Graph> {
    const req = request
        .get(GRAPH_STORE_SERVICEURL)
        .query({ graph: targetGraph.value})
        .accept('text/turtle');

    return Kefir.fromNodeCallback<Rdf.Graph>(
      (cb) => req.end((err, res: request.Response) => {
        cb(this.errorToString(err), res.ok ? turtle.deserialize.turtleToGraph(res.text) : null);
      })
    ).toProperty();
  }

  public deleteGraph(targetGraph: Rdf.Iri): Kefir.Property<boolean> {
    const req = request.del(GRAPH_STORE_SERVICEURL)
        .query({ graph: targetGraph.value });

    return Kefir.fromNodeCallback(
      (cb) => req.end((err, res: request.Response) => {
        cb(this.errorToString(err), res.ok ? true : null);
      })
    ).toProperty();
  }

  public downloadGraph(
      targetGraph: Rdf.Iri,
      acceptHeader: SparqlUtil.ResultFormat,
      fileName: string
  ): Kefir.Property<boolean> {
     const req = request
        .get(GRAPH_STORE_SERVICEURL)
        .query({ graph: targetGraph.value})
        .accept(acceptHeader);

    return Kefir.fromNodeCallback(
      (cb) => req.end((err, res: request.Response) => {
        cb(
          this.errorToString(err),
          res.ok ? this.download(res.text, acceptHeader, fileName) : false
          );
      })
    ).toProperty();
  }

  private download(response, header, filename): boolean {
    let blob = new Blob([response], {type: header});
    fileSaver.saveAs(blob, filename);
    return true;
  }

  private errorToString(err: any): string {

    if (err !== null) {
       const status = err['status'];
      if (413 === status) {
         return 'File to large. Please contact your administrator.';
      } else {
         return err.response.text;
      }
   }

   return null;

  }

}

export const RDFGraphStoreService = new GraphStoreService();
