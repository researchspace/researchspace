/**
 * ResearchSpace
 * Copyright (C) 2020, © Trustees of the British Museum
 * Copyright (C) 2015-2019, metaphacts GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as request from 'platform/api/http';
import * as Kefir from 'kefir';
import * as fileSaver from 'file-saver';

import { Rdf, turtle } from 'platform/api/rdf';
import { SparqlUtil } from 'platform/api/sparql';

export const GRAPH_STORE_SERVICEURL = '/rdf-graph-store';

class GraphStoreService {
  public createGraph({
    targetGraph,
    graphData,
    repository,
  }: {
    targetGraph: Rdf.Iri;
    graphData: Rdf.Graph;
    repository?: string;
  }): Kefir.Property<Rdf.Iri> {
    return turtle.serialize
      .serializeGraph(graphData)
      .flatMap((turtleString: string) => this.createGraphRequest({ targetGraph, turtleString, repository }))
      .map((location) => Rdf.iri(<string>location))
      .toProperty();
  }

  private createGraphRequest({
    targetGraph,
    turtleString,
    repository,
  }: {
    targetGraph: Rdf.Iri;
    turtleString: string;
    repository?: string;
  }): Kefir.Property<string> {
    const req = request
      .post(GRAPH_STORE_SERVICEURL)
      .query({ graph: targetGraph.value, repository: repository })
      .send(turtleString)
      .type('text/turtle');

    return Kefir.fromNodeCallback<string>((cb) =>
      req.end((err, res) => cb(err, res ? res.header['location'] : null))
    ).toProperty();
  }

  public updateGraph({
    targetGraph,
    graphData,
    repository,
  }: {
    targetGraph: Rdf.Iri;
    graphData: Rdf.Graph;
    repository?: string;
  }): Kefir.Property<Rdf.Iri> {
    return turtle.serialize
      .serializeGraph(graphData)
      .flatMap((turtleString: string) => this.createGraphRequest({ targetGraph, turtleString, repository }))
      .map((location) => Rdf.iri(<string>location))
      .toProperty();
  }

  public updateGraphRequest({
    targetGraph,
    turtleString,
    repository,
  }: {
    targetGraph: Rdf.Iri;
    turtleString: string;
    repository?: string;
  }): Kefir.Property<string> {
    const req = request
      .put(GRAPH_STORE_SERVICEURL)
      .query({ graph: targetGraph.value, repository: repository })
      .send(turtleString)
      .type('text/turtle');

    return Kefir.fromNodeCallback<string>((cb) =>
      req.end((err, res) => cb(err, res ? res.header['location'] : null))
    ).toProperty();
  }

  public createGraphFromFile({
    targetGraph,
    keepSourceGraphs,
    file,
    contentType,
    onProgress,
    repository,
  }: {
    targetGraph: Rdf.Iri;
    keepSourceGraphs: boolean;
    file: File;
    contentType: string;
    onProgress: (percent: number) => void;
    repository?: string;
  }): Kefir.Property<boolean> {
    const req = request
      .post(GRAPH_STORE_SERVICEURL)
      .query({
        graph: targetGraph.value,
        keepSourceGraphs: keepSourceGraphs,
        repository: repository,
      })
      .type(contentType)
      .send(file)
      .on('progress', (e) => onProgress(<number>e.percent));

    return Kefir.fromNodeCallback<boolean>((cb) =>
      req.end((err, res: request.Response) => {
        cb(err, res.ok ? true : null);
      })
    ).toProperty();
  }

  public updateGraphFromFile({
    targetGraph,
    file,
    contentType,
    onProgress,
    repository,
  }: {
    targetGraph: Rdf.Iri;
    file: File;
    contentType: string;
    onProgress: (percent: number) => void;
    repository?: string;
  }): Kefir.Property<boolean> {
    const req = request
      .put(GRAPH_STORE_SERVICEURL)
      .query({ graph: targetGraph.value, repository: repository })
      .type(contentType)
      .send(file)
      .on('progress', (e) => onProgress(<number>e.percent));

    return Kefir.fromNodeCallback<boolean>((cb) =>
      req.end((err, res: request.Response) => {
        cb(err, res.ok ? true : null);
      })
    ).toProperty();
  }

  getGraph({ targetGraph, repository }: { targetGraph: Rdf.Iri; repository?: string }): Kefir.Property<Rdf.Graph> {
    const req = request
      .get(GRAPH_STORE_SERVICEURL)
      .query({ graph: targetGraph.value, repository: repository })
      .accept('text/turtle');

    return Kefir.fromNodeCallback<Rdf.Graph>((cb) =>
      req.end((err, res: request.Response) => {
        cb(this.errorToString(err), res.ok ? turtle.deserialize.turtleToGraph(res.text) : null);
      })
    ).toProperty();
  }

  public deleteGraph({
    targetGraph,
    repository,
  }: {
    targetGraph: Rdf.Iri;
    repository?: string;
  }): Kefir.Property<boolean> {
    const req = request.del(GRAPH_STORE_SERVICEURL).query({ graph: targetGraph.value, repository: repository });

    return Kefir.fromNodeCallback<boolean>((cb) =>
      req.end((err, res: request.Response) => {
        cb(this.errorToString(err), res.ok ? true : null);
      })
    ).toProperty();
  }

  public downloadGraph({
    targetGraph,
    acceptHeader,
    fileName,
    repository,
  }: {
    targetGraph: Rdf.Iri;
    acceptHeader: SparqlUtil.ResultFormat;
    fileName: string;
    repository?: string;
  }): Kefir.Property<boolean> {
    const req = request
      .get(GRAPH_STORE_SERVICEURL)
      .query({ graph: targetGraph.value, repository: repository })
      .accept(acceptHeader);

    return Kefir.fromNodeCallback<boolean>((cb) =>
      req.end((err, res: request.Response) => {
        cb(this.errorToString(err), res.ok ? this.download(res.text, acceptHeader, fileName) : false);
      })
    ).toProperty();
  }

  private download(response, header, filename): boolean {
    let blob = new Blob([response], { type: header });
    fileSaver.saveAs(blob, filename);
    return true;
  }

  private errorToString(err: any): string {
    if (err !== null) {
      const status = err['status'];
      if (413 === status) {
        return 'File too large. Please contact your administrator.';
      } else {
        return err.response.text;
      }
    }

    return null;
  }
}

export const RDFGraphStoreService = new GraphStoreService();
